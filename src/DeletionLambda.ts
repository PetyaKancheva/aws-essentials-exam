import { PublishCommand, SNSClient, ThrottledException } from "@aws-sdk/client-sns";
import {APIGatewayProxyEvent, EventBridgeEvent, ScheduledEvent, SNSEvent} from "aws-lambda"

import {DeleteItemCommand, DynamoDBClient, QueryCommand} from "@aws-sdk/client-dynamodb";
const ddb = new DynamoDBClient();
const snsClient = new SNSClient;

export const handler = async (   event: EventBridgeEvent<any, any> ) => {

    console.log("Detail from event:" ,event.detail);

    const tableName= process.env.TABLE_NAME;
    const topic =process.env.DELETION_TOPIC_ARN;
    const indexName = process.env.INDEX_NAME;
    // calculate search time
    const now= new Date();
    const minutes=now.getMinutes();
    const hour = now.getHours();
    const date= now.getDate()  ;

    const deletionTime = `${date} / ${hour} :${minutes}`;
    console.log("deletion time:", deletionTime);

    const command = new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        ExpressionAttributeValues: {
            ':v1': {
                S: deletionTime
            }
        },
        ProjectionExpression:"PK, SK",
        KeyConditionExpression: " deletionTime = :v1",
    });

    // get response
    const response = await ddb.send(command);
    console.log("Query response:" ,response);

    // check if response is empty
    if(response.Count! > 0) {

        // loop to delete each item
        for (let i = 0; i < response.Count!; i++) {

            const pValue = response.Items[i].PK.S;
            const sValue = response.Items[i].SK.S;
                // delete command
            await ddb.send(new DeleteItemCommand({
                TableName: tableName,
                Key: {
                    PK: {
                        S: pValue
                    },
                    SK: {
                        S: sValue
                    },
                },
            }));

        // send email to sisi
        await  snsClient.send(new PublishCommand({
            Subject:`Deletion Notification for ${pValue}`,
            Message: "Deletion message",
            TopicArn: topic,
        }));


        } ; // end of loop
    }; //
    console.log(`Deleted ${response.Count} items`)
    // end of cout >0
    // end of code
    }