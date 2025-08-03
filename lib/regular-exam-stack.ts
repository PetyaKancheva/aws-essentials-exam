
import { Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Endpoint } from 'aws-sdk';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class RegularExamStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  // email to be changed by Sisi
    const email="pe_kan@posteo.com"

    // table 
 const table = new Table(this,"SisiTable",{
      partitionKey: {
        name: "PK",
        type: AttributeType.STRING
      },
      sortKey: {
        name: "SK",
        type: AttributeType.STRING
      }

    });


     // SNS for valid data
      const validDataTopic = new Topic(this,"ValidDataTopic");
       new Subscription(this,"ValidDataSubscription",{
        topic: validDataTopic,
        protocol:  SubscriptionProtocol.EMAIL,
        endpoint: email
      });
    // SNS for informing lambda 
    const invalidDataTopic = new Topic(this,"InvalidDataTopic");
  

        // lambda for validation
    const validationiLambda= new NodejsFunction(this,"ValidationLambda",{
      runtime:Runtime.NODEJS_20_X,
      entry:__dirname +`/../src/ValidationLambda.ts`,
      handler:'handler',
      environment:{
        VALID_TOPIC_ARN:validDataTopic.topicArn,
        INVALID_TOPIC_ARN:invalidDataTopic.topicArn,
      }
    });
    // grant permittsion to lambda
      validDataTopic.grantPublish(validationiLambda);

       invalidDataTopic.grantPublish(validationiLambda);


    // lambda for unvalid JSON - in table and t

const invalidDataLambda= new NodejsFunction(this,"InvalidDataLambda",{
      runtime:Runtime.NODEJS_20_X,
      entry:__dirname +`/../src/InvalidDataLambda.ts`,
      handler:'handler',
      environment:{
      TABLE_NAME:table.tableName,
      }
    });

       invalidDataTopic.addSubscription(new LambdaSubscription(invalidDataLambda));



    // grant permission to lambda for table
     table.grantFullAccess(invalidDataLambda);

        // API with resource and  post method
    const sisiApi=new RestApi(this,"SisiApi",{
      restApiName:"SisiApi"
    });
    // resource
    const postResource= sisiApi.root.addResource("order");
    // method post
    postResource.addMethod('POST', new LambdaIntegration(validationiLambda,
      {
        proxy:true
      }
    ))

  }
}
