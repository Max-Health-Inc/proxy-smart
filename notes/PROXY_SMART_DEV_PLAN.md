# Proxy Smart AWS Deployment Plan
## CDK Infrastructure for Production-Ready Identity Platform

> **Status**: Phase 1 Complete - Infrastructure Code Implemented
> **Target**: AWS with CDK (TypeScript)
> **Last Updated**: January 2026

---

## Overview

Deploy Proxy Smart (Keycloak + SMART on FHIR proxy) to AWS using CDK for infrastructure-as-code. This enables MaxHealth and future SMART apps to authenticate via Keycloak with HIPAA-compliant infrastructure.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Account                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        VPC (10.0.0.0/16)                            │    │
│  │                                                                      │    │
│  │  ┌──────────────────┐          ┌──────────────────┐                 │    │
│  │  │  Public Subnet   │          │  Public Subnet   │                 │    │
│  │  │   (us-east-1a)   │          │   (us-east-1b)   │                 │    │
│  │  │                  │          │                  │                 │    │
│  │  │  ┌────────────┐  │          │  ┌────────────┐  │                 │    │
│  │  │  │    ALB     │◄─┼──────────┼──┤    ALB     │  │                 │    │
│  │  │  └─────┬──────┘  │          │  └────────────┘  │                 │    │
│  │  └────────┼─────────┘          └──────────────────┘                 │    │
│  │           │                                                          │    │
│  │  ┌────────┼─────────┐          ┌──────────────────┐                 │    │
│  │  │ Private│Subnet   │          │  Private Subnet  │                 │    │
│  │  │   (us-east-1a)   │          │   (us-east-1b)   │                 │    │
│  │  │        │         │          │                  │                 │    │
│  │  │  ┌─────▼──────┐  │          │  ┌────────────┐  │                 │    │
│  │  │  │  Fargate   │  │          │  │  Fargate   │  │                 │    │
│  │  │  │ ┌────────┐ │  │          │  │ ┌────────┐ │  │                 │    │
│  │  │  │ │Keycloak│ │  │◄────────►│  │ │Keycloak│ │  │   (Auto-scale) │    │
│  │  │  │ └────────┘ │  │          │  │ └────────┘ │  │                 │    │
│  │  │  │ ┌────────┐ │  │          │  │ ┌────────┐ │  │                 │    │
│  │  │  │ │Backend │ │  │          │  │ │Backend │ │  │                 │    │
│  │  │  │ └────────┘ │  │          │  │ └────────┘ │  │                 │    │
│  │  │  └────────────┘  │          │  └────────────┘  │                 │    │
│  │  └──────────────────┘          └──────────────────┘                 │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Isolated Subnet                            │   │    │
│  │  │  ┌────────────────────────────────────────────────────────┐  │   │    │
│  │  │  │              RDS PostgreSQL (Multi-AZ)                  │  │   │    │
│  │  │  │              keycloak database                          │  │   │    │
│  │  │  └────────────────────────────────────────────────────────┘  │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐     │
│  │  Route 53   │  │     ACM     │  │  Secrets    │  │   CloudWatch    │     │
│  │    DNS      │  │   (SSL)     │  │   Manager   │  │  (Logs/Metrics) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘

External:
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MaxHealth     │────►│  Proxy Smart    │────►│   FHIR Servers  │
│   (Cloudflare)  │     │  (AWS ECS)      │     │  (HAPI, Epic)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## AWS Services

| Service | Purpose | Estimated Cost |
|---------|---------|----------------|
| **ECS Fargate** | Run Keycloak + Backend containers | ~$40-60/mo |
| **RDS PostgreSQL** | Keycloak database (db.t4g.micro) | ~$15-25/mo |
| **Application Load Balancer** | HTTPS termination, routing | ~$20/mo |
| **Route 53** | DNS management | ~$0.50/mo |
| **ACM** | SSL certificates | Free |
| **Secrets Manager** | DB credentials, API keys | ~$1/mo |
| **CloudWatch** | Logs, metrics, alarms | ~$5-10/mo |
| **ECR** | Container registry | ~$1/mo |
| **VPC** | Network isolation | Free |
| **NAT Gateway** | Outbound internet for private subnets | ~$35/mo |
| **WAF** | Web Application Firewall (OWASP rules) | ~$10-20/mo |

