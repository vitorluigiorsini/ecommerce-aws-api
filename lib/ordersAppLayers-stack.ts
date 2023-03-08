import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class OrdersAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ordersLayer = new lambda.LayerVersion(this, 'OrdersLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      layerVersionName: 'OrderLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrdersLayerVersionArn', {
      parameterName: 'OrdersLayerVersionArn',
      stringValue: ordersLayer.layerVersionArn,
    });

    const ordersApiLayer = new lambda.LayerVersion(this, 'OrdersApiLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/ordersApiLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      layerVersionName: 'OrdersApiLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrdersApiLayerVersionArn', {
      parameterName: 'OrdersApiLayerVersionArn',
      stringValue: ordersApiLayer.layerVersionArn,
    });

    const orderEventsLayer = new lambda.LayerVersion(this, 'OrderEventsLayer', {
      code: lambda.Code.fromAsset('lambda/orders/layers/orderEventsLayer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      layerVersionName: 'OrderEventsLayer',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, 'OrderEventsLayerVersionArn', {
      parameterName: 'OrderEventsLayerVersionArn',
      stringValue: orderEventsLayer.layerVersionArn,
    });

    const orderEventsRepositoryLayer = new lambda.LayerVersion(
      this,
      'OrderEventsRepositoryLayer',
      {
        code: lambda.Code.fromAsset(
          'lambda/orders/layers/orderEventsRepositoryLayer'
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        layerVersionName: 'OrderEventsRepositoryLayer',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    new ssm.StringParameter(this, 'OrderEventsRepositoryLayerVersionArn', {
      parameterName: 'OrderEventsRepositoryLayerVersionArn',
      stringValue: orderEventsRepositoryLayer.layerVersionArn,
    });
  }
}
