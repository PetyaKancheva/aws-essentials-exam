import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { CreateScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { PublishCommand, SNSClient, ThrottledException } from "@aws-sdk/client-sns";
import { APIGatewayProxyEvent, SNSEvent, SNSEventRecord } from "aws-lambda"
import { NotificationEvent } from "aws-sdk/clients/ssm";
import { randomUUID } from "crypto";

const snsClient = new SNSClient;
const ddb= new DynamoDBClient;
const schedulerClinet = new  SchedulerClient;

export const handler = async ( event: SNSEvent ) => {

     const tableName = process.env.TABLE_NAME;
     const role= process.env.ROLE_ARN;
     const targetLambdaARN= process.env.DELETION_LAMBDA_ARN;
  
    const record = event.Records;
       
        
   const body = JSON.stringify(record[0].Sns.Message);
    console.log(`Processed message ${body}`);



 // put data in table

    const uuid = randomUUID();
      const now=new Date();

    const timestamp  =now.toISOString();

    console.log("Custom UUID: ", uuid);

    const dynamoDBCommand = new PutItemCommand({
        TableName: tableName,
        Item: {
            PK: {
                S: `ITEM#${uuid}`
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



    const newTimeAfterDay= new Date(now);
// for test in 2 min
//     newTimeAfterDay.setDate(now.getDate()+1);
    newTimeAfterDay.setMinutes(now.getMinutes()+2);

 // schedule event for deletion
    const result =await schedulerClinet.send(new CreateScheduleCommand({

        Name:'delete item',
        ScheduleExpression:`at${newTimeAfterDay.toISOString()}`,
        Target:{
            Arn:targetLambdaARN,
            Input: JSON.stringify(`ITEM#${uuid}`),
            RoleArn:  role,
        },
        FlexibleTimeWindow: {
            Mode:"OFF"
        }

    }));

    console.log(result);
}

    
 