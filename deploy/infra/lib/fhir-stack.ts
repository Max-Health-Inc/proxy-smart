import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';

export interface FhirStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  /**
   * The ECS cluster to deploy into (shared with backend for service discovery)
   */
  cluster: ecs.ICluster;
  /**
   * HAPI FHIR server image tag
   * @default 'latest'
   */
  hapiVersion?: string;
  /**
   * RDS instance class size
   * @default t4g.micro
   */
  dbInstanceSize?: ec2.InstanceSize;
  /**
   * Enable Multi-AZ for FHIR database
   * @default false
   */
  multiAzDatabase?: boolean;
  /**
   * Cloud Map namespace for internal service discovery
   * If not provided, a new private DNS namespace will be created
   */
  namespace?: servicediscovery.IPrivateDnsNamespace;
}

/**
 * HAPI FHIR Stack for Proxy Smart
 *
 * Internal-only FHIR R4 server — NOT publicly exposed.
 * Accessible only from the backend proxy via Cloud Map service discovery:
 *   http://hapi-fhir.proxy-smart.internal:8080/fhir
 *
 * Creates:
 * - RDS PostgreSQL instance (dedicated, isolated from Keycloak DB)
 * - ECS Fargate service running HAPI FHIR JPA Server (private subnets only)
 * - Cloud Map private DNS namespace for internal service discovery
 * - CloudWatch alarms for monitoring
 * - Auto-scaling configuration
 */
