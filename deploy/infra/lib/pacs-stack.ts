import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import type * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import type { Construct } from 'constructs';

/** Internal DICOMweb URL. A literal so the backend stack needs no dependency on this one. */
export const PACS_INTERNAL_DICOMWEB_URL = 'http://orthanc.proxy-smart.internal:8042/dicom-web';

/** Orthanc's only account, and the key under which its password is stored. */
export const PACS_USERNAME = 'orthanc';

/**
 * Looked up by NAME from the backend stack rather than passed as a reference:
 * PacsStack needs BackendStack's cluster, so a reference back would be a cycle.
 * The consequence is an ordering requirement — see `dicomEnabled` in bin/infra.ts.
 */
export const PACS_CREDENTIALS_SECRET_NAME = 'proxy-smart/orthanc-credentials';

export interface PacsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  cluster: ecs.ICluster;
  /** Shared RDS instance holding the Orthanc index (pixel data lives in S3). */
  database: rds.IDatabaseInstance;
  /** Master credentials for that instance. */
  dbSecret: secretsmanager.ISecret;
  /** Cloud Map namespace, shared with the FHIR service. */
  namespace: servicediscovery.IPrivateDnsNamespace;
  /**
   * Orthanc's database on the shared RDS instance.
   *
   * ⚠️ MANUAL PROVISIONING (one-time), same as the backend's `proxy_smart`: the
   * shared instance only auto-creates `keycloak`. Connect with the master
   * credentials once and run:
   *   CREATE DATABASE orthanc;
   * Orthanc creates its own tables on first start.
   *
   * @default 'orthanc'
   */
  databaseName?: string;
  /** Days before a study moves to Glacier Instant Retrieval. @default 90 */
  archiveAfterDays?: number;
  /** @default '26.1.0' — matches docker-compose.beta.yml */
  orthancVersion?: string;
}

/**
 * Orthanc PACS — internal only, DICOMweb over Cloud Map.
 *
 * Storage split: the index goes to the shared RDS, pixel data to S3. S3 rather
 * than EFS because imaging is the one dataset that only grows — EFS is ~13x the
 * per-GB price, so the choice compounds. Reachable only from the VPC, so no ALB
 * and no WAF.
 *
 * Two one-time steps after the first deploy:
 *   1. CREATE DATABASE orthanc;              (see PacsStackProps.databaseName)
 *   2. register it via POST /admin/dicom-servers, using the username/password
 *      from the proxy-smart/orthanc-credentials secret. That stores the URL and
 *      credentials in runtime config, which buildServerAuthHeader() prefers over
 *      the DICOMWEB_* environment fallback.
 */
