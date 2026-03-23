import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';

export interface BackendStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  keycloakUrl: string;
  domainName: string;  // e.g., api.auth.maxhealth.tech
  hostedZone: route53.IHostedZone;
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
  public readonly repository: ecr.Repository;
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // ECR repository for mono container (backend + UI)
    // Image is built from Dockerfile.mono in CI/CD pipeline
    this.repository = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: 'proxy-smart-backend',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageScanOnPush: true, // Enable vulnerability scanning
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
          rulePriority: 1,
        },
      ],
    });

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

    // SSL Certificate
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.domainName,
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
      MONO_MODE: 'true',
      BASE_URL: `https://${props.domainName}`,
      PORT: '8445',
      // Keycloak config
      KEYCLOAK_BASE_URL: props.keycloakUrl,
      KEYCLOAK_REALM: 'proxy-smart',
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
        memoryLimitMiB: 1024,
        desiredCount: 1,
        
        certificate,
        domainName: props.domainName,
        domainZone: props.hostedZone,
        redirectHTTP: true,
        sslPolicy: elbv2.SslPolicy.TLS13_RES,
        
        taskImageOptions: {
          // Built from Dockerfile.mono (backend + UI in single container)
          image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
          containerPort: 8445,
          environment,
          secrets,
        },
        
        circuitBreaker: { rollback: true },
        enableExecuteCommand: true,
        minHealthyPercent: 100,
      }
    );

    // Configure health check
    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
    });

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'BackendWafAssociation', {
      resourceArn: this.service.loadBalancer.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

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
