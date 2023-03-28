import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs'
import * as cdk from 'aws-cdk-lib'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as cw from 'aws-cdk-lib/aws-cloudwatch'
import { Construct } from 'constructs'

export class AuditEventBusStack extends cdk.Stack {
  readonly bus: events.EventBus

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.bus = new events.EventBus(this, 'AuditEventBus', {
      eventBusName: 'AuditEventBus'
    })

    this.bus.archive('BusArchive', {
      eventPattern: {
        source: ['app.order']
      },
      archiveName: 'auditEvents',
      retention: cdk.Duration.days(10)
    })

    //source: app.order
    //detailType: order
    //reason: PRODUCT_NOT_FOUND
    const nonValidOrderRule = new events.Rule(this, 'NonValidOrderRule', {
      ruleName: 'NonValidOrderRule',
      description: 'Rule matching non valid order',
      eventBus: this.bus,
      eventPattern: {
        source: ['app.order'],
        detailType: ['order'],
        detail: {
          reason: ['PRODUCT_NOT_FOUND']
        }
      }
    })

    //target
    const ordersErrorsFunction = new lambdaNodeJS.NodejsFunction(
      this,
      'OrdersErrorsFunction',
      {
        functionName: 'OrdersErrorsFunction',
        entry: 'lambda/audit/ordersErrorsFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
      }
    )
    nonValidOrderRule.addTarget(
      new targets.LambdaFunction(ordersErrorsFunction)
    )

    //source: app.invoice
    //detailType: invoice
    //errorDetail: FAIL_NO_INVOICE_NUMBER
    const nonValidInvoiceRule = new events.Rule(this, 'NonValidInvoiceRule', {
      ruleName: 'NonValidInvoiceRule',
      description: 'Rule matching fail no invoice number',
      eventBus: this.bus,
      eventPattern: {
        source: ['app.invoice'],
        detailType: ['invoice'],
        detail: {
          errorDetail: ['FAIL_NO_INVOICE_NUMBER']
        }
      }
    })

    //target
    const invoicesErrorsFunction = new lambdaNodeJS.NodejsFunction(
      this,
      'InvoicesErrorsFunction',
      {
        functionName: 'InvoicesErrorsFunction',
        entry: 'lambda/audit/invoicesErrorsFunction.ts',
        handler: 'handler',
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false
        },
        tracing: lambda.Tracing.ACTIVE,
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
      }
    )
    nonValidInvoiceRule.addTarget(
      new targets.LambdaFunction(invoicesErrorsFunction)
    )

    //source: app.invoice
    //detailType: invoice
    //errorDetail: TIMEOUT
    const timeoutImportInvoiceRule = new events.Rule(
      this,
      'TimeoutImportInvoiceRule',
      {
        ruleName: 'TimeoutImportInvoiceRule',
        description: 'Rule matching timeout import invoice',
        eventBus: this.bus,
        eventPattern: {
          source: ['app.invoice'],
          detailType: ['invoice'],
          detail: {
            errorDetail: ['TIMEOUT']
          }
        }
      }
    )

    //target
    const invoiceImportTimeoutQueue = new sqs.Queue(
      this,
      'InvoiceImportTimeout',
      {
        queueName: 'invoice-import-timeout'
      }
    )
    timeoutImportInvoiceRule.addTarget(
      new targets.SqsQueue(invoiceImportTimeoutQueue)
    )

    //Metric
    const numberOfMessagesMetric =
      invoiceImportTimeoutQueue.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(2),
        statistic: 'Sum'
      })

    //Alarm
    numberOfMessagesMetric.createAlarm(this, 'InvoiceImportTimeoutAlarm', {
      alarmName: 'InvoiceImportTimeout',
      actionsEnabled: false,
      evaluationPeriods: 1,
      threshold: 5,
      comparisonOperator:
        cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    })

    const ageOfMessagesMetric =
      invoiceImportTimeoutQueue.metricApproximateAgeOfOldestMessage({
        period: cdk.Duration.minutes(2),
        statistic: 'Maximum',
        unit: cw.Unit.SECONDS
      })
    ageOfMessagesMetric.createAlarm(this, 'AgeOfMessagesInQueue', {
      alarmName: 'AgeOfMessagesInQueue',
      actionsEnabled: false,
      evaluationPeriods: 1,
      threshold: 60,
      comparisonOperator:
        cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    })
  }
}
