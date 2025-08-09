import {Stack, StackProps} from 'aws-cdk-lib';
import {LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {AttributeType, Table} from 'aws-cdk-lib/aws-dynamodb';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Subscription, SubscriptionProtocol, Topic} from 'aws-cdk-lib/aws-sns';
import {LambdaSubscription} from 'aws-cdk-lib/aws-sns-subscriptions';
import {Endpoint} from 'aws-sdk';
import {Construct} from 'constructs';
import {BaseFunction} from "./functions";
import {AccountPrincipal, Effect, PolicyStatement, PrincipalBase, ServicePrincipal} from 'aws-cdk-lib/aws-iam';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class RegularExamStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // email to be changed by Sisi
        const email = "pe_kan@posteo.com"

        // table
        const table = new Table(this, "SisiTable2", {
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
        const validDataTopic = new Topic(this, "ValidDataTopic");
        new Subscription(this, "ValidDataSubscription", {
            topic: validDataTopic,
            protocol: SubscriptionProtocol.EMAIL,
            endpoint: email
        });
        // SNS for informing lambda
        const invalidDataTopic = new Topic(this, "InvalidDataTopic");

        // SNS for deletion of item
        const deletionDataTopic = new Topic(this, "DeletionDataTopic");
        new Subscription(this, "DeletionDataSubscription", {
            topic: deletionDataTopic,
            protocol: SubscriptionProtocol.EMAIL,
            endpoint: email
        });
//
        // lambda for validation
        const validationLambda = new BaseFunction(this, "ValidationLambda", {
            environment: {
                VALID_TOPIC_ARN: validDataTopic.topicArn,
                INVALID_TOPIC_ARN: invalidDataTopic.topicArn,
            }
        });
        // grant permittsion to lambda
        validDataTopic.grantPublish(validationLambda);
        invalidDataTopic.grantPublish(validationLambda);

        // labda to delete the item after 24hrs
        const deletionLambda = new BaseFunction(this, "DeletionLambda", {
            environment: {
                TABLE_NAME: table.tableName,
                DELETION_TOPIC_ARN: deletionDataTopic.topicArn,
            }
        });

        // lambda for unvalid JSON -  put in table and crate schedule for deletion

        const invalidDataLambda = new BaseFunction(this, "InvalidDataLambda", {
            environment: {
                TABLE_NAME: table.tableName,
                DELETION_LAMBDA_ARN: deletionLambda.functionArn,
            }
        });
        //
        // // ad policy statement fior klambdy
        // const policyStatement = new PolicyStatement({
        //         effect:  Effect.ALLOW,
        //         resources:["*"],
        //         actions: ['sts:AssumeRole'],
        //         principals: [new ServicePrincipal('scheduler.amazonaws.com')]
        //     });
        //
        //

        invalidDataLambda.addPermission("AllowEventBridgeInvoke",{
            principal: new ServicePrincipal('events.amazonaws.com'),
            action:"lambda:InvokeFunction",
            sourceArn: `arn:aws:events:${this.region}:${this.account}:rule/*`    } );


        invalidDataLambda.addPermission("AllowScheduleInvoke",{
            principal: new ServicePrincipal('scheduler.amazonaws.com'),
            action:"*",
            sourceArn: `arn:aws:scheduler:${this.region}:${this.account}:schedule/default/*`    } );

// get lambda role and add it to environmetn

        const invalidLambdaAssumedRoleRN = invalidDataLambda.role?.roleArn;
        invalidDataLambda.addEnvironment("ROLE_ARN", invalidLambdaAssumedRoleRN!);

        invalidDataTopic.addSubscription(new LambdaSubscription(invalidDataLambda));

        // grant permission to lambda for table
        table.grantFullAccess(invalidDataLambda);


        // grant permission to lambda for table
        table.grantWriteData(deletionLambda);

        // API with resource and  post method
        const sisiApi = new RestApi(this, "SisiApi", {
            restApiName: "SisiApi"
        });
        // resource
        const postResource = sisiApi.root.addResource("order");
        // method post
        postResource.addMethod('POST', new LambdaIntegration(validationLambda,
            {
                proxy: true
            }
        ))

    }
}
