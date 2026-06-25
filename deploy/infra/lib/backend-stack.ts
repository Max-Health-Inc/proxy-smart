import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';

export interface BackendStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  keycloakUrl: string;
  domainName: string;  // e.g., api.proxy-smart.com
  apexDomain?: string; // e.g., proxy-smart.com (landing page on root domain)
  hostedZone: route53.IHostedZone;
  /**
   * Shared RDS instance. The backend connects to a dedicated database on this
   * instance (default `proxy_smart`) for its admin-config + mTLS stores.
   */
  database: rds.IDatabaseInstance;
  /** Secret holding the RDS master credentials (username/password). */
  dbSecret: secretsmanager.ISecret;
  /**
   * Name of the backend's database on the shared RDS instance.
   *
   * ⚠️ MANUAL PROVISIONING (one-time): the shared RDS only auto-creates the
   * `keycloak` database. This database must be created once before/at first
   * deploy, e.g. by connecting with the master credentials and running:
   *   CREATE DATABASE proxy_smart;
   * The backend then creates its own tables on startup (CREATE TABLE IF NOT
   * EXISTS). Until this database exists the backend's DB-backed stores will log
   * connection errors and fall back to serving defaults.
   *
   * @default 'proxy_smart'
   */
  databaseName?: string;
  /**
   * Optional FHIR server URL
   */
  fhirServerBase?: string;
  /**
   * Enable KISI door access integration
   */
  kisiEnabled?: boolean;
  /**
   * Override KISI API base URL (defaults to https://api.kisi.io)
   */
  kisiBaseUrl?: string;
  /**
   * Enable UniFi Access door integration
   */
  unifiAccessEnabled?: boolean;
}

/**
 * Backend Stack for Proxy Smart
 * 
 * Creates:
 * - ECR repository for mono container (backend + UI)
 * - ECS Fargate service
 * - Application Load Balancer with HTTPS
 * - WAF with OWASP rules
 * - Auto-scaling configuration
 */
export class BackendStack extends cdk.Stack {
  public readonly repository: ecr.IRepository;
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // ECR repository — created externally, imported here
    // Allows build+push before CDK deploy (avoids chicken-and-egg)
    this.repository = ecr.Repository.fromRepositoryName(
      this, 'BackendRepo', 'proxy-smart-backend'
    );

    // Keycloak admin credentials for backend to manage clients/users
    const keycloakAdminSecret = new secretsmanager.Secret(this, 'KeycloakAdminSecret', {
      secretName: 'proxy-smart/backend-keycloak-admin',
      description: 'Keycloak admin credentials for backend service',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          clientId: 'admin-cli',
        }),
        generateStringKey: 'clientSecret',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // KISI API credentials (created only if KISI is enabled)
    const kisiSecret = props.kisiEnabled
      ? new secretsmanager.Secret(this, 'KisiApiSecret', {
          secretName: 'proxy-smart/kisi-api',
          description: 'KISI API key for door access control',
        })
      : undefined;

    // UniFi Access credentials (created only if UniFi is enabled)
    const unifiAccessSecret = props.unifiAccessEnabled
      ? new secretsmanager.Secret(this, 'UnifiAccessSecret', {
          secretName: 'proxy-smart/unifi-access',
          description: 'UniFi Access controller credentials',
          generateSecretString: {
            secretStringTemplate: JSON.stringify({
              host: 'REPLACE_WITH_UNIFI_HOST',
              username: 'REPLACE_WITH_UNIFI_USERNAME',
            }),
            generateStringKey: 'password',
            excludePunctuation: false,
            passwordLength: 32,
          },
        })
      : undefined;

