 

import { App } from "aws-cdk-lib";
import { RegularExamStack } from "../lib/regular-exam-stack";
import { Template } from "aws-cdk-lib/assertions";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/regular-exam-stack.ts
test('SQS Queue Created', () => {
  const app = new App();
    
  const stack = new  RegularExamStack(app, 'MyTestStack');
    
  const template = Template.fromStack(stack);
  
    // 
});
