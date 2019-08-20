#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { AwsExperimentsLoadApigatewayLambdaDocumentdbStack } from '../lib/aws-experiments-load-apigateway-lambda-documentdb-stack';

const app = new cdk.App();
new AwsExperimentsLoadApigatewayLambdaDocumentdbStack(app, 'AwsExperimentsLoadApigatewayLambdaDocumentdbStack');