**Total Estimate**: ~$130-170/mo (before startup credits)

> ⚠️ **Production Note**: For HIPAA compliance, consider 2 NAT Gateways (one per AZ) for high availability (+$35/mo)

**With AWS Activate Credits**: Free for 12-24 months

---

## CI/CD Integration Note

This plan integrates with your existing CI/CD infrastructure:

| Environment | Platform | Workflow | Status |
|------------|----------|----------|--------|
| **Alpha** | Northflank | Automatic CD from `develop` | ✅ Existing |
| **Beta** | VPS | `deploy-beta.yml` via SSH | ✅ Existing |
| **Production** | AWS (CDK) | `deploy-production.yml` + `deploy-aws-cdk.yml` | 🆕 New |

The AWS production deployment will:
- Use your existing `setup-bun-version` action
- Build the mono container (`Dockerfile.mono`)
- Push to ECR with version tagging
- Deploy via ECS with health checks

---

## Phase 1: AWS Account Setup

### 1.1 Apply for AWS Activate
- [ ] Go to https://aws.amazon.com/activate/
- [ ] Apply for Founders tier ($1K credits) immediately
- [ ] If connected to accelerator/VC, apply for Portfolio tier ($25K-$100K)

### 1.2 AWS Organization Setup
- [ ] Create AWS Organization (if not exists)
- [ ] Create dedicated account for Proxy Smart (optional, for isolation)
- [ ] Enable AWS SSO for admin access
- [ ] Set up billing alerts

### 1.3 Domain & DNS
- [ ] Decide subdomain: `auth.maxhealth.tech` or `id.maxhealth.tech`
- [ ] Create hosted zone in Route 53 (or use existing)
- [ ] Update Cloudflare to delegate subdomain to Route 53 (if needed)

---

## Phase 2: CDK Project Setup

### 2.1 Initialize CDK in Proxy Smart Repo

```bash
cd smart-on-fhir-proxy
mkdir -p infra
cd infra
npx cdk init app --language typescript
```

### 2.2 Project Structure

```
smart-on-fhir-proxy/
├── backend/           # Existing Elysia backend
├── keycloak/          # Realm configs
├── ui/                # Admin UI
├── infra/             # NEW: CDK infrastructure
│   ├── bin/
│   │   └── infra.ts           # CDK app entry
│   ├── lib/
│   │   ├── vpc-stack.ts       # VPC, subnets, NAT
│   │   ├── database-stack.ts  # RDS PostgreSQL
│   │   ├── keycloak-stack.ts  # Keycloak ECS service
│   │   ├── backend-stack.ts   # Backend ECS service
│   │   ├── backup-stack.ts    # S3 + Lambda for realm backup
│   │   └── dns-stack.ts       # Route 53, ACM
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml  # Local dev (unchanged)
```

### 2.3 CDK Package Configuration

Create `infra/package.json` to match your monorepo conventions:

```json
{
  "name": "proxy-smart-infra",
  "displayName": "Proxy Smart Infrastructure",
  "description": "AWS CDK infrastructure for Proxy Smart production deployment",
  "version": "0.0.2-alpha.202512290159.ce05f5f0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "cdk": "cdk",
    "synth": "cdk synth",
    "diff": "cdk diff --all",
    "deploy": "cdk deploy --all --require-approval never",
    "deploy:vpc": "cdk deploy ProxySmartVpc",
    "deploy:database": "cdk deploy ProxySmartDatabase",
    "deploy:keycloak": "cdk deploy ProxySmartKeycloak",
    "deploy:backend": "cdk deploy ProxySmartBackend",
    "destroy": "cdk destroy --all",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.170.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.2",
    "@types/node": "^25.0.10",
    "aws-cdk": "^2.170.0",
    "eslint": "^9.39.2",
    "globals": "^17.1.0",
    "typescript": "5.9.3",
    "typescript-eslint": "^8.53.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  }
}
```

