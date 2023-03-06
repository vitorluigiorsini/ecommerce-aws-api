import * as cdk from 'aws-cdk-lib';
import * as lambdaNodeJS from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cwlogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
}

export class ECommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwlogs.LogGroup(this, 'ECommerceApiLogs');
    const api = new apigateway.RestApi(this, 'ECommerceApi', {
      restApiName: 'ECommerceApi',
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    });

    this.createOrdersService(props, api);

    this.createProductsService(props, api);
  }

  private createOrdersService(
    props: ECommerceApiStackProps,
    api: cdk.aws_apigateway.RestApi
  ) {
    // Integrations
    const ordersIntegration = new apigateway.LambdaIntegration(
      props.ordersHandler
    );

    // Resources
    const ordersResource = api.root.addResource('orders');

    // GET /orders
    // GET /orders?email={email}
    // GET /orders?email={email}&orderId={id}
    ordersResource.addMethod('GET', ordersIntegration);

    // DELETE /orders?email={email}&orderId={id}
    ordersResource.addMethod('DELETE', ordersIntegration);

    // POST /orders
    ordersResource.addMethod('POST', ordersIntegration);
  }

  private createProductsService(
    props: ECommerceApiStackProps,
    api: cdk.aws_apigateway.RestApi
  ) {
    // Integrations
    const productsFetchIntegration = new apigateway.LambdaIntegration(
      props.productsFetchHandler
    );
    const productsAdminIntegration = new apigateway.LambdaIntegration(
      props.productsAdminHandler
    );

    // Resources
    const productsResource = api.root.addResource('products');
    const productIdResource = productsResource.addResource('{id}');

    // GET /products
    productsResource.addMethod('GET', productsFetchIntegration);

    // GET /products/{id}
    productIdResource.addMethod('GET', productsFetchIntegration);

    // POST /products
    productsResource.addMethod('POST', productsAdminIntegration);

    // PUT /products/{id}
    productIdResource.addMethod('PUT', productsAdminIntegration);

    // DELETE /products/{id}
    productIdResource.addMethod('DELETE', productsAdminIntegration);
  }
}