export class PacsStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly bucket: s3.Bucket;
  public readonly internalUrl: string;

  constructor(scope: Construct, id: string, props: PacsStackProps) {
    super(scope, id, props);

    const databaseName = props.databaseName ?? 'orthanc';
    const archiveAfterDays = props.archiveAfterDays ?? 90;

    // =========================================================================
    // S3 — pixel data
    // =========================================================================

    this.bucket = new s3.Bucket(this, 'PacsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // No versioning: every version of an imaging object is a full copy, and
      // DICOM instances are written once and never edited.
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'archive-cold-studies',
          enabled: true,
          // Glacier Instant Retrieval: ~5x cheaper, still served without a
          // restore, which suits imaging (written once, read rarely, but when
          // it is needed it is needed now).
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: cdk.Duration.days(archiveAfterDays),
            },
          ],
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // =========================================================================
    // Orthanc web credentials
    // =========================================================================

    // Shaped as Orthanc's RegisteredUsers map ({"<user>": "<password>"}) so the
    // secret can be handed to ORTHANC__REGISTERED_USERS verbatim. The backend
    // reads the same key for its Basic auth.
    const orthancSecret = new secretsmanager.Secret(this, 'OrthancSecret', {
      secretName: PACS_CREDENTIALS_SECRET_NAME,
      description: 'Orthanc DICOMweb credentials (RegisteredUsers map)',
      generateSecretString: {
        secretStringTemplate: '{}',
        generateStringKey: PACS_USERNAME,
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // =========================================================================
    // Networking — VPC-internal only
    // =========================================================================

    const serviceSg = new ec2.SecurityGroup(this, 'PacsServiceSg', {
      vpc: props.vpc,
      description: 'Orthanc PACS (internal only)',
      allowAllOutbound: true,
    });

    for (const subnet of props.vpc.privateSubnets) {
      serviceSg.addIngressRule(
        ec2.Peer.ipv4(subnet.ipv4CidrBlock),
        ec2.Port.tcp(8042),
        `Allow DICOMweb from private subnet ${subnet.availabilityZone}`,
      );
    }

    // No ingress rule added on the database SG: DatabaseStack already admits every
    // private subnet CIDR, and referencing this SG from there would make the
    // database stack depend on this one — a cycle.

    // =========================================================================
    // ECS Fargate — Orthanc
    // =========================================================================

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'PacsTaskDef', {
      // Orthanc is C++ and idles cheaply; pixel data streams to S3 rather than
      // through a heap. 1 GB is the smallest valid pairing above 512 MB at this
      // CPU tier, and matches the beta container's mem_limit.
      cpu: 256,
      memoryLimitMiB: 1024,
    });

    this.bucket.grantReadWrite(taskDefinition.taskRole);

    taskDefinition.addContainer('orthanc', {
      image: ecs.ContainerImage.fromRegistry(
        `orthancteam/orthanc:${props.orthancVersion ?? '26.1.0'}`,
      ),
      containerName: 'orthanc',
      portMappings: [{ containerPort: 8042, name: 'dicomweb' }],
      environment: {
        ORTHANC__NAME: 'Proxy Smart PACS',
        ORTHANC__REMOTE_ACCESS_ALLOWED: 'true',
        ORTHANC__AUTHENTICATION_ENABLED: 'true',

        ORTHANC__DICOM_WEB__ENABLE: 'true',
        ORTHANC__DICOM_WEB__ROOT: '/dicom-web/',

        // Index in Postgres, pixel data in S3.
        ORTHANC__POSTGRESQL__ENABLE_INDEX: 'true',
        ORTHANC__POSTGRESQL__ENABLE_STORAGE: 'false',
        ORTHANC__POSTGRESQL__HOST: props.database.instanceEndpoint.hostname,
        ORTHANC__POSTGRESQL__PORT: '5432',
        ORTHANC__POSTGRESQL__DATABASE: databaseName,

        // AccessKey/SecretKey omitted on purpose — the plugin falls back to the
        // default credential chain, i.e. the task role granted above.
        AWS_S3_STORAGE_PLUGIN_ENABLED: 'true',
        ORTHANC__AWS_S3_STORAGE__BUCKET_NAME: this.bucket.bucketName,
        ORTHANC__AWS_S3_STORAGE__REGION: cdk.Stack.of(this).region,
      },
      secrets: {
        ORTHANC__POSTGRESQL__USERNAME: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        ORTHANC__POSTGRESQL__PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
        ORTHANC__REGISTERED_USERS: ecs.Secret.fromSecretsManager(orthancSecret),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -sf http://localhost:8042/system > /dev/null || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'orthanc' }),
    });

    this.service = new ecs.FargateService(this, 'PacsService', {
      cluster: props.cluster,
      serviceName: 'orthanc',
      taskDefinition,
      desiredCount: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [serviceSg],
      circuitBreaker: { rollback: true },
      enableExecuteCommand: true,
      // Single task: Orthanc's index assumes one writer, so never run two.
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
      cloudMapOptions: {
        name: 'orthanc',
        cloudMapNamespace: props.namespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(10),
      },
    });

    this.internalUrl = PACS_INTERNAL_DICOMWEB_URL;

    cdk.Tags.of(this).add('Application', 'proxy-smart');
    cdk.Tags.of(this).add('Component', 'pacs');

    new cdk.CfnOutput(this, 'PacsInternalUrl', {
      value: this.internalUrl,
      description: 'Internal DICOMweb URL (VPC only)',
      exportName: 'ProxySmartPacsInternalUrl',
    });

    new cdk.CfnOutput(this, 'PacsBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket holding DICOM pixel data',
    });
  }
}
