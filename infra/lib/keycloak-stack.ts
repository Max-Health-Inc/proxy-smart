import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type { Construct } from 'constructs';

export interface KeycloakStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  database: rds.IDatabaseInstance;
  dbSecret: secretsmanager.ISecret;
  domainName: string;
  hostedZone: route53.IHostedZone;
  /**
   * Keycloak container image tag
   * @default '26.0'
   */
  keycloakVersion?: string;
}

/**
 * Keycloak Stack for Proxy Smart
 * 
 * Creates:
 * - ECS Fargate service running Keycloak
 * - Application Load Balancer with HTTPS
 * - WAF with OWASP rules
 * - CloudWatch alarms for monitoring
 * - Auto-scaling configuration
 */
export class KeycloakStack extends cdk.Stack {
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: KeycloakStackProps) {
    super(scope, id, props);

    const keycloakVersion = props.keycloakVersion ?? '26.0';

    // Separate Keycloak admin credentials (don't reuse DB credentials)
    const adminSecret = new secretsmanager.Secret(this, 'KeycloakAdminSecret', {
      secretName: 'proxy-smart/keycloak-admin',
      description: 'Keycloak admin console credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // SSL Certificate
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(props.hostedZone),
    });

    // WAF Web ACL for OWASP protection
    const webAcl = new wafv2.CfnWebACL(this, 'KeycloakWaf', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'KeycloakWafMetrics',
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
      clusterName: 'proxy-smart-keycloak',
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    // Keycloak service with ALB
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'KeycloakService',
      {
        cluster: this.cluster,
        serviceName: 'keycloak',
        cpu: 1024,        // 1 vCPU
        memoryLimitMiB: 2048,  // 2 GB RAM
        desiredCount: 1,
        
        // HTTPS configuration
        certificate,
        domainName: props.domainName,
        domainZone: props.hostedZone,
        redirectHTTP: true,
        sslPolicy: elbv2.SslPolicy.TLS13_RES,
        
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(`quay.io/keycloak/keycloak:${keycloakVersion}`),
          containerPort: 8080,
          environment: {
            KC_HOSTNAME: props.domainName,
            KC_HTTP_ENABLED: 'true',
            KC_PROXY_HEADERS: 'xforwarded',
            KC_HEALTH_ENABLED: 'true',
            KC_METRICS_ENABLED: 'true',
            KC_DB: 'postgres',
            KC_DB_URL: `jdbc:postgresql://${props.database.instanceEndpoint.hostname}:5432/keycloak`,
          },
          secrets: {
            KC_DB_USERNAME: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
            KC_DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
            // Use separate admin credentials (not DB credentials)
            KC_BOOTSTRAP_ADMIN_USERNAME: ecs.Secret.fromSecretsManager(adminSecret, 'username'),
            KC_BOOTSTRAP_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(adminSecret, 'password'),
          },
          command: ['start', '--optimized'],
        },
        
        // Health check
        healthCheck: {
          command: ['CMD-SHELL', 'curl -f http://localhost:8080/health/ready || exit 1'],
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(10),
          retries: 3,
          startPeriod: cdk.Duration.seconds(120),
        },
        
        // Circuit breaker for auto-rollback
        circuitBreaker: { rollback: true },
        
        // Enable ECS Exec for debugging
        enableExecuteCommand: true,
        
        minHealthyPercent: 100,
      }
    );

    // Configure ALB health check path
    this.service.targetGroup.configureHealthCheck({
      path: '/health/ready',
      healthyHttpCodes: '200',
    });

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
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
    new cloudwatch.Alarm(this, 'TokenEndpointLatencyAlarm', {
      metric: this.service.loadBalancer.metrics.targetResponseTime(),
      threshold: 2,
      evaluationPeriods: 3,
      alarmDescription: 'Token endpoint latency exceeds 2 seconds',
    });

    new cloudwatch.Alarm(this, 'UnhealthyHostsAlarm', {
      metric: this.service.targetGroup.metrics.unhealthyHostCount(),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'Unhealthy hosts detected in Keycloak target group',
    });

    new cloudwatch.Alarm(this, 'Http5xxErrorsAlarm', {
      metric: this.service.loadBalancer.metrics.httpCodeElb(
        elbv2.HttpCodeElb.ELB_5XX_COUNT
      ),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'High rate of 5xx errors from Keycloak ALB',
    });

    // Tags
    cdk.Tags.of(this).add('Application', 'proxy-smart');
    cdk.Tags.of(this).add('Component', 'keycloak');

    // Outputs
    new cdk.CfnOutput(this, 'KeycloakUrl', {
      value: `https://${props.domainName}`,
      description: 'Keycloak URL',
      exportName: 'ProxySmartKeycloakUrl',
    });

    new cdk.CfnOutput(this, 'KeycloakAdminSecretArn', {
      value: adminSecret.secretArn,
      description: 'Keycloak admin credentials secret ARN',
    });

    new cdk.CfnOutput(this, 'LoadBalancerDns', {
      value: this.service.loadBalancer.loadBalancerDnsName,
      description: 'ALB DNS name',
    });
  }
}
