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
import { Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { EventBridgeSchedulerTarget } from "aws-cdk-lib/aws-stepfunctions-tasks";

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

const indexName= "deletion-index" ;
        table.addGlobalSecondaryIndex({
            indexName: indexName,
            partitionKey: {
                name: 'deletionTime', type:  AttributeType.STRING },
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
                INDEX_NAME:indexName,
            }
        });

        // lambda for unvalid JSON -  put in table and crate schedule for deletion

        const invalidDataLambda = new BaseFunction(this, "InvalidDataLambda", {
            environment: {
                TABLE_NAME: table.tableName,
            }
        });


        // grant permission to publish topic Detletion

        deletionDataTopic.grantPublish(deletionLambda);
        //  create rule to check expiration date every 10 min
        const rule = new Rule(this, 'ScheduleItemDeletionRule', {
            schedule: Schedule.cron({minute: '*/2'}),
        });

        rule.addTarget(new LambdaFunction(deletionLambda));

        // create role for the AWS service
        const role = new Role(this, 'EventsRole', {
            assumedBy: new ServicePrincipal('events.amazonaws.com'),
        });
        new EventBridgeSchedulerTarget({
            arn: deletionLambda.functionArn,
            role: role
        });

        invalidDataTopic.addSubscription(new LambdaSubscription(invalidDataLambda));

        // grant permission to lambda for table
        table.grantWriteData(invalidDataLambda);

        // grant permission to lambda for table
        table.grantReadWriteData(deletionLambda);

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