    // SSL Certificate (includes apex domain if configured)
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.domainName,
      subjectAlternativeNames: props.apexDomain ? [props.apexDomain] : undefined,
      validation: acm.CertificateValidation.fromDns(props.hostedZone),
    });

    // WAF Web ACL for backend
    const webAcl = new wafv2.CfnWebACL(this, 'BackendWaf', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'BackendWafMetrics',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetrics',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsMetrics',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'proxy-smart-production',
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // Build environment variables
    const environment: Record<string, string> = {
      // Core config (matches backend/src/config.ts)
      NODE_ENV: 'production',
      BASE_URL: `https://${props.domainName}`,
      PORT: '8445',
      // CORS: standalone app domains hosted on Cloudflare Pages
      CORS_ORIGINS: [
        `https://${props.domainName}`,
        'https://patient.maxhealth.tech',
        'https://consent.maxhealth.tech',
        'https://dtr.maxhealth.tech',
        'https://dicom.maxhealth.tech',
        'https://maxhealth.tech',
      ].join(','),
      // Keycloak config
      KEYCLOAK_BASE_URL: props.keycloakUrl,
      KEYCLOAK_REALM: 'proxy-smart',
      // Database connection (admin-config + mTLS stores). Credentials come from
      // Secrets Manager below as PGUSER/PGPASSWORD; the backend assembles
      // DATABASE_URL from these PG* parts so the password never lives in a plain
      // env var. Mirrors how the Keycloak task injects KC_DB_* secrets.
      PGHOST: props.database.instanceEndpoint.hostname,
      PGPORT: '5432',
      PGDATABASE: props.databaseName ?? 'proxy_smart',
    };

    // Add FHIR server if provided
    if (props.fhirServerBase) {
      environment.FHIR_SERVER_BASE = props.fhirServerBase;
    }

    // Add KISI config if enabled
    if (props.kisiEnabled && props.kisiBaseUrl) {
      environment.KISI_BASE_URL = props.kisiBaseUrl;
    }

    // Build secrets map
    const secrets: Record<string, ecs.Secret> = {
      KEYCLOAK_ADMIN_CLIENT_ID: ecs.Secret.fromSecretsManager(keycloakAdminSecret, 'clientId'),
      KEYCLOAK_ADMIN_CLIENT_SECRET: ecs.Secret.fromSecretsManager(keycloakAdminSecret, 'clientSecret'),
      // RDS credentials for the proxy_smart database (same secret Keycloak uses).
      PGUSER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
      PGPASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
    };

    // Add KISI secret if enabled
    if (kisiSecret) {
      secrets.KISI_API_KEY = ecs.Secret.fromSecretsManager(kisiSecret);
    }

    // Add UniFi Access secrets if enabled
    if (unifiAccessSecret) {
      secrets.UNIFI_ACCESS_HOST = ecs.Secret.fromSecretsManager(unifiAccessSecret, 'host');
      secrets.UNIFI_ACCESS_USERNAME = ecs.Secret.fromSecretsManager(unifiAccessSecret, 'username');
      secrets.UNIFI_ACCESS_PASSWORD = ecs.Secret.fromSecretsManager(unifiAccessSecret, 'password');
    }

    // Backend service (mono container: backend + embedded UI)
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'BackendService',
      {
        cluster: this.cluster,
        serviceName: 'proxy-smart-backend',
        cpu: 512,
        memoryLimitMiB: 2048,
        desiredCount: 1,

        // Place tasks in private subnets so the RDS security group's
        // private-subnet-CIDR ingress applies (same as the Keycloak service).
        taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },

        certificate,
        domainName: props.domainName,
        domainZone: props.hostedZone,
        redirectHTTP: true,
        sslPolicy: elbv2.SslPolicy.TLS13_RES,
        
        taskImageOptions: {
          // Image built and pushed externally (CI/CD or manual)
          image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
          containerPort: 8445,
          environment,
          secrets,
        },
        
        circuitBreaker: { rollback: true },
        enableExecuteCommand: this.node.tryGetContext('enableEcsExec') === 'true',
        minHealthyPercent: 100,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
      }
    );

    // Configure health check
    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    });

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'BackendWafAssociation', {
      resourceArn: this.service.loadBalancer.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // Apex domain (proxy-smart.com) → ALB alias record
    if (props.apexDomain) {
      new route53.ARecord(this, 'ApexDomainRecord', {
        zone: props.hostedZone,
        recordName: props.apexDomain,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.LoadBalancerTarget(this.service.loadBalancer)
        ),
      });
    }

    // Auto-scaling
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // CloudWatch Alarms
    new cloudwatch.Alarm(this, 'LatencyAlarm', {
      metric: this.service.loadBalancer.metrics.targetResponseTime(),
      threshold: 2,
      evaluationPeriods: 3,
      alarmDescription: 'Backend API latency exceeds 2 seconds',
    });

    new cloudwatch.Alarm(this, 'UnhealthyHostsAlarm', {
      metric: this.service.targetGroup.metrics.unhealthyHostCount(),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'Unhealthy hosts detected in backend target group',
    });

    new cloudwatch.Alarm(this, 'Http5xxErrorsAlarm', {
      metric: this.service.loadBalancer.metrics.httpCodeElb(
        elbv2.HttpCodeElb.ELB_5XX_COUNT
      ),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'High rate of 5xx errors from backend ALB',
    });

    // Tags
    cdk.Tags.of(this).add('Application', 'proxy-smart');
    cdk.Tags.of(this).add('Component', 'backend');

    // Outputs
    new cdk.CfnOutput(this, 'BackendUrl', {
      value: `https://${props.domainName}`,
      description: 'Backend API URL',
      exportName: 'ProxySmartBackendUrl',
    });

    new cdk.CfnOutput(this, 'EcrRepoUri', {
      value: this.repository.repositoryUri,
      description: 'ECR repository URI for mono container',
      exportName: 'ProxySmartEcrRepoUri',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS cluster name for deployment workflows',
      exportName: 'ProxySmartClusterName',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.service.serviceName,
      description: 'ECS service name for deployment workflows',
      exportName: 'ProxySmartServiceName',
    });

    new cdk.CfnOutput(this, 'LoadBalancerDns', {
      value: this.service.loadBalancer.loadBalancerDnsName,
      description: 'ALB DNS name',
    });
  }
}
