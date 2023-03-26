import { Context, S3Event, S3EventRecord } from 'aws-lambda'
import { ApiGatewayManagementApi, DynamoDB, EventBridge, S3 } from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import {
  InvoiceFile,
  InvoiceRepository
} from '/opt/nodejs/invoiceRepositoryLayer'
import {
  InvoiceTransactionRepository,
  InvoiceTransactionStatus
} from '/opt/nodejs/invoiceTransactionLayer'
import { InvoiceWSService } from '/opt/nodejs/invoiceWSConnectionLayer'

AWSXRay.captureAWS(require('aws-sdk'))

const invoicesDdb = process.env.INVOICE_DDB!
const invoicesWSApiEndpoint = process.env.INVOICE_WSAPI_ENDPOINT!.substring(6)
const auditBusName = process.env.AUDIT_BUS_NAME!

const s3Client = new S3()
const ddbClient = new DynamoDB.DocumentClient()
const apigwManagementApi = new ApiGatewayManagementApi({
  endpoint: invoicesWSApiEndpoint
})
const eventBridgeClient = new EventBridge()

const invoiceTransactionRepository = new InvoiceTransactionRepository(
  ddbClient,
  invoicesDdb
)
const invoiceWSService = new InvoiceWSService(apigwManagementApi)
const invoiceRepository = new InvoiceRepository(ddbClient, invoicesDdb)

export async function handler(event: S3Event, context: Context): Promise<void> {
  const promises: Promise<void>[] = []
  // TODO - to be removed
  console.log(event)

  event.Records.forEach((record) => {
    promises.push(processRecord(record))
  })

  await Promise.all(promises)
}

async function processRecord(record: S3EventRecord) {
  const key = record.s3.object.key

  try {
    const invoiceTransaction =
      await invoiceTransactionRepository.getInvoiceTransaction(key)

    if (
      invoiceTransaction.transactionStatus ===
      InvoiceTransactionStatus.GENERATED
    ) {
      await Promise.all([
        invoiceWSService.sendInvoiceStatus(
          key,
          invoiceTransaction.connectionId,
          InvoiceTransactionStatus.RECEIVED
        ),
        invoiceTransactionRepository.updateInvoiceTransaction(
          key,
          InvoiceTransactionStatus.RECEIVED
        )
      ])
    } else {
      await invoiceWSService.sendInvoiceStatus(
        key,
        invoiceTransaction.connectionId,
        invoiceTransaction.transactionStatus
      )
      console.error(`Non valid transaction status`)
      return
    }

    const object = await s3Client
      .getObject({
        Key: key,
        Bucket: record.s3.bucket.name
      })
      .promise()

    const invoice = JSON.parse(object.Body!.toString('utf-8')) as InvoiceFile
    console.log(invoice)

    if (invoice.invoiceNumber.length >= 5) {
      const createInvoicePromise = invoiceRepository.create({
        pk: `#invoice_${invoice.customerName}`,
        sk: invoice.invoiceNumber,
        ttl: 0,
        totalValue: invoice.totalValue,
        productId: invoice.productId,
        quantity: invoice.quantity,
        transactionId: key,
        createdAt: Date.now()
      })

      const deleteObjectPromise = s3Client
        .deleteObject({
          Key: key,
          Bucket: record.s3.bucket.name
        })
        .promise()

      const updateInvoicePromise =
        invoiceTransactionRepository.updateInvoiceTransaction(
          key,
          InvoiceTransactionStatus.PROCESSED
        )

      const sendStatusPromise = invoiceWSService.sendInvoiceStatus(
        key,
        invoiceTransaction.connectionId,
        InvoiceTransactionStatus.PROCESSED
      )

      await Promise.all([
        createInvoicePromise,
        deleteObjectPromise,
        updateInvoicePromise,
        sendStatusPromise
      ])
    } else {
      console.error('Non valid invoice number')

      const putEventPromise = eventBridgeClient
        .putEvents({
          Entries: [
            {
              Source: 'app.invoice',
              EventBusName: auditBusName,
              DetailType: 'invoice',
              Time: new Date(),
              Detail: JSON.stringify({
                errorDetail: 'FAIL_NO_INVOICE_NUMBER',
                info: {
                  invoiceKey: key,
                  customerName: invoice.customerName
                }
              })
            }
          ]
        })
        .promise()

      const sendStatusPromise = invoiceWSService.sendInvoiceStatus(
        key,
        invoiceTransaction.connectionId,
        InvoiceTransactionStatus.NON_VALID_INVOICE_NUMBER
      )

      const updateInvoicePromise =
        invoiceTransactionRepository.updateInvoiceTransaction(
          key,
          InvoiceTransactionStatus.NON_VALID_INVOICE_NUMBER
        )
      await Promise.all([
        sendStatusPromise,
        updateInvoicePromise,
        putEventPromise
      ])
    }
    await invoiceWSService.disconnectClient(invoiceTransaction.connectionId)
  } catch (error) {
    console.log((<Error>error).message)
  }
}
