import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import type * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import type * as route53 from 'aws-cdk-lib/aws-route53';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import type { Construct } from 'constructs';

/**
 * Cloud Map namespace used for internal service discovery.
 *
 * Created by FhirStack (which registers hapi-fhir into it) and imported here by
 * attributes rather than passed as a prop: bin/infra.ts instantiates this stack
 * BEFORE FhirStack, so a prop would be a circular ordering problem, and a real
 * cross-stack reference would couple two stacks that are otherwise independent.
 * Importing by name/id adds no CloudFormation dependency.
 */
const INTERNAL_NAMESPACE_NAME = 'proxy-smart.internal';
const INTERNAL_NAMESPACE_ID = 'ns-qqkxevmqx3i3mmpf';

/** DNS label registered in that namespace → keycloak.proxy-smart.internal */
const INTERNAL_SERVICE_NAME = 'keycloak';

export interface KeycloakStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  database: rds.IDatabaseInstance;
  dbSecret: secretsmanager.ISecret;
  domainName: string;
  hostedZone: route53.IHostedZone;
  /**
   * Keycloak container image tag — only used when `imageUri` is not set.
   * @default '26.6.4'
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

    const keycloakVersion = props.keycloakVersion ?? '26.6.4';
    const useCustomImage = Boolean(props.imageUri);

    // Container image: ECR custom image (with pre-built proxy-smart theme) or stock quay.io.
    // ECR repo is created externally by the deploy workflow's idempotent
    // create-repository step (avoids the chicken-and-egg of pushing before a CDK
    // deploy) and imported here. That step needs the deploy role to allow
    // ecr:CreateRepository on repository/proxy-smart-*.
    const keycloakRepo = useCustomImage
      ? ecr.Repository.fromRepositoryName(this, 'KeycloakRepo', 'proxy-smart-keycloak')
      : undefined;

    // Use the TAG the caller actually passed in `imageUri`, not a fixed 'latest'.
    //
    // Pinning the tag here made `imageUri` a boolean in disguise: whatever the
    // deploy passed, the synthesized template always said `:latest`, so it was
    // byte-identical between releases, CDK reported "no changes", and the
    // running task definition never moved to the newly pushed image. Reading the
    // tag makes each release produce a real template diff, which is what causes
    // ECS to roll.
    //
    // Split on the LAST colon so a registry host carrying a port survives.
    const imageTag = useCustomImage ? (props.imageUri!.split(':').pop() || 'latest') : 'latest';
    const containerImage = keycloakRepo
      ? ecs.ContainerImage.fromEcrRepository(keycloakRepo, imageTag)
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
      // Container Insights emits per-task metrics that dominated the CloudWatch
      // bill (~$27/mo) while avg CPU sits <1%. CloudWatch alarms below still
      // work off the free ALB/ECS service metrics. Re-enable if deep per-task
      // profiling is needed.
      containerInsightsV2: ecs.ContainerInsights.DISABLED,
    });

    // Keycloak service with ALB
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'KeycloakService',
      {
        cluster: this.cluster,
        serviceName: 'keycloak',
        // Right-sized from 1024/2048: 30d avg CPU 0.4%, peak mem ~33% (~650 MB).
        // JVM heap lowered to -Xmx768m below so 1 GB container leaves room for
        // metaspace/off-heap. Autoscaling (below) still covers real bursts.
        cpu: 512,         // 0.5 vCPU
        memoryLimitMiB: 1024,  // 1 GB RAM
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
            // Must equal the custom image's build-time --http-relative-path
            // (Dockerfile.keycloak, KC_RELATIVE_PATH — '/' for production). A
            // mismatch makes Keycloak re-build at startup WITHOUT the pinned
            // cimd/resource-indicators features, which then crashes realm import.
            // Stated explicitly rather than relying on the default so the
            // contract with the Dockerfile is visible on both sides; the ALB
            // health-check path below also assumes root.
            KC_HTTP_RELATIVE_PATH: '/',
            KC_HTTP_ENABLED: 'true',
            KC_PROXY_HEADERS: 'xforwarded',
            KC_HEALTH_ENABLED: 'true',
            KC_METRICS_ENABLED: 'true',
            KC_DB: 'postgres',
            KC_DB_URL: `jdbc:postgresql://${props.database.instanceEndpoint.hostname}:5432/keycloak`,
            // Limit JVM heap for Fargate memory. Heap ≤768m on a 1 GB container
            // leaves headroom for JVM metaspace/off-heap (avoids OOM kills).
            JAVA_OPTS_KC_HEAP: '-Xms256m -Xmx768m',
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
          //
          // This REPLACES the image's CMD, so --import-realm has to be repeated
          // here: Dockerfile.keycloak keeps it in CMD (not ENTRYPOINT) precisely
          // so overriding is possible, which means an override that omits it
          // silently stops importing the realm. The stock image has no baked
          // export, so importing would be a no-op there.
          command: useCustomImage ? ['start', '--optimized', '--import-realm'] : ['start'],
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

    // Register the tasks in Cloud Map so other services can reach Keycloak
    // DIRECTLY at keycloak.proxy-smart.internal:8080, bypassing the ALB.
    //
    // THE BUG THIS FIXES. The backend was configured with the PUBLIC
    // KEYCLOAK_BASE_URL (https://auth.proxy-smart.com), so its server-to-server
    // calls went out through the NAT gateway and back in through this ALB — and
    // therefore through the WAF, whose BlockSensitiveEndpoints rule (priority 0)
    // blocks /protocol/openid-connect/token and /admin*. Every admin-token
    // request returned an HTML 403. Confirmed from WAF sampled requests:
    //   BLOCK  POST /realms/proxy-smart/protocol/openid-connect/token  3.66.160.214
    // With getRegisteredRedirectUris failing closed on an empty allowlist, that
    // one block turned into /auth/authorize rejecting every redirect_uri (403),
    // dead CORS refresh, dead event polling, and a user-facing
    // "Authentication unavailable".
    //
    // The WAF rules are RIGHT — those endpoints should not be reachable from the
    // internet. The mistake was routing internal traffic through the public edge.
    this.service.service.enableCloudMap({
      cloudMapNamespace: servicediscovery.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(
        this,
        'InternalNamespace',
        {
          namespaceName: INTERNAL_NAMESPACE_NAME,
          namespaceId: INTERNAL_NAMESPACE_ID,
          namespaceArn: `arn:aws:servicediscovery:${this.region}:${this.account}:namespace/${INTERNAL_NAMESPACE_ID}`,
        },
      ),
      name: INTERNAL_SERVICE_NAME,
      dnsRecordType: servicediscovery.DnsRecordType.A,
      dnsTtl: cdk.Duration.seconds(30),
    });

    // Allow other services in the VPC to reach the container port directly.
    // Scoped to the VPC CIDR rather than the backend's security group because
    // BackendStack is created after this one, so its SG cannot be referenced
    // without introducing a cross-stack cycle. Tasks sit in private subnets, so
    // this is not internet-reachable.
    this.service.service.connections.allowFrom(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(8080),
      'Internal service-to-service access to Keycloak (bypasses ALB + WAF)',
    );

    // Configure ALB health check — use /realms/master (port 8080) since
    // KC26 serves /health/ready on management port 9000 which ALB can't reach.
    //
    // The path is root-relative and therefore tied to KC_HTTP_RELATIVE_PATH
    // above. This is what failed the first custom-image rollout: the image was
    // built with --http-relative-path=/auth, so /realms/master 404'd, the target
    // went unhealthy, the ECS circuit breaker tripped and CloudFormation rolled
    // back. Keycloak itself had started fine. If the relative path ever becomes
    // non-root here, this path has to gain the same prefix.
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
