import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';
import {
  OrderEventDdb,
  OrderEventRepository,
} from '/opt/nodejs/orderEventsRepositoryLayer';

AWSXRay.captureAWS(require('aws-sdk'));

const eventsDdb = process.env.EVENTS_DDB!;

const ddbClient = new DynamoDB.DocumentClient();
const orderEventsRepository = new OrderEventRepository(ddbClient, eventsDdb);

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const email = event.queryStringParameters!.email!;
  const eventType = event.queryStringParameters!.eventType;

  if (eventType) {
    const orderEvents =
      await orderEventsRepository.getOrderEventsByEmailAndEventType(
        email,
        eventType
      );
    return {
      statusCode: 200,
      body: JSON.stringify(convertOrderEvents(orderEvents)),
    };
  } else {
    const orderEvents = await orderEventsRepository.getOrderEventsByEmail(
      email
    );
    return {
      statusCode: 200,
      body: JSON.stringify(convertOrderEvents(orderEvents)),
    };
  }
}

function convertOrderEvents(orderEvents: OrderEventDdb[]) {
  return orderEvents.map((orderEvent) => {
    return {
      email: orderEvent.email,
      createdAt: orderEvent.createdAt,
      eventType: orderEvent.eventType,
      requestId: orderEvent.requestId,
      orderId: orderEvent.info.orderId,
      productCodes: orderEvent.info.productCodes,
    };
  });
}
