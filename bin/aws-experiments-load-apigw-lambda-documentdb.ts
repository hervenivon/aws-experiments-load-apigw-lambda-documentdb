#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { AwsExperimentsLoadApigwLambdaDocumentdbStack } from '../lib/aws-experiments-load-apigw-lambda-documentdb-stack';

const app = new cdk.App();
new AwsExperimentsLoadApigwLambdaDocumentdbStack(app, 'AwsExperimentsLoadApigwLambdaDocumentdbStack');