export class FhirStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly database: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly namespace: servicediscovery.IPrivateDnsNamespace;
  /** Internal URL for the backend to reach the FHIR server */
  public readonly internalUrl: string;

  constructor(scope: Construct, id: string, props: FhirStackProps) {
    super(scope, id, props);

    const hapiVersion = props.hapiVersion ?? 'latest';
    const dbInstanceSize = props.dbInstanceSize ?? ec2.InstanceSize.MICRO;
    const multiAz = props.multiAzDatabase ?? false;

    // =========================================================================
    // Database — dedicated PostgreSQL for FHIR data (HIPAA isolation)
    // =========================================================================

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'FhirDbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for HAPI FHIR PostgreSQL database',
      allowAllOutbound: false,
    });

    // Allow access from private subnets (ECS tasks)
    for (const subnet of props.vpc.privateSubnets) {
      dbSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(5432),
        `Allow PostgreSQL from private subnet ${subnet.availabilityZone}`,
      );
    }

    this.dbSecret = new secretsmanager.Secret(this, 'FhirDbSecret', {
      secretName: 'proxy-smart/fhir-db-credentials',
      description: 'PostgreSQL credentials for HAPI FHIR database',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'hapi_fhir' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    this.database = new rds.DatabaseInstance(this, 'FhirDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, dbInstanceSize),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: 'hapi_fhir',
      allocatedStorage: 20,
      maxAllocatedStorage: 200,
      backupRetention: cdk.Duration.days(1),
      deletionProtection: true,
      multiAz,
      storageEncrypted: true,
      monitoringInterval: cdk.Duration.seconds(0), // Disabled for free tier
      enablePerformanceInsights: false, // Disabled for free tier
      autoMinorVersionUpgrade: true,
    });

    // =========================================================================
    // Cloud Map — private DNS namespace for service discovery
    // =========================================================================

    this.namespace = props.namespace ?? new servicediscovery.PrivateDnsNamespace(
      this,
      'FhirNamespace',
      {
        name: 'proxy-smart.internal',
        vpc: props.vpc,
        description: 'Private DNS namespace for Proxy Smart internal services',
      },
    );

    // =========================================================================
    // Security Group — FHIR service (only allows traffic from within VPC)
    // =========================================================================

    const fhirServiceSg = new ec2.SecurityGroup(this, 'FhirServiceSg', {
      vpc: props.vpc,
      description: 'Security group for HAPI FHIR ECS service (internal only)',
      allowAllOutbound: true,
    });

    // Allow inbound on port 8080 only from private subnets (backend tasks)
    for (const subnet of props.vpc.privateSubnets) {
      fhirServiceSg.addIngressRule(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(8080),
        `Allow FHIR access from private subnet ${subnet.availabilityZone}`,
      );
    }

    // =========================================================================
    // ECS Fargate — HAPI FHIR JPA Server (internal, no ALB)
    // =========================================================================

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'FhirTaskDef', {
      cpu: 1024,       // 1 vCPU — HAPI FHIR is JVM-based
      memoryLimitMiB: 2048, // 2 GB — JVM heap + overhead
    });

    taskDefinition.addContainer('hapi-fhir', {
      image: ecs.ContainerImage.fromRegistry(`hapiproject/hapi:${hapiVersion}`),
      containerName: 'hapi-fhir',
      portMappings: [{ containerPort: 8080, name: 'fhir' }],
      environment: {
        // Spring Boot / HAPI FHIR configuration
        'spring.datasource.url': `jdbc:postgresql://${this.database.instanceEndpoint.hostname}:5432/hapi_fhir`,
        'spring.datasource.driverClassName': 'org.postgresql.Driver',
        'spring.jpa.properties.hibernate.dialect':
          'ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgresDialect',
        // FHIR server settings
        'hapi.fhir.fhir_version': 'R4',
        'hapi.fhir.server_address': 'http://hapi-fhir.proxy-smart.internal:8080/fhir',
        'hapi.fhir.allow_multiple_delete': 'true',
        'hapi.fhir.allow_external_references': 'true',
        'hapi.fhir.allow_placeholder_references': 'true',
        // Performance tuning
        'hapi.fhir.bulk_export_enabled': 'true',
        'hapi.fhir.default_page_size': '50',
        'hapi.fhir.max_page_size': '200',
        // SMART on FHIR capability
        'hapi.fhir.tester.home.fhir_version': 'R4',
        // JVM tuning for container
        JAVA_OPTS: '-Xms512m -Xmx1536m -XX:+UseG1GC -XX:+UseContainerSupport',
      },
      secrets: {
        'spring.datasource.username': ecs.Secret.fromSecretsManager(
          this.dbSecret,
          'username',
        ),
        'spring.datasource.password': ecs.Secret.fromSecretsManager(
          this.dbSecret,
          'password',
        ),
      },
      // No container-level health check — the image is distroless (no sh/wget/curl).
      // ECS service uses deployment circuit breaker + Cloud Map health (TCP port 8080).
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'hapi-fhir',
      }),
    });

    this.service = new ecs.FargateService(this, 'FhirService', {
      cluster: props.cluster,
      serviceName: 'hapi-fhir',
      taskDefinition,
      desiredCount: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [fhirServiceSg],
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true,
      minHealthyPercent: 100,
      cloudMapOptions: {
        name: 'hapi-fhir',
        cloudMapNamespace: this.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(10),
      },
    });

    // Internal URL for the backend to use
    this.internalUrl = 'http://hapi-fhir.proxy-smart.internal:8080/fhir';

    // =========================================================================
    // Auto-scaling
    // =========================================================================

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 3,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(120),
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(120),
    });

    // =========================================================================
    // CloudWatch Alarms
    // =========================================================================

    new cloudwatch.Alarm(this, 'FhirDbCpuAlarm', {
      metric: this.database.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 3,
      alarmDescription: 'FHIR database CPU utilization exceeds 80%',
    });

    // =========================================================================
    // Tags
    // =========================================================================

    cdk.Tags.of(this).add('Application', 'proxy-smart');
    cdk.Tags.of(this).add('Component', 'fhir-server');

    // =========================================================================
    // Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'FhirInternalUrl', {
      value: this.internalUrl,
      description: 'Internal FHIR server URL (only reachable from within VPC)',
      exportName: 'ProxySmartFhirInternalUrl',
    });

    new cdk.CfnOutput(this, 'FhirDbEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'FHIR database endpoint',
    });

    new cdk.CfnOutput(this, 'FhirNamespaceName', {
      value: this.namespace.namespaceName,
      description: 'Cloud Map namespace for service discovery',
    });
  }
}
