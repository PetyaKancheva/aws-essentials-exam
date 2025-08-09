import { PublishCommand, SNSClient, ThrottledException } from "@aws-sdk/client-sns";
import { APIGatewayProxyEvent } from "aws-lambda"

const snsClient = new SNSClient;

export const handler = async (event: APIGatewayProxyEvent) => {

        console.log(JSON.stringify(event));
        const  validDataTopicARN = process.env.VALID_TOPIC_ARN;
        const  invalidDataTopicARN = process.env.INVALID_TOPIC_ARN;
    // value,description,buyer

        const {valid}=JSON.parse(event.body!);

        if (valid) {
             // send notification with object to emial
     
        await snsClient.send(new PublishCommand({
        Subject: `Notification for new order`,
        Message:  JSON.stringify(event.body),
        TopicArn: validDataTopicARN,
         }));

         console.log('Vaild JSON sent')
        }else{
        
        // send notification with object invalidDatalambda + timestamp
        await snsClient.send(new PublishCommand({
        Message:  JSON.stringify(event.body),
        TopicArn: invalidDataTopicARN,
        }));
            console.log('Invalid JSON sent')
        };
         

    return {
        statusCode:200,
        body:
            JSON.stringify(  
                   {   message: `validation lambda`             
                }
            )
        
    }
}