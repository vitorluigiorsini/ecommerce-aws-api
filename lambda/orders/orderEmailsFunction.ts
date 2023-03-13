import { Context, SNSMessage, SQSEvent } from 'aws-lambda';
import { AWSError, SES } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import * as AWSXRay from 'aws-xray-sdk';
import { Envelope, OrderEvent } from '/opt/nodejs/orderEventsLayer';

AWSXRay.captureAWS(require('aws-sdk'));

const sesClient = new SES();

export async function handler(
  event: SQSEvent,
  context: Context
): Promise<void> {
  const promises: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] =
    [];
  event.Records.forEach((record) => {
    const body = JSON.parse(record.body) as SNSMessage;
    promises.push(sendOrderEmail(body));
  });

  await Promise.all(promises);

  return;
}

function sendOrderEmail(body: SNSMessage) {
  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;

  return sesClient
    .sendEmail({
      Destination: {
        ToAddresses: [event.email],
      },
      Message: {
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: `Recebemos seu pedido de número ${event.orderId}, no valor de R$ ${event.billing.totalPrice}`,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'Recebemos seu pedido!',
        },
      },
      Source: 'vitorluigiorsini@gmail.com',
      ReplyToAddresses: ['vitorluigiorsini@gmail.com'],
    })
    .promise();
}
