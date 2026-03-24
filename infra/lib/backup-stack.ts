import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

export interface BackupStackProps extends cdk.StackProps {
  keycloakUrl: string;
  /**
   * ARN of the Keycloak admin secret
   */
  keycloakAdminSecretArn: string;
  /**
   * Backup retention in days
   * @default 90
   */
  retentionDays?: number;
}

/**
 * Backup Stack for Proxy Smart
 * 
 * Creates:
 * - S3 bucket for Keycloak realm backups
 * - Lambda function to export realm configuration
 * - EventBridge rule for daily scheduled backups
 */
export class BackupStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const retentionDays = props.retentionDays ?? 90;

    // S3 bucket for backups with versioning
    this.bucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `proxy-smart-backups-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'ExpireOldBackups',
          expiration: cdk.Duration.days(retentionDays),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep backups even if stack is deleted
    });

    // Reference existing Keycloak admin secret
    const keycloakSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'KeycloakAdminSecret',
      props.keycloakAdminSecretArn
    );

    // Lambda function for realm backup
    const backupLambda = new lambda.Function(this, 'RealmBackupLambda', {
      functionName: 'proxy-smart-realm-backup',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        KEYCLOAK_URL: props.keycloakUrl,
        KEYCLOAK_REALM: 'proxy-smart',
        BACKUP_BUCKET: this.bucket.bucketName,
        SECRET_ARN: props.keycloakAdminSecretArn,
      },
      code: lambda.Code.fromInline(`
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const s3 = new S3Client();
const secrets = new SecretsManagerClient();

exports.handler = async (event) => {
  console.log('Starting Keycloak realm backup...');
  
  try {
    // Get admin credentials from Secrets Manager
    const secretResponse = await secrets.send(new GetSecretValueCommand({
      SecretId: process.env.SECRET_ARN
    }));
    const credentials = JSON.parse(secretResponse.SecretString);
    
    // Get admin token from Keycloak
    const tokenUrl = \`\${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token\`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: credentials.username,
        password: credentials.password,
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error(\`Failed to get admin token: \${tokenResponse.status}\`);
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Export realm configuration
    const exportUrl = \`\${process.env.KEYCLOAK_URL}/admin/realms/\${process.env.KEYCLOAK_REALM}/partial-export?exportClients=true&exportGroupsAndRoles=true\`;
    const exportResponse = await fetch(exportUrl, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${access_token}\`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!exportResponse.ok) {
      throw new Error(\`Failed to export realm: \${exportResponse.status}\`);
    }
    
    const realmConfig = await exportResponse.json();
    
    // Upload to S3 with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = \`realm-exports/\${process.env.KEYCLOAK_REALM}/\${timestamp}.json\`;
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BACKUP_BUCKET,
      Key: key,
      Body: JSON.stringify(realmConfig, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'realm': process.env.KEYCLOAK_REALM,
        'timestamp': new Date().toISOString(),
      },
    }));
    
    console.log(\`Realm backup saved to s3://\${process.env.BACKUP_BUCKET}/\${key}\`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Backup completed successfully',
        key: key,
      }),
    };
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
};
      `),
    });

    // Grant Lambda permissions
    this.bucket.grantWrite(backupLambda);
    keycloakSecret.grantRead(backupLambda);

    // Add network permissions if Keycloak is in VPC
    backupLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
      resources: ['*'],
    }));

    // Daily backup schedule at 3 AM UTC
    const backupRule = new events.Rule(this, 'DailyBackupRule', {
      ruleName: 'proxy-smart-daily-realm-backup',
      description: 'Daily Keycloak realm configuration backup',
      schedule: events.Schedule.cron({ hour: '3', minute: '0' }),
    });

    backupRule.addTarget(new targets.LambdaFunction(backupLambda, {
      retryAttempts: 2,
    }));

    // Tags
    cdk.Tags.of(this).add('Application', 'proxy-smart');
    cdk.Tags.of(this).add('Component', 'backup');

    // Outputs
    new cdk.CfnOutput(this, 'BackupBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket for realm backups',
      exportName: 'ProxySmartBackupBucket',
    });

    new cdk.CfnOutput(this, 'BackupLambdaArn', {
      value: backupLambda.functionArn,
      description: 'Backup Lambda function ARN',
    });
  }
}
