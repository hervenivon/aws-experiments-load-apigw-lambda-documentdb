# aws-experiments-load-apigateway-lambda-documentdb

This experiment simulates several calls to an API deployed through [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) and the following services:

- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon DocumentDB](https://aws.amazon.com/documentdb/)
- [AWS Secrets manager](https://aws.amazon.com/secrets-manager/)

The API is a url shortener. It stores the given `url` in body as `json` (see below for more details), associates it with a `shortId` and returns a `shortUrl`. If you access this `shortUrl` you will be redirected to the origin url.

Note: As the lambda function requires to be set into a VPC in order to connect to the DocumentDB database, our API will face more important [cold start](https://www.freecodecamp.org/news/lambda-vpc-cold-starts-a-latency-killer-5408323278dd/) until the GA of the new [AWS Lambda architecture that will share ENIs](https://youtu.be/QdzV04T_kec?t=2393) therefore we will implement a warm up phase in our service.

## What we build

[AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) deploys the following architecture:

![Architecture diagram](/resources/architecture.png)

## Pre requisites

For this experiment you will need the following:

- The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- An AWS account. If you don’t have an AWS account, you can create a free account [here](https://portal.aws.amazon.com/billing/signup/iam).
- Node.js (>= 8.10). To install Node.js visit the [node.js](https://nodejs.org/en/) website. You can also a node version manager: [nvm](https://github.com/nvm-sh/nvm)
- The [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) toolkit: `$> npm install -g aws-cdk`
- [artillery](https://artillery.io/): `$> npm install -g artillery`

If this is the first time you deploy a CDK application in an environment you need to bootstrap it. Please take a look at the bootstrap section of the [CDK workshop](https://cdkworkshop.com/20-typescript/20-create-project/500-deploy.html).

## Deployment

This section covers how to deploy the API. It is a 3 steps process:

1. Creating secrets for the database
1. Building the application
1. Deploying the application

### Create secrets

If you haven't done it already, execute the following command in your Terminal.

```bash
$> aws secretsmanager create-secret --name AwsExperimentsLoadApigwLambdaDocumentdb/docdbsecrets --secret-string '{"password": "XXX-XXX-XXX-XXXXXXXXXXXX","username": "masteruser"}'
```

Retrieve the arn for the displayed result, you will use it when you deploy the CDK application.

Note: we should be able to create the secret through CDK and suppress this manual step. Unfortunately, it didn't work for me. An issue is on its way to the CDK team.

### Build

At the root of the repository:

```bash
$> npm install
```

This will install all the AWS CDK project dependencies.

```bash
$> npm run clean
```

This will remove all eventually installed development dependencies in the API application code. This helps to reduce package size of our lambda functions.

```bash
$> npm run build
```

This command execute the following command:

- `npm install --production --no-optional` in the `lambda-node` directory to install required dependencies
- `tsc` in the root directory to transpile Typescript to Javascript
- `wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem` in the `lambda-node` to gather the necessary `pem` file for [TLS connection](https://docs.aws.amazon.com/documentdb/latest/developerguide/security.encryption.ssl.html) to DocumentDB


### Deploy

```bash
$> cdk deploy --context docdbsecret_arn=arn:aws:secretsmanager:us-east-1:XXXXXXXXXXXX:secret:AwsExperimentsLoadApigwLambdaDocumentdb/docdbsecrets-XXXXXX -c docdbsecret_username=masteruser -c docdbsecret_password=XXX-XXX-XXX-XXX
```

The `--context, -c` option send parameters to the `CDK` application. Here you must replace `XXXX` values with the previously gathered `arn` and your desired password.

You can also specify the same context variables and values in the `cdk.json` file, use the following code:

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

## Testing manually

You can use `curl` to test your application manually.

For requesting a shorturl:

```bash
curl -d '{"url":"http://amazon.com"}' -H "Content-Type: application/json" -X POST https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod/urls-node
```

For getting a complete url from a shorturl:

```bash
curl https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod/urls-node/rBsbRVsjt
```

Or open the link in your browser.

## Load the application

Go to your load test folder:

```bash
$> cd tests/load
```

Edit the `artillery.yml` file to change the `target` field to match the output of the `cdk deploy` command.

Launch tests:

```bash
$> artillery run artillery.yml
```

The load test is based on the [artillery script](https://artillery.io/docs/script-reference/#scenarios) `artillery.yml`.

It sets two phases:

1. Warm up: ramp up arrival rate from 0 to 20 over 2 minutes
1. Max load sustain: 4 minutes at 20 virtual users arrival per second

Going further: if you run those tests from a local computer, you are limited by its bandwidth and performance. You can  execute those tests from an `EC2` instance in the `VPC` we have created to push the infrastructure further.

## Results

Navigate to the [x-ray service map](https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map).

Tweak the selection to match the time you run the tests. You should see the following service map:

![Architecture diagram](/resources/x-ray-service-map.png)

Click on the `AWS::ApiGateway::Stage` circle, click on "Analyze traces".

Zoom on the "Time series activity" diagram and click "Refine" in the "Filter trace set" card to zoom in. Repeat the operation if necessary.

You should now see something like this:

![Architecture diagram](/resources/x-ray-results.png)

X-Ray detects that we hit the API 1102 times over a period of 6 minutes. Every time we got an HTTP 200 status code which means everything went well.

For further details on how to use X-Ray, please visit the [documentation](https://docs.aws.amazon.com/xray/latest/devguide/xray-console-analytics.html).

If you connect your [DocumentDB cluster](https://docs.aws.amazon.com/documentdb/latest/developerguide/getting-started.connect.html) - you will need to launch a instance in one of the public subnet we created and [connect to it in SSH](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AccessingInstancesLinux.html) - you'll be able to retrieve all the create shortened urls.

On the instance (after successfully connecting to the DocumentDB cluster):

```bash
rs0:PRIMARY> show dbs
staging  0.003GB
rs0:PRIMARY> use staging
switched to db staging
rs0:PRIMARY> show collections
urls
rs0:PRIMARY> db.urls.find()
{ "_id" : ObjectId("5d5d7a1ae6b4b300068e9365"), "url" : "https://www.amazon.com/", "createdAt" : "Wed, 21 Aug 2019 17:06:34 GMT", "shortId" : "jNW4wUmXa", "requesterIP" : "54.239.6.177" }
{ "_id" : ObjectId("5d5d7a1aae1025000682fe33"), "url" : "https://aws.amazon.com/", "createdAt" : "Wed, 21 Aug 2019 17:06:34 GMT", "shortId" : "XrMFf35UN", "requesterIP" : "54.239.6.177" }
...
Type "it" for more
rs0:PRIMARY> db.urls.count()
1217
rs0:PRIMARY> exit
bye
[ec2-user@ip-10-0-5-10 ~]$ exit
logout
```

Note: If the `count()` value differs from the x-ray results - like here - it may me because you have run manual or automatic tests earlier or that you x-ray selection doesn't account for all the executions.

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
- [ ] Check lambda best practices and optimization:
  - [X] [Documentation](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
  - [X] [Optimizing AWS Lambda performance with MongoDB Atlas and Node.js](https://www.mongodb.com/blog/post/optimizing-aws-lambda-performance-with-mongodb-atlas-and-nodejs)
  - [X] [https://dev.to/adnanrahic/solving-invisible-scaling-issues-with-serverless-and-mongodb-4m55](https://dev.to/adnanrahic/solving-invisible-scaling-issues-with-serverless-and-mongodb-4m55)
  - [ ] [How to Use MongoDB Connection Pooling on AWS Lambda](https://scalegrid.io/blog/how-to-use-mongodb-connection-pooling-on-aws-lambda/)
  - [X] [Best Practices for Developing on AWS Lambda](https://aws.amazon.com/blogs/architecture/best-practices-for-developing-on-aws-lambda/)
- [ ] Provide additional measuring results:
  - [I’m afraid you’re thinking about AWS Lambda cold starts all wrong](https://theburningmonk.com/2018/01/im-afraid-youre-thinking-about-aws-lambda-cold-starts-all-wrong/)
  - [aws lambda – compare cold start time with different languages, memory and code sizes](https://theburningmonk.com/2017/06/aws-lambda-compare-coldstart-time-with-different-languages-memory-and-code-sizes/)
  - [Lambda Cold Starts, A Language Comparison 🕵 ❄️](https://medium.com/@nathan.malishev/lambda-cold-starts-language-comparison-%EF%B8%8F-a4f4b5f16a62)
- [X] Loading the application:
  - [Artillery](https://artillery.io/docs/script-reference/)
  - [Managing AWS Lambda Function Concurrency](https://aws.amazon.com/blogs/compute/managing-aws-lambda-function-concurrency/)
- [ ] Create an issue for incapacity to create a document DB and secrets with AWS CDK
- [ ] Remove the hello world node and python
- [ ] Implement the lambda for the url shortener in python
- [ ] Implement the lambda for the url shortener in java
- [ ] Enhance tests
  - [ ] Implement a data generation phase to gather short urls
  - [ ] Implement a load test for `getOriginURLNode`
  - [ ] Implement a cleaning url that will delete all generated data to start over

## Further documentation, sources and inspiration

This repository is inspired from different sources:

- [Managing AWS Lambda Function Concurrency](https://aws.amazon.com/blogs/compute/managing-aws-lambda-function-concurrency/)
- [Connecting to AWS DocumentDB from a Lambda function](https://blog.webiny.com/connecting-to-aws-documentdb-from-a-lambda-function-2b666c9e4402)
- [Running AWS Lambda-based applications with Amazon DocumentDB](https://aws.amazon.com/blogs/database/running-aws-lambda-based-applications-with-amazon-documentdb/)
- For additional details on CDK, please take a look at the [CDK workshop](https://cdkworkshop.com)
