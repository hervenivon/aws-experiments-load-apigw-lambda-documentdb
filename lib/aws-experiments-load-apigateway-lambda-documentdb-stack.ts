import sns = require('@aws-cdk/aws-sns');
import subs = require('@aws-cdk/aws-sns-subscriptions');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/core');

export class AwsExperimentsLoadApigatewayLambdaDocumentdbStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'AwsExperimentsLoadApigatewayLambdaDocumentdbQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'AwsExperimentsLoadApigatewayLambdaDocumentdbTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));
  }
}
