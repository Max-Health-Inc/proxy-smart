import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
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
   * Keycloak container image tag — only used when `imageUri` is not set.
   * @default '26.0'
   */
  keycloakVersion?: string;
  /**
   * Full ECR image URI for the custom Keycloak image that includes the
   * proxy-smart login theme. When provided, the pre-built ECR image is used
   * with `start --optimized`; when omitted the stock quay.io image is used.
   *
   * ECR repo name must be `proxy-smart-keycloak`.
   * @example "579201838740.dkr.ecr.eu-central-1.amazonaws.com/proxy-smart-keycloak:latest"
   */
  imageUri?: string;
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
    const useCustomImage = Boolean(props.imageUri);

    // Container image: ECR custom image (with pre-built proxy-smart theme) or stock quay.io
    const keycloakRepo = useCustomImage
      ? ecr.Repository.fromRepositoryName(this, 'KeycloakRepo', 'proxy-smart-keycloak')
      : undefined;
    const containerImage = keycloakRepo
      ? ecs.ContainerImage.fromEcrRepository(keycloakRepo, 'latest')
      : ecs.ContainerImage.fromRegistry(`quay.io/keycloak/keycloak:${keycloakVersion}`);

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

    // WAF Web ACL — default BLOCK with path allowlist (like beta's Caddy path restriction)
    // Only browser-interactive Keycloak endpoints are exposed publicly.
    // Token, introspection, userinfo, and admin MUST go through the backend proxy.
    const webAcl = new wafv2.CfnWebACL(this, 'KeycloakWaf', {
      scope: 'REGIONAL',
      defaultAction: { block: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'KeycloakWafMetrics',
        sampledRequestsEnabled: true,
      },
      rules: [
        // Priority 0: Explicitly block sensitive server-to-server endpoints
        // (defense-in-depth — these would also be blocked by default, but explicit block
        //  ensures they can't slip through if AllowBrowserPaths is too broad)
        {
          name: 'BlockSensitiveEndpoints',
          priority: 0,
          action: { block: {} },
          statement: {
            orStatement: {
              statements: [
                // Token endpoint (also catches /token/introspect)
                {
                  byteMatchStatement: {
                    searchString: '/protocol/openid-connect/token',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'CONTAINS',
                  },
                },
                // Userinfo endpoint
                {
                  byteMatchStatement: {
                    searchString: '/protocol/openid-connect/userinfo',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'CONTAINS',
                  },
                },
                // Admin console & admin REST API (no trailing slash — catches /admin and /admin/*)  
                {
                  byteMatchStatement: {
                    searchString: '/admin',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
                // Block master realm entirely (only proxy-smart realm should be public)
                {
                  byteMatchStatement: {
                    searchString: '/realms/master',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
                // Native client registration (must use backend's /auth/register)
                {
                  byteMatchStatement: {
                    searchString: '/clients-registrations',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                    positionalConstraint: 'CONTAINS',
                  },
                },
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'BlockSensitiveEndpointsMetrics',
            sampledRequestsEnabled: true,
          },
        },
        // Priority 1-2: OWASP managed rules — filter malicious requests on allowed paths
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                // Keycloak login forms can trigger these on legitimate form POSTs
                { name: 'SizeRestrictions_BODY' },
                { name: 'CrossSiteScripting_BODY' },
              ],
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
        // Priority 10: Allow only browser-facing paths (matches beta Caddy config)
        // Allowed: login page, logout, certs, broker, login-actions, discovery, theme assets
        {
          name: 'AllowBrowserFacingPaths',
          priority: 10,
          action: { allow: {} },
          statement: {
            orStatement: {
              statements: [
                // /realms/proxy-smart/ — only the application realm is public
                {
                  byteMatchStatement: {
                    searchString: '/realms/proxy-smart/',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'NONE' }],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
                // /resources/* — Keycloak theme static assets (CSS, images, fonts)
                {
                  byteMatchStatement: {
                    searchString: '/resources/',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'NONE' }],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
                // /js/* — Keycloak JavaScript adapter
                {
                  byteMatchStatement: {
                    searchString: '/js/',
                    fieldToMatch: { uriPath: {} },
                    textTransformations: [{ priority: 0, type: 'NONE' }],
                    positionalConstraint: 'STARTS_WITH',
                  },
                },
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AllowBrowserFacingPathsMetrics',
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
        
        // Place tasks in private subnets (required for DB access — DB SG allows private CIDR)
        taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        
        // HTTPS configuration
        certificate,
        domainName: props.domainName,
        domainZone: props.hostedZone,
        redirectHTTP: true,
        sslPolicy: elbv2.SslPolicy.TLS13_RES,
        
        taskImageOptions: {
          image: containerImage,
          containerPort: 8080,
          environment: {
            KC_HOSTNAME: props.domainName,
            KC_HOSTNAME_STRICT: 'false',
            KC_HTTP_ENABLED: 'true',
            KC_PROXY_HEADERS: 'xforwarded',
            KC_HEALTH_ENABLED: 'true',
            KC_METRICS_ENABLED: 'true',
            KC_DB: 'postgres',
            KC_DB_URL: `jdbc:postgresql://${props.database.instanceEndpoint.hostname}:5432/keycloak`,
            // Limit JVM heap for Fargate memory
            JAVA_OPTS_KC_HEAP: '-Xms256m -Xmx1024m',
          },
          secrets: {
            KC_DB_USERNAME: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
            KC_DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
            // Use separate admin credentials (not DB credentials)
            KC_BOOTSTRAP_ADMIN_USERNAME: ecs.Secret.fromSecretsManager(adminSecret, 'username'),
            KC_BOOTSTRAP_ADMIN_PASSWORD: ecs.Secret.fromSecretsManager(adminSecret, 'password'),
          },
          // Custom image uses kc.sh build at Docker build time → --optimized avoids re-build.
          // Stock image has no pre-built config so must use plain 'start'.
          command: useCustomImage ? ['start', '--optimized'] : ['start'],
        },
        
        // Health check — check management port 9000 where KC26 serves /health/ready
        healthCheck: {
          command: ['CMD-SHELL', 'exec 3<>/dev/tcp/localhost/9000 && echo -e "GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n" >&3 && cat <&3 | grep -q UP'],
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(10),
          retries: 5,
          // Custom pre-built image: ~1-2 min. Stock runtime build: ~3-5 min.
          startPeriod: useCustomImage ? cdk.Duration.seconds(120) : cdk.Duration.seconds(300),
        },
        
        // Circuit breaker for auto-rollback
        circuitBreaker: { rollback: true },
        
        // Enable ECS Exec for debugging
        enableExecuteCommand: true,
        
        minHealthyPercent: 100,
      }
    );

    // Configure ALB health check — use /realms/master (port 8080) since
    // KC26 serves /health/ready on management port 9000 which ALB can't reach
    this.service.targetGroup.configureHealthCheck({
      path: '/realms/master',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
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
