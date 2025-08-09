import { PublishCommand, SNSClient, ThrottledException } from "@aws-sdk/client-sns";
import {APIGatewayProxyEvent, EventBridgeEvent, ScheduledEvent, SNSEvent} from "aws-lambda"
import {InputType} from "aws-cdk-lib/aws-events";
import {Event} from "aws-cdk-lib/aws-stepfunctions-tasks";

const snsClient = new SNSClient;

export const handler = async (   event: EventBridgeEvent<any, any> ) => {
        // get UUID from event
    // target input
    // const record=  events.detail;
    console.log("Detail from event:" ,event.detail);
    console.log("Detail-type from event:" ,event["detail-type"]);
    console.log("Id from event:" ,event.id);
    // const body = JSON.stringify(record[0].Sns.Message);
    // console.log(`Receive UUID ${body}`);


    // delete item

    // send email to Sisi



}