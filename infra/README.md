# Proxy Smart - AWS Infrastructure

AWS CDK infrastructure for deploying Proxy Smart to AWS.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           AWS Cloud                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        VPC (10.0.0.0/16)                    ││
│  │  ┌─────────────────┐  ┌─────────────────┐                   ││
│  │  │  Public Subnet  │  │  Public Subnet  │                   ││
│  │  │   (10.0.0.0/24) │  │  (10.0.1.0/24)  │                   ││
│  │  │   ┌─────────┐   │  │   ┌─────────┐   │                   ││
│  │  │   │   ALB   │   │  │   │   ALB   │   │                   ││
│  │  │   │(Keycloak)│   │  │   │(Backend)│   │                   ││
│  │  │   └────┬────┘   │  │   └────┬────┘   │                   ││
│  │  └────────┼────────┘  └────────┼────────┘                   ││
│  │           │                    │                            ││
│  │  ┌────────┼────────┐  ┌────────┼────────┐                   ││
│  │  │ Private Subnet  │  │ Private Subnet  │                   ││
│  │  │  (10.0.2.0/24)  │  │  (10.0.3.0/24)  │                   ││
│  │  │   ┌─────────┐   │  │   ┌─────────┐   │                   ││
│  │  │   │   ECS   │   │  │   │   ECS   │   │                   ││
│  │  │   │Keycloak │   │  │   │ Backend │   │                   ││
│  │  │   └────┬────┘   │  │   └─────────┘   │                   ││
│  │  └────────┼────────┘  └─────────────────┘                   ││
│  │           │                                                  ││
│  │  ┌────────┼────────────────────────────┐                    ││
│  │  │      Isolated Subnet                │                    ││
│  │  │       (10.0.4.0/24)                 │                    ││
│  │  │   ┌───────────────────────────┐     │                    ││
│  │  │   │   RDS PostgreSQL 16       │     │                    ││
│  │  │   │   (Multi-AZ, Encrypted)   │     │                    ││
│  │  │   └───────────────────────────┘     │                    ││
│  │  └─────────────────────────────────────┘                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   WAF v2     │  │   Secrets    │  │  CloudWatch  │          │
│  │ (OWASP Rules)│  │   Manager    │  │   Alarms     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Stacks

| Stack | Description |
|-------|-------------|
| `ProxySmartVpc` | VPC with public, private, and isolated subnets |
| `ProxySmartDatabase` | RDS PostgreSQL 16 with Multi-AZ |
| `ProxySmartKeycloak` | Keycloak 26 on ECS Fargate with WAF |
| `ProxySmartBackend` | Backend API on ECS Fargate with WAF |
| `ProxySmartBackup` | S3 + Lambda for Keycloak realm backups |

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Route 53 Hosted Zone** for your domain
3. **CDK bootstrapped** in your AWS account/region

## Quick Start

```bash
# From repository root

# 1. Install dependencies
cd infra && bun install && cd ..

# 2. Bootstrap CDK (first time only)
bun run infra:bootstrap

# 3. Configure your hosted zone
# Find your hosted zone ID in Route 53 console

# 4. Deploy to alpha
bun run infra:deploy:alpha -- \
  -c hostedZoneId=Z0123456789ABCDEFGHIJ \
  -c hostedZoneName=maxhealth.tech \
  -c keycloakDomain=auth.alpha.maxhealth.tech \
  -c backendDomain=api.alpha.maxhealth.tech
```

## Configuration

All configuration is passed via CDK context (`-c` flags):

| Context Key | Default | Description |
|-------------|---------|-------------|
| `hostedZoneId` | (required) | Route 53 hosted zone ID |
| `hostedZoneName` | `maxhealth.tech` | Domain name of hosted zone |
| `keycloakDomain` | `auth.maxhealth.tech` | Keycloak hostname |
| `backendDomain` | `api.auth.maxhealth.tech` | Backend API hostname |
| `fhirServerBase` | (optional) | FHIR server URL to proxy |
| `natGateways` | `1` | Number of NAT gateways (use 2+ for production) |
| `multiAzDatabase` | `true` | Enable Multi-AZ RDS |

## Scripts

```bash
# From repository root
bun run infra:synth           # Synthesize CloudFormation templates
bun run infra:diff            # Preview changes before deploy
bun run infra:deploy          # Deploy all stacks
bun run infra:deploy:alpha    # Deploy with alpha environment
bun run infra:deploy:beta     # Deploy with beta environment  
bun run infra:deploy:production # Deploy with production environment
bun run infra:destroy         # Destroy all stacks (use with caution!)
bun run infra:bootstrap       # Bootstrap CDK in AWS account
```

## Security Features

- **WAF v2** with AWS Managed Rules (OWASP CommonRuleSet, KnownBadInputs)
- **TLS 1.3** on all ALBs
- **Secrets Manager** for all credentials
- **Separate Keycloak admin credentials** (not sharing DB credentials)
- **VPC Flow Logs** for network audit
- **Encryption at rest** for RDS
- **Security groups** with minimal access (CIDR-based for DB)

## Monitoring

CloudWatch alarms are configured for:
- Token endpoint latency > 2 seconds
- Unhealthy hosts in target groups
- HTTP 5xx error rate

## Post-Deployment

### 1. Get Keycloak Admin Credentials

```bash
aws secretsmanager get-secret-value \
  --secret-id proxy-smart/keycloak-admin \
  --query SecretString --output text | jq
```

### 2. Import Realm Configuration

After Keycloak is running, import the realm from `keycloak/realm-export.json`:

```bash
# ECS Exec into Keycloak container
aws ecs execute-command \
  --cluster proxy-smart-keycloak \
  --task <task-id> \
  --container keycloak \
  --interactive \
  --command "/bin/bash"
```

### 3. Update Backend Configuration

Set the Keycloak admin client secret in Secrets Manager for backend to manage OAuth clients.

## Cost Optimization

For development/alpha environments:
- Use 1 NAT gateway: `-c natGateways=1`
- Disable Multi-AZ: `-c multiAzDatabase=false`
- Use smaller instance types (configured in stack code)

For production:
- Use 2+ NAT gateways for HA
- Enable Multi-AZ (default)
- Consider reserved instances for cost savings

## Troubleshooting

### CDK Bootstrap Fails
```bash
# Ensure AWS credentials are configured
aws sts get-caller-identity

# Bootstrap with explicit account/region
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

### Stack Deployment Fails
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name ProxySmartKeycloak \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

### ECS Tasks Not Starting
```bash
# Check ECS service events
aws ecs describe-services \
  --cluster proxy-smart-keycloak \
  --services keycloak \
  --query 'services[0].events[:5]'

# Check CloudWatch logs
aws logs tail /ecs/keycloak --follow
```
