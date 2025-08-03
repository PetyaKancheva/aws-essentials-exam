import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient, ThrottledException } from "@aws-sdk/client-sns";
import { APIGatewayProxyEvent, SNSEvent, SNSEventRecord } from "aws-lambda"
import { NotificationEvent } from "aws-sdk/clients/ssm";
import { randomUUID } from "crypto";

const snsClient = new SNSClient;
const ddb= new DynamoDBClient;

export const handler = async ( event: SNSEvent ) => {

     const tableName = process.env.TABLE_NAME;
  
    const record = event.Records;
       
        
   const body = JSON.stringify(record[0].Sns.Message);
    console.log(`Processed message ${body}`);

   //       const {valid,value,description,buyer}=JSON.parse(message); // not required

 // put data in table
  
 
    const uuid = randomUUID();

    const timestamp  =new Date().toISOString();;

    console.log("Custom UUID: ", uuid);

    const dynamoDBCommand = new PutItemCommand({
        TableName: tableName,
        Item: {
            PK: {
                S: `ORDER#${uuid}`
            },
            SK: {
                S: `METADATA#${uuid}`
            },
            timestamp: {
                S: timestamp
            },
            body: {
               S: body
            },     
             
        },
        ReturnConsumedCapacity: "TOTAL",
    }

    );


 await ddb.send(dynamoDBCommand);

 // schedule event for deletion

 
}

    
 