import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class InvoicesAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Invoice Transction Layer
    const invoiceTransactionLayer = new lambda.LayerVersion(
      this,
      'InvoiceTransactionLayer',
      {
        code: lambda.Code.fromAsset(
          'lambda/invoices/layers/invoiceTransactionLayer'
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        layerVersionName: 'InvoiceTransactionLayer',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    new ssm.StringParameter(this, 'InvoiceTransactionLayerVersionArn', {
      parameterName: 'InvoiceTransactionLayerVersionArn',
      stringValue: invoiceTransactionLayer.layerVersionArn,
    });

    // Invoice Layer
    const invoiceRepositoryLayer = new lambda.LayerVersion(
      this,
      'InvoiceRepositoryLayer',
      {
        code: lambda.Code.fromAsset(
          'lambda/invoices/layers/invoiceRepositoryLayer'
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        layerVersionName: 'InvoiceRepositoryLayer',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    new ssm.StringParameter(this, 'InvoiceRepositoryLayerVersionArn', {
      parameterName: 'InvoiceRepositoryLayerVersionArn',
      stringValue: invoiceRepositoryLayer.layerVersionArn,
    });

    // Invoice WebSocket API Layer
    const invoiceWSConnectionLayer = new lambda.LayerVersion(
      this,
      'InvoiceWSConnectionLayer',
      {
        code: lambda.Code.fromAsset(
          'lambda/invoices/layers/invoiceWSConnectionLayer'
        ),
        compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
        layerVersionName: 'InvoiceWSConnectionLayer',
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    new ssm.StringParameter(this, 'InvoiceWSConnectionLayerVersionArn', {
      parameterName: 'InvoiceWSConnectionLayerVersionArn',
      stringValue: invoiceWSConnectionLayer.layerVersionArn,
    });
  }
}
