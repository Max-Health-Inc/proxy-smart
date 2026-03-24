#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { 
  VpcStack, 
  DatabaseStack, 
  KeycloakStack, 
  BackendStack,
  BackupStack,
} from '../lib/index.js';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Application configuration
// These can be overridden via CDK context: cdk deploy -c keycloakDomain=auth.example.com
const config = {
  keycloakDomain: app.node.tryGetContext('keycloakDomain') || 'auth.maxhealth.tech',
  backendDomain: app.node.tryGetContext('backendDomain') || 'api.auth.maxhealth.tech',
  hostedZoneId: app.node.tryGetContext('hostedZoneId') || 'REPLACE_WITH_HOSTED_ZONE_ID',
  hostedZoneName: app.node.tryGetContext('hostedZoneName') || 'maxhealth.tech',
  // FHIR server (optional)
  fhirServerBase: app.node.tryGetContext('fhirServerBase'),
  // Door management (optional) - enable per provider
  kisiEnabled: app.node.tryGetContext('kisiEnabled') === 'true',
  kisiBaseUrl: app.node.tryGetContext('kisiBaseUrl'),
  unifiAccessEnabled: app.node.tryGetContext('unifiAccessEnabled') === 'true',
  // Production settings
  natGateways: app.node.tryGetContext('natGateways') ? parseInt(app.node.tryGetContext('natGateways')) : 1,
  multiAzDatabase: app.node.tryGetContext('multiAzDatabase') !== 'false',
};

// Validate required config
if (config.hostedZoneId === 'REPLACE_WITH_HOSTED_ZONE_ID') {
  console.warn('⚠️  WARNING: hostedZoneId not configured. Set via context: -c hostedZoneId=Z123...');
  console.warn('   Stacks will fail to deploy without a valid hosted zone.');
}

// Lookup existing hosted zone
// If deploying for the first time, you may need to create this manually or use a DnsStack
const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
  app,
  'HostedZone',
  {
    hostedZoneId: config.hostedZoneId,
    zoneName: config.hostedZoneName,
  }
);

// =============================================================================
// Stack Deployment Order:
// 1. VPC (foundation)
// 2. Database (depends on VPC)
// 3. Keycloak (depends on VPC, Database)
// 4. Backend (depends on VPC, Keycloak)
// 5. Backup (depends on Keycloak)
// =============================================================================

// 1. VPC Stack
const vpcStack = new VpcStack(app, 'ProxySmartVpc', { 
  env,
  description: 'Proxy Smart - VPC with public, private, and isolated subnets',
  natGateways: config.natGateways,
});

// 2. Database Stack
const databaseStack = new DatabaseStack(app, 'ProxySmartDatabase', {
  env,
  description: 'Proxy Smart - RDS PostgreSQL for Keycloak',
  vpc: vpcStack.vpc,
  multiAz: config.multiAzDatabase,
});
databaseStack.addDependency(vpcStack);

// 3. Keycloak Stack
const keycloakStack = new KeycloakStack(app, 'ProxySmartKeycloak', {
  env,
  description: 'Proxy Smart - Keycloak identity provider on ECS Fargate',
  vpc: vpcStack.vpc,
  database: databaseStack.database,
  dbSecret: databaseStack.secret,
  domainName: config.keycloakDomain,
  hostedZone,
});
keycloakStack.addDependency(databaseStack);

// 4. Backend Stack
const backendStack = new BackendStack(app, 'ProxySmartBackend', {
  env,
  description: 'Proxy Smart - Backend API on ECS Fargate',
  vpc: vpcStack.vpc,
  keycloakUrl: `https://${config.keycloakDomain}`,
  domainName: config.backendDomain,
  hostedZone,
  fhirServerBase: config.fhirServerBase,
  kisiEnabled: config.kisiEnabled,
  kisiBaseUrl: config.kisiBaseUrl,
  unifiAccessEnabled: config.unifiAccessEnabled,
});
backendStack.addDependency(keycloakStack);

// 5. Backup Stack (optional - enable when Keycloak is running)
// Uncomment after initial deployment:
/*
const backupStack = new BackupStack(app, 'ProxySmartBackup', {
  env,
  description: 'Proxy Smart - Automated Keycloak realm backup to S3',
  keycloakUrl: `https://${config.keycloakDomain}`,
  keycloakAdminSecretArn: keycloakStack.service.taskDefinition.taskRole.roleArn, // Use actual secret ARN
});
backupStack.addDependency(keycloakStack);
*/

// Add global tags to all resources
cdk.Tags.of(app).add('Project', 'proxy-smart');
cdk.Tags.of(app).add('ManagedBy', 'cdk');

app.synth();
