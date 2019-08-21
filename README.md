# aws-experiments-load-apigateway-lambda-documentdb

Load simulation of an API built with Amazon API Gateway, AWS Lambda, Amazon DocumentDB and AWS CDK.

## Description

This experiment simulates API calls to an API built with AWS CDK and the following services:

- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon DocumentDB](https://aws.amazon.com/documentdb/)

As the lambda require to be set into a VPC to connect the DocumentDB database, we will face more important cold start. Therefore, this experiment also leverage the serverless plugin [warmup](https://github.com/FidelLimited/serverless-plugin-warmup). This is to wait for GA of the new [AWS Lambda architecture that will share ENIs](https://youtu.be/QdzV04T_kec?t=2393) and become much faster.

## What we build

TODO: Insert diagram

## Pre requisites

For this experiment you will need the following:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- An AWS account. If you don’t have an AWS account, you can create a free account [here](https://portal.aws.amazon.com/billing/signup/iam).
- Node.js (>= 8.10). To install Node.js visit the [node.js](https://nodejs.org/en/) website. You can also a node version manager: [nvm](https://github.com/nvm-sh/nvm)
- [AWS CDK toolkit](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)

If this is the first time you deploy a CDK application in an environment you need to bootstrap it. Please take a look at the bootstrap section of the [CDK workshop](https://cdkworkshop.com/20-typescript/20-create-project/500-deploy.html).

- [artillery](https://artillery.io/): `$> npm install -g artillery`

## Deployment

### Create Secret Manager secrets for the database

Execute the following command in your Terminal

```bash
$> aws secretsmanager create-secret --name AwsExperimentsLoadApigwLambdaDocumentdb/docdbsecrets --secret-string '{"masterUserPassword": "XXX-XXX-XXX-XXXXXXXXXXXX","masterUsername": "masteruser"}'
```

Retrieve the arn for the displayed result, you will use it when you deploy the CDK application.

### Install dependencies

### Deploy the application

```bash
$> cdk deploy --context docdbsecret_arn=arn:aws:secretsmanager:us-east-1:XXXXXXXXXXXX:secret:AwsExperimentsLoadApigwLambdaDocumentdb/docdbsecrets-XXXXXX -c docdbsecret_username=masteruser -c docdbsecret_password=XXX-XXX-XXX-XXX
```

Or you can specify the same context variable and value in the `cdk.json` file, use the following code:

```json
{
  "app": "npx ts-node bin/aws-experiments-load-apigw-lambda-documentdb.ts",
  "context": {
    "docdbsecret_arn": "arn:aws:secretsmanager:us-east-1:XXXXXXXXXXXX:secret:AwsExperimentsLoadApigwLambdaDocumentdb/docdbsecrets-XXXXXX",
    "docdbsecret_username": "masteruser",
    "docdbsecret_password": "XXX-XXX-XXX-XXX"
  }
}
```

## Load the application

```bash
$> artillery run artillery.yml
```

## Results

[X-Ray documentation](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-analytics.html)

## Developing

Since this CDK project is typescript based, sources need to be compiled to JavaScript every time you make a modification to source files. This project is configured with a nice little npm script called `watch` that automatically compile `.js` file every time you make a change

### Start watching for changes

In the home directory, open a new terminal and enter:

```bash
$> npm run watch
```

### Useful commands

- `npm run build`   compile typescript to js
- `npm run watch`   watch for changes and compile
- `cdk deploy`      deploy this stack to your default AWS account/region
- `cdk diff`        compare deployed stack with current state
- `cdk synth`       emits the synthesized CloudFormation template
- `cdk destroy`     destroy the CDK application in your default AWS account/region

## Clean up

Destroy the CDK application:

```bash
$> cdk destroy
```

## TODO

- [X] Setting up X-RAY:
  - [Documentation](https://docs.aws.amazon.com/xray/latest/devguide/xray-services-lambda.html)
  - [CDK for API Gateway](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.StageOptions.html)
  - [CDK for Lambda](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.Function.html)
- [ ] Setting up warm-up:
  - [serverless-plugin-warmup](https://www.npmjs.com/package/serverless-plugin-warmup)
  - [Warming Up your Lambdas: Schedule or Plugin?](https://dev.to/dvddpl/warming-up-your-lambdas-schedule-or-plugin--flo)
- [ ] Check lambda best practices and optimization:
  - [ ] [Documentation](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
  - [ ] [Optimizing AWS Lambda performance with MongoDB Atlas and Node.js](https://www.mongodb.com/blog/post/optimizing-aws-lambda-performance-with-mongodb-atlas-and-nodejs)
  - [ ] [https://dev.to/adnanrahic/solving-invisible-scaling-issues-with-serverless-and-mongodb-4m55](https://dev.to/adnanrahic/solving-invisible-scaling-issues-with-serverless-and-mongodb-4m55)
  - [ ] [How to Use MongoDB Connection Pooling on AWS Lambda](https://scalegrid.io/blog/how-to-use-mongodb-connection-pooling-on-aws-lambda/)
  - [ ] [Best Practices for Developing on AWS Lambda](https://aws.amazon.com/blogs/architecture/best-practices-for-developing-on-aws-lambda/)
- [ ] Measuring results:
  - [I’m afraid you’re thinking about AWS Lambda cold starts all wrong](https://theburningmonk.com/2018/01/im-afraid-youre-thinking-about-aws-lambda-cold-starts-all-wrong/)
  - [aws lambda – compare coldstart time with different languages, memory and code sizes](https://theburningmonk.com/2017/06/aws-lambda-compare-coldstart-time-with-different-languages-memory-and-code-sizes/)
  - [Lambda Cold Starts, A Language Comparison 🕵 ❄️](https://medium.com/@nathan.malishev/lambda-cold-starts-language-comparison-%EF%B8%8F-a4f4b5f16a62)
- [ ] Loading the application:
  - [Artillery](https://artillery.io/docs/script-reference/)
  - [Managing AWS Lambda Function Concurrency](https://aws.amazon.com/blogs/compute/managing-aws-lambda-function-concurrency/)

## Sources and inspiration

This repository is inspired from different sources:

- [Managing AWS Lambda Function Concurrency](https://aws.amazon.com/blogs/compute/managing-aws-lambda-function-concurrency/)
- [Connecting to AWS DocumentDB from a Lambda function](https://blog.webiny.com/connecting-to-aws-documentdb-from-a-lambda-function-2b666c9e4402)
- [Running AWS Lambda-based applications with Amazon DocumentDB](https://aws.amazon.com/blogs/database/running-aws-lambda-based-applications-with-amazon-documentdb/)
- For a dive on CDK, please look at [CDK workshop](https://cdkworkshop.com)
