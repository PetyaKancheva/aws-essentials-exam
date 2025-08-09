import {Duration} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {Construct} from "constructs";

interface BaseFunctionProps {
    environment: {
        VALID_TOPIC_ARN?: string,
        INVALID_TOPIC_ARN?: string,
        TABLE_NAME?:string,
        DELETION_TOPIC_ARN?:string,
        DELETION_LAMBDA_ARN?:string

    }
}

export class BaseFunction extends NodejsFunction {

    constructor(scope: Construct, id: string, props: BaseFunctionProps) {
        super(scope, id, {
            ...props,
            handler: "handler",
            timeout: Duration.seconds(5),
            entry: `${__dirname}/../src/${id}.ts`,

        })
    }}