### 2.4 Add Infra Scripts to Root package.json

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    // ... existing scripts ...
    "infra:synth": "cd infra && bun run synth",
    "infra:diff": "cd infra && bun run diff",
    "infra:deploy": "cd infra && bun run deploy",
    "infra:deploy:vpc": "cd infra && bun run deploy:vpc",
    "infra:deploy:database": "cd infra && bun run deploy:database",
    "infra:deploy:keycloak": "cd infra && bun run deploy:keycloak",
    "infra:deploy:backend": "cd infra && bun run deploy:backend",
    "infra:destroy": "cd infra && bun run destroy"
  },
  "workspaces": [
    "backend",
    "ui",
    "infra"
  ]
}
```

### 2.5 CDK TypeScript Configuration

Create `infra/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.6 CDK Configuration

Create `infra/cdk.json`:

```json
{
  "app": "npx ts-node --esm bin/infra.ts",
  "watch": {
    "include": ["**"],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "node_modules",
      "dist"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws"],
    "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
    "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true
  }
}
```

---

## Phase 3: Infrastructure Code

### 3.1 VPC Stack

```typescript
// infra/lib/vpc-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'ProxySmartVpc', {
      maxAzs: 2,
      // Cost optimization: 1 NAT instead of 2
      // ⚠️ For production HA, set natGateways: 2 (one per AZ)
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });
  }
}
```

### 3.2 Database Stack

```typescript
// infra/lib/database-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly secret: secretsmanager.ISecret;

  constructor(scope: cdk.App, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Security group for database
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Keycloak database',
      allowAllOutbound: false,
    });

    // Database credentials in Secrets Manager
    this.secret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: 'proxy-smart/db-credentials',
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
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: 'keycloak',
      allocatedStorage: 20,
      maxAllocatedStorage: 100, // Auto-scaling storage
      backupRetention: cdk.Duration.days(7),
      deletionProtection: true, // Prevent accidental deletion
      // ⚠️ HIPAA Requirement: Enable Multi-AZ for production
      multiAz: true,
      storageEncrypted: true, // Encryption at rest
    });

    // Output database endpoint
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.database.instanceEndpoint.hostname,
    });
  }
}
```

### 3.3 Keycloak Stack

```typescript
// infra/lib/keycloak-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

interface KeycloakStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  database: rds.DatabaseInstance;
  dbSecret: secretsmanager.ISecret;
  domainName: string;
  hostedZone: route53.IHostedZone;
}

// Import WAF for security
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class KeycloakStack extends cdk.Stack {
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(scope: cdk.App, id: string, props: KeycloakStackProps) {
    super(scope, id, props);

    // Separate Keycloak admin credentials (don't reuse DB credentials)
    const adminSecret = new secretsmanager.Secret(this, 'KeycloakAdminSecret', {
      secretName: 'proxy-smart/keycloak-admin',
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
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      containerInsights: true,
    });

    // Keycloak service with ALB
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'KeycloakService',
      {
        cluster,
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
          image: ecs.ContainerImage.fromRegistry('quay.io/keycloak/keycloak:26.5'),
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

    // Allow Keycloak to connect to RDS
    props.database.connections.allowFrom(
      this.service.service,
      ec2.Port.tcp(5432),
      'Allow Keycloak to connect to PostgreSQL'
    );

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

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
      resourceArn: this.service.loadBalancer.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // CloudWatch Alarms for monitoring
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
  }
}
```

### 3.4 Backend Stack (Proxy Smart API)

