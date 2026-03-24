import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  /**
   * Enable Multi-AZ for production HA
   * @default true
   */
  multiAz?: boolean;
}

/**
 * Database Stack for Proxy Smart
 * 
 * Creates:
 * - RDS PostgreSQL instance for Keycloak
 * - Secrets Manager secret for DB credentials
 * - Security group allowing access from private subnets
 */
export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly secret: secretsmanager.ISecret;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Security group for database
    this.securityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Keycloak PostgreSQL database',
      allowAllOutbound: false, // Database doesn't need outbound access
    });

    // Allow access from private subnets (where ECS tasks run)
    // This avoids cross-stack security group references
    for (const subnet of props.vpc.privateSubnets) {
      this.securityGroup.addIngressRule(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(5432),
        `Allow PostgreSQL from private subnet ${subnet.availabilityZone}`
      );
    }

    // Database credentials in Secrets Manager
    this.secret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: 'proxy-smart/db-credentials',
      description: 'PostgreSQL credentials for Keycloak database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'keycloak' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // RDS PostgreSQL instance
    this.database = new rds.DatabaseInstance(this, 'KeycloakDb', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.securityGroup],
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: 'keycloak',
      allocatedStorage: 20,
      maxAllocatedStorage: 100, // Auto-scaling storage
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true, // Prevent accidental deletion
      // ⚠️ HIPAA Requirement: Enable Multi-AZ for production
      multiAz: props.multiAz ?? true,
      storageEncrypted: true, // Encryption at rest
      monitoringInterval: cdk.Duration.seconds(60), // Enhanced monitoring
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days
      // Auto minor version upgrades
      autoMinorVersionUpgrade: true,
    });

    // Tag for identification
    cdk.Tags.of(this.database).add('Application', 'proxy-smart');
    cdk.Tags.of(this.database).add('Component', 'keycloak-database');

    // Outputs
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'Database endpoint hostname',
      exportName: 'ProxySmartDbEndpoint',
    });

    new cdk.CfnOutput(this, 'DbPort', {
      value: this.database.instanceEndpoint.port.toString(),
      description: 'Database port',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.secret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: 'ProxySmartDbSecretArn',
    });
  }
}
