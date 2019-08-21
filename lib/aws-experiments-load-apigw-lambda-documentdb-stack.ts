import cdk = require('@aws-cdk/core');
import apigw = require('@aws-cdk/aws-apigateway');
import docdb = require("@aws-cdk/aws-docdb");
import ec2 = require("@aws-cdk/aws-ec2");
import lambda = require('@aws-cdk/aws-lambda');
import sm = require("@aws-cdk/aws-secretsmanager");

export class AwsExperimentsLoadApigwLambdaDocumentdbStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcCDIR = '10.0.0.0/16';
    const port = 27017;

    // documentation: https://docs.aws.amazon.com/cdk/latest/guide/get_context_var.html
    const docdbsecretARN = this.node.tryGetContext('docdbsecret_arn');
    const secret = sm.Secret.fromSecretAttributes(this, 'ImportedSecret', {
      secretArn: docdbsecretARN
    });

    // Not working as of 20190820
    // const secret = new sm.Secret(this, 'docDBSecrets', {
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({ username: 'masteruser' }),
    //     includeSpace: false,
    //     excludePunctuation: true,
    //     passwordLength: 15,
    //     generateStringKey: 'password'
    //   }
    // });

    // defines VPC
    const vpc = new ec2.Vpc(this, 'vpc', {
      cidr: vpcCDIR,
      subnetConfiguration: [
          {
              subnetType: ec2.SubnetType.PRIVATE,
              cidrMask: 24,
              name: 'Private1'
          },
          {
              subnetType: ec2.SubnetType.PRIVATE,
              cidrMask: 24,
              name: 'Private2'
          },
          {
              subnetType: ec2.SubnetType.PUBLIC,
              cidrMask: 24,
              name: 'Public1'
          },
          {
              subnetType: ec2.SubnetType.PUBLIC,
              cidrMask: 24,
              name: 'Public2'
          }
      ]
    });

    // define security group
    const sg = new ec2.SecurityGroup(this, 'docdb-lambda-sg', {
      vpc,
      securityGroupName: 'docdb-lambda-sg'
    });
    sg.addIngressRule(ec2.Peer.ipv4(vpcCDIR), ec2.Port.tcp(port));

    // define subnet group for Document DB
    const subnetGroup = new docdb.CfnDBSubnetGroup(this, 'subnet-group', {
      subnetIds: vpc.privateSubnets.map(x=>x.subnetId),
      dbSubnetGroupName: 'subnet-group',
      dbSubnetGroupDescription: 'Subnet Group for DocumentDB'
    });

    // Not working as of 20190820
    // const masterUsername = secret.secretValueFromJson('username');
    // const masterUserPassword = secret.secretValueFromJson('password');
    const masterUsername = this.node.tryGetContext('docdbsecret_username');
    const masterUserPassword = this.node.tryGetContext('docdbsecret_password');
    const dbCluster = new docdb.CfnDBCluster(this, 'db-cluster', {
      storageEncrypted: true,
      availabilityZones: vpc.availabilityZones.splice(3),
      dbClusterIdentifier: 'docdb',
      masterUsername: masterUsername,
      masterUserPassword: masterUserPassword,
      vpcSecurityGroupIds: [sg.securityGroupName],
      dbSubnetGroupName: subnetGroup.dbSubnetGroupName,
      port
    });
    dbCluster.addDependsOn(subnetGroup);

    const dbInstance = new docdb.CfnDBInstance(this, 'db-instance', {
      dbClusterIdentifier: dbCluster.ref,
      autoMinorVersionUpgrade: true,
      dbInstanceClass: 'db.r4.large',
      dbInstanceIdentifier: 'staging'
    });
    dbInstance.addDependsOn(dbCluster);

    const DB_URL = `mongodb://${dbCluster.masterUsername}:${dbCluster.masterUserPassword}@${dbCluster.attrEndpoint}:${dbCluster.attrPort}`
    const DB_NAME = dbInstance.dbInstanceIdentifier as string;



    // defines an AWS lambda resource on Node
    const helloNode = new lambda.Function(this, 'HelloHandlerNode', {
      runtime: lambda.Runtime.NODEJS_10_X,    // execution environment
      code: lambda.Code.asset('lambda-node'), // code loaded from the "lambda" directory
      handler: 'hello.handler',               // file is "hello", function is "handler"
      tracing: lambda.Tracing.ACTIVE,         // activate X-Ray
      environment: {
        SM_SECRET_ARN: docdbsecretARN
        //SM_SECRET_ARN: secret.secretArn
      }
    });
    secret.grantRead(helloNode)

    // defines an AWS lambda resource on Python
    const helloPython = new lambda.Function(this, 'HelloHandlerPython', {
      runtime: lambda.Runtime.PYTHON_3_7,       // execution environment
      code: lambda.Code.asset('lambda-python'), // code loaded from the "lambda" directory
      handler: 'hello.handler',                 // file is "hello", function is "handler"
      tracing: lambda.Tracing.ACTIVE,           // activate X-Ray
      environment: {
        SM_SECRET_ARN: docdbsecretARN
        //SM_SECRET_ARN: secret.secretArn
      }
    });
    secret.grantRead(helloPython)

    // defines an API Gateway REST API to support all handlers.
    const api = new apigw.RestApi(this, 'gdelt', {
      restApiName: 'GDELT'
    });

    const routeNode = api.root.addResource('node')
    const routeNodeLambdaIntegration = new apigw.LambdaIntegration(helloNode);
    routeNode.addMethod('GET', routeNodeLambdaIntegration)

    const routePython = api.root.addResource('python')
    const routePythonLambdaIntegration = new apigw.LambdaIntegration(helloPython);
    routePython.addMethod('GET', routePythonLambdaIntegration)

    new cdk.CfnOutput(this, 'gdeltEndpoint', {
      value: api.url
    });
  }
}