```typescript
// infra/lib/backend-stack.ts
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

interface BackendStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  keycloakUrl: string;
  domainName: string;  // e.g., api.auth.maxhealth.tech
  hostedZone: route53.IHostedZone;
  fhirServerBase?: string;  // Optional FHIR server URL
}

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // ECR repository for mono container (backend + UI)
    // Image is built from Dockerfile.mono in CI/CD pipeline
    const repository = new ecr.Repository(this, 'BackendRepo', {
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
      ],
    });

    // Reuse Keycloak's cluster or create shared cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'proxy-smart-production',
      containerInsights: true,
    });

    // Backend service (mono container: backend + embedded UI)
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'BackendService',
      {
        cluster,
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
          image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
          containerPort: 8445,
          environment: {
            // Core config (matches backend/src/config.ts)
            NODE_ENV: 'production',
            MONO_MODE: 'true',
            BASE_URL: `https://${props.domainName}`,
            PORT: '8445',
            // Keycloak config
            KEYCLOAK_BASE_URL: props.keycloakUrl,
            KEYCLOAK_REALM: 'proxy-smart',
            // FHIR config (optional - can be configured per-tenant)
            ...(props.fhirServerBase && { FHIR_SERVER_BASE: props.fhirServerBase }),
          },
          secrets: {
            // Keycloak admin credentials from Secrets Manager
            KEYCLOAK_ADMIN_CLIENT_ID: ecs.Secret.fromSecretsManager(keycloakAdminSecret, 'clientId'),
            KEYCLOAK_ADMIN_CLIENT_SECRET: ecs.Secret.fromSecretsManager(keycloakAdminSecret, 'clientSecret'),
          },
        },
        
        circuitBreaker: { rollback: true },
        enableExecuteCommand: true,
        minHealthyPercent: 100,
      }
    );

    service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
    });

    // Associate WAF with ALB
    new wafv2.CfnWebACLAssociation(this, 'BackendWafAssociation', {
      resourceArn: service.loadBalancer.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // Auto-scaling
    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    // Output ECR repository URI for CI/CD
    new cdk.CfnOutput(this, 'EcrRepoUri', {
      value: repository.repositoryUri,
      description: 'ECR repository URI for mono container',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS cluster name for deployment workflows',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.service.serviceName,
      description: 'ECS service name for deployment workflows',
    });
  }
}
```

### 3.5 Main CDK App

```typescript
// infra/bin/infra.ts
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { VpcStack } from '../lib/vpc-stack';
import { DatabaseStack } from '../lib/database-stack';
import { KeycloakStack } from '../lib/keycloak-stack';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Configuration
const config = {
  keycloakDomain: 'auth.maxhealth.tech',
  backendDomain: 'api.auth.maxhealth.tech',
  hostedZoneId: 'Z1234567890ABC', // Replace with actual
  hostedZoneName: 'maxhealth.tech',
};

// Lookup existing hosted zone
const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
  app,
  'HostedZone',
  {
    hostedZoneId: config.hostedZoneId,
    zoneName: config.hostedZoneName,
  }
);

// Stack deployment
const vpcStack = new VpcStack(app, 'ProxySmartVpc', { env });

const databaseStack = new DatabaseStack(app, 'ProxySmartDatabase', {
  env,
  vpc: vpcStack.vpc,
});

const keycloakStack = new KeycloakStack(app, 'ProxySmartKeycloak', {
  env,
  vpc: vpcStack.vpc,
  database: databaseStack.database,
  dbSecret: databaseStack.secret,
  domainName: config.keycloakDomain,
  hostedZone,
});

new BackendStack(app, 'ProxySmartBackend', {
  env,
  vpc: vpcStack.vpc,
  keycloakUrl: `https://${config.keycloakDomain}`,
  domainName: config.backendDomain,
  hostedZone,
});

app.synth();
```

---

## Phase 4: CI/CD Pipeline

### 4.1 AWS CDK Deploy Workflow

Add AWS CDK deployment as a reusable workflow that integrates with your existing release orchestrator:

```yaml
# .github/workflows/deploy-aws-cdk.yml
name: Deploy AWS CDK Infrastructure

on:
  workflow_call:
    inputs:
      app_version:
        description: 'Version of the application to deploy'
        required: true
        type: string
      source_branch:
        description: 'Source branch for deployment'
        required: true
        type: string
      stack_name:
        description: 'CDK stack to deploy (all, vpc, database, keycloak, backend)'
        required: false
        type: string
        default: 'all'
    outputs:
      keycloak_url:
        description: "Keycloak URL after deployment"
        value: ${{ jobs.deploy.outputs.keycloak_url }}
      backend_url:
        description: "Backend API URL after deployment"
        value: ${{ jobs.deploy.outputs.backend_url }}
      deployment_status:
        description: "Status of the deployment"
        value: ${{ jobs.deploy.outputs.deployment_status }}
    secrets:
      AWS_ACCESS_KEY_ID:
        required: true
      AWS_SECRET_ACCESS_KEY:
        required: true
      AWS_REGION:
        required: true
      AWS_ACCOUNT_ID:
        required: true

jobs:
  deploy-infra:
    name: Deploy CDK Infrastructure
    runs-on: ubuntu-latest
    outputs:
      keycloak_url: ${{ steps.deploy.outputs.keycloak_url }}
      backend_url: ${{ steps.deploy.outputs.backend_url }}
      deployment_status: ${{ steps.deploy.outputs.deployment_status }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.source_branch }}
      
      - name: Setup Bun
        uses: ./.github/actions/setup-bun-version
      
      - name: Install CDK dependencies
        working-directory: ./infra
        run: bun install
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
          
      - name: CDK Deploy
        id: deploy
        working-directory: ./infra
        env:
          CDK_DEFAULT_ACCOUNT: ${{ secrets.AWS_ACCOUNT_ID }}
          CDK_DEFAULT_REGION: ${{ secrets.AWS_REGION }}
        run: |
          echo "🚀 Deploying CDK stacks..."
          
          if [ "${{ inputs.stack_name }}" = "all" ]; then
            npx cdk deploy --all --require-approval never
          else
            npx cdk deploy ProxySmart${{ inputs.stack_name }} --require-approval never
          fi
          
          # Output URLs (adjust based on your CDK outputs)
          echo "keycloak_url=https://auth.maxhealth.tech" >> $GITHUB_OUTPUT
          echo "backend_url=https://api.auth.maxhealth.tech" >> $GITHUB_OUTPUT
          echo "deployment_status=success" >> $GITHUB_OUTPUT

  build-and-push:
    name: Build and Push Backend Image
    needs: deploy-infra
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.source_branch }}
      
      - name: Setup Bun
        uses: ./.github/actions/setup-bun-version
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
          
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
        
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: proxy-smart-backend
          IMAGE_TAG: ${{ inputs.app_version }}
        run: |
          echo "🔨 Building backend image..."
          
          # Build mono container (backend + UI)
          docker build -f Dockerfile.mono \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            --build-arg VERSION=$IMAGE_TAG \
            .
          
          echo "📤 Pushing to ECR..."
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          
      - name: Update ECS service
        env:
          AWS_REGION: ${{ secrets.AWS_REGION }}
        run: |
          echo "🔄 Updating ECS service..."
          aws ecs update-service \
            --cluster proxy-smart-production \
            --service proxy-smart-backend \
            --force-new-deployment
          
          echo "⏳ Waiting for deployment to stabilize..."
          aws ecs wait services-stable \
            --cluster proxy-smart-production \
            --services proxy-smart-backend
          
          echo "✅ Deployment complete"
```

### 4.2 Update deploy-production.yml

Update your existing production workflow to use CDK when AWS is selected:

```yaml
# Add to existing .github/workflows/deploy-production.yml (AWS section)

          elif [ -n "$AWS_ACCESS_KEY_ID" ]; then
            echo "☁️ Using AWS for production deployment..."
            DEPLOYMENT_TARGET="aws"
            
            # Option 1: Use CDK for infrastructure updates
            # cd infra && npx cdk deploy --all --require-approval never
            
            # Option 2: Just update ECS service (infrastructure already exists)
            aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
            aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
            aws configure set default.region $AWS_REGION
            
            # Build and push to ECR
            ECR_REGISTRY="${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.$AWS_REGION.amazonaws.com"
            aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
            
            # Build mono container
            docker build -f Dockerfile.mono \
              -t $ECR_REGISTRY/proxy-smart-backend:${{ inputs.app_version }} \
              -t $ECR_REGISTRY/proxy-smart-backend:latest \
              --build-arg VERSION=${{ inputs.app_version }} \
              .
            
            docker push $ECR_REGISTRY/proxy-smart-backend:${{ inputs.app_version }}
            docker push $ECR_REGISTRY/proxy-smart-backend:latest
            
            # Update ECS service
            aws ecs update-service \
              --cluster proxy-smart-production \
              --service proxy-smart-backend \
              --force-new-deployment
            
            aws ecs wait services-stable \
              --cluster proxy-smart-production \
              --services proxy-smart-backend
            
            PRODUCTION_URL="https://api.auth.maxhealth.tech"
            KEYCLOAK_URL="https://auth.maxhealth.tech"
```

### 4.3 Add CDK Diff on PR

Add a workflow to show CDK changes in pull requests:

```yaml
# .github/workflows/cdk-diff.yml
name: CDK Diff

on:
  pull_request:
    paths:
      - 'infra/**'
      - 'Dockerfile*'

jobs:
  diff:
    name: CDK Diff
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: ./.github/actions/setup-bun-version
      
      - name: Install CDK dependencies
        working-directory: ./infra
        run: bun install
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
          
      - name: CDK Diff
        working-directory: ./infra
        env:
          CDK_DEFAULT_ACCOUNT: ${{ secrets.AWS_ACCOUNT_ID }}
          CDK_DEFAULT_REGION: ${{ secrets.AWS_REGION }}
        run: |
          echo "## CDK Diff" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          npx cdk diff --all 2>&1 | tee -a $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
```

### 4.4 Required GitHub Secrets

Ensure these secrets are configured in your repository:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key (existing) |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key (existing) |
| `AWS_REGION` | AWS region, e.g., `us-east-1` (existing) |
| `AWS_ACCOUNT_ID` | AWS account ID for ECR (existing) |

---

## Phase 5: Keycloak Configuration

### 5.1 Import Realm

After Keycloak is running, import the existing realm configuration:

```bash
# Connect to Keycloak container via ECS Exec
aws ecs execute-command \
  --cluster ProxySmartKeycloak-Cluster \
  --task <task-id> \
  --container keycloak \
  --interactive \
  --command "/bin/bash"

# Import realm (or use Keycloak Admin API)
/opt/keycloak/bin/kc.sh import --file /tmp/realm-export.json
```

### 5.2 Register MaxHealth as SMART App

In Keycloak Admin Console (`https://auth.maxhealth.tech`):

1. Go to **Clients** → **Create client**
2. Configure:
   - Client ID: `maxhealth-portal`
   - Client type: Public
   - Root URL: `https://maxhealth.tech`
   - Valid redirect URIs:
     - `https://maxhealth.tech/auth/callback`
     - `http://localhost:3000/auth/callback`
   - Web origins:
     - `https://maxhealth.tech`
     - `http://localhost:3000`

3. Enable PKCE (S256)
4. Add client scopes: `openid`, `profile`, `email`, `fhirUser`

---

## Phase 6: MaxHealth Integration

### 6.1 Environment Variables

Add to MaxHealth's Cloudflare Pages:

```env
NEXT_PUBLIC_PROXY_SMART_URL=https://auth.maxhealth.tech
NEXT_PUBLIC_CLIENT_ID=maxhealth-portal
```

### 6.2 OAuth Implementation

Create auth library (as outlined in DEVELOPMENT_PLAN.md):
- `ui/src/lib/auth.ts` - PKCE flow
- `ui/src/app/auth/callback/page.tsx` - Token exchange
- `functions/lib/middleware/auth.ts` - JWT validation

---

## Security Checklist

### Network & Infrastructure
- [ ] RDS in isolated subnet (no public access)
- [ ] RDS Multi-AZ enabled for production
- [ ] Security groups: minimal ingress rules
- [ ] VPC Flow Logs enabled
- [ ] NAT Gateway HA (2 gateways for production)

### Authentication & Secrets
- [ ] Secrets in AWS Secrets Manager (not env vars)
- [ ] Separate Keycloak admin credentials from DB credentials
- [ ] SSL/TLS 1.3 enforced on ALB
- [ ] IAM roles with least privilege

### Application Security
- [ ] WAF with OWASP managed rules on ALB
- [ ] Container image scanning in ECR
- [ ] Build custom Keycloak image (don't use public registry in production)

### Monitoring & Backup
- [ ] CloudWatch alarms for latency, 5xx errors, unhealthy hosts
- [ ] CloudWatch alarms for failed OAuth attempts
- [ ] Database encryption at rest
- [ ] Deletion protection on RDS
- [ ] Regular backups (7-day retention)
- [ ] Automated Keycloak realm export to S3

---

## Cost Optimization

### Immediate Savings
- Use `t4g` instances (ARM) - 20% cheaper than `t3`
- Single NAT Gateway (vs 2 for HA) - saves ~$35/mo
- Fargate Spot for non-production - 70% discount
- Reserved capacity for Fargate (1-year) - 30-50% savings

### Future Optimizations
- Aurora Serverless v2 (if traffic is spiky)
- CloudFront caching for static assets
- Graviton3 when available for Fargate

---

## Rollback Plan

1. **CDK rollback**: `cdk destroy` removes all resources
2. **Database**: Point-in-time recovery (last 7 days)
3. **Keycloak realm**: Automated daily export to S3 (see backup Lambda below)
4. **MaxHealth**: Keep email auth working during transition

### Keycloak Backup Lambda

Create a scheduled Lambda to export Keycloak realm configuration:

```typescript
// infra/lib/backup-stack.ts
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';

// S3 bucket for backups
const backupBucket = new s3.Bucket(this, 'BackupBucket', {
  bucketName: 'proxy-smart-backups',
  versioned: true,
  lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
});

// Lambda to export Keycloak realm
const backupLambda = new lambda.Function(this, 'RealmBackupLambda', {
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    // Call Keycloak Admin API to export realm
    // Upload to S3 with timestamp
  `),
  environment: {
    KEYCLOAK_URL: 'https://auth.maxhealth.tech',
    BACKUP_BUCKET: backupBucket.bucketName,
  },
});

// Daily schedule
new events.Rule(this, 'DailyBackupRule', {
  schedule: events.Schedule.cron({ hour: '3', minute: '0' }),
  targets: [new targets.LambdaFunction(backupLambda)],
});
```

---

## Phase Overview

| Phase | Tasks | Dependencies |
|-------|-------|-------------|
| 1. AWS Setup | Activate credits, create account, setup DNS | None |
| 2. CDK Init | Initialize project, install dependencies | Phase 1 |
| 3. Infrastructure | VPC, RDS, Keycloak, Backend stacks | Phase 2 |
| 4. CI/CD | GitHub Actions, ECR, automated deployments | Phase 3 |
| 5. Keycloak | Import realm, configure clients | Phase 4 |
| 6. Integration | MaxHealth OAuth, testing | Phase 5 |
| 7. Load Testing | Performance baseline, stress testing | Phase 6 |

---

## Phase 7: Load Testing

Before production launch, establish performance baselines:

### 7.1 Install k6 or Artillery

```bash
# Using k6
brew install k6

# Or Artillery
npm install -g artillery
```

### 7.2 OAuth Flow Load Test

```javascript
// load-tests/oauth-flow.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Steady state
    { duration: '2m', target: 100 },  // Spike
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.01'],    // <1% errors
  },
};

export default function () {
  // Test token endpoint
  const res = http.get('https://auth.maxhealth.tech/health/ready');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### 7.3 Success Criteria

- Token endpoint: p95 latency < 500ms
- Authorization endpoint: p95 latency < 1s
- Error rate: < 0.1%
- Concurrent users: 100+ without degradation

---

## Next Steps

1. **Apply for AWS Activate** - First priority
2. **Decide domain**: `auth.maxhealth.tech` ✓?
3. **Start CDK project** in Proxy Smart repo
4. **Deploy VPC stack first** (foundation)
5. **Set up container scanning** in ECR before first deployment

---

## References

- [AWS CDK ECS Patterns](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns-readme.html)
- [Keycloak on AWS](https://aws.amazon.com/blogs/opensource/deploying-keycloak-on-amazon-ecs/)
- [AWS Activate for Startups](https://aws.amazon.com/activate/)
- [SMART on FHIR App Launch](https://hl7.org/fhir/smart-app-launch/)
