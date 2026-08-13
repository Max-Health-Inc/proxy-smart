#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import {
  VpcStack,
  DatabaseStack,
  KeycloakStack,
  BackendStack,
  FhirStack,
  PacsStack,
  PACS_INTERNAL_DICOMWEB_URL,
} from '../lib/index.js';

const app = new cdk.App();

/**
 * The regions this product deploys to. Tenants are PINNED to the stack holding their data, so a
 * region is a deliberate choice per deployment, not somewhere a deploy can drift to.
 */
const DEPLOY_REGIONS = ['us-east-1', 'eu-central-1'] as const;

/**
 * The target region — from `-c region=...`, NOT from the environment.
 *
 * `CDK_DEFAULT_REGION` looks like the obvious source and is a trap: the CDK CLI fills it in from
 * the ambient AWS config, so `cdk deploy` with no region in mind silently targets whatever
 * `~/.aws/config` happens to say. That is how this repo ended up with resolved availability zones
 * for a region nobody chose. Requiring context makes the region appear in the command that deployed
 * it, and the env var is then only cross-checked — a mismatch means you are authenticated against
 * one region and deploying to another, which is worth stopping for.
 */
const region = app.node.tryGetContext('region') as string | undefined;
if (!region) {
  throw new Error(
    `Missing -c region=<${DEPLOY_REGIONS.join('|')}>. ` +
      'Pass the region explicitly: cdk deploy -c region=us-east-1',
  );
}
if (!DEPLOY_REGIONS.includes(region as (typeof DEPLOY_REGIONS)[number])) {
  throw new Error(`region "${region}" is not one of: ${DEPLOY_REGIONS.join(', ')}`);
}

const ambientRegion = process.env.CDK_DEFAULT_REGION;
if (ambientRegion && ambientRegion !== region) {
  throw new Error(
    `-c region=${region} but the AWS environment resolves to ${ambientRegion}. ` +
      'Deploying across that mismatch is almost never intended; align them or unset the ambient one.',
  );
}

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region,
};

// Application configuration
// These can be overridden via CDK context: cdk deploy -c keycloakDomain=auth.example.com
const config = {
  keycloakDomain: app.node.tryGetContext('keycloakDomain') || 'auth.proxy-smart.com',
  backendDomain: app.node.tryGetContext('backendDomain') || 'api.proxy-smart.com',
  hostedZoneId: app.node.tryGetContext('hostedZoneId') || 'Z023389060QW09IU3L29',
  hostedZoneName: app.node.tryGetContext('hostedZoneName') || 'proxy-smart.com',
  // Custom Keycloak image URI (ECR) — includes proxy-smart login theme + pre-built config.
  // Set via CI: cdk deploy -c keycloakImageUri=579201838740.dkr.ecr.eu-central-1.amazonaws.com/proxy-smart-keycloak:latest
  // Omit to fall back to the stock quay.io/keycloak image (theme not applied).
  keycloakImageUri: app.node.tryGetContext('keycloakImageUri') as string | undefined,
  // FHIR server (optional override — defaults to internal service discovery)
  fhirServerBase: app.node.tryGetContext('fhirServerBase'),
  // Door management (optional) - enable per provider
  kisiEnabled: app.node.tryGetContext('kisiEnabled') === 'true',
  kisiBaseUrl: app.node.tryGetContext('kisiBaseUrl'),
  unifiAccessEnabled: app.node.tryGetContext('unifiAccessEnabled') === 'true',
  // Consent enforcement. Deliberately defaults ON here, inverting the backend's
  // own default: config.ts falls back to CONSENT_ENABLED=false / audit-only so a
  // developer running the stack locally is not blocked by consent they have no
  // way to grant. That default is wrong for a deployment holding real records —
  // audit-only logs the denial and then serves the data anyway
  // (backend/src/routes/fhir.ts), so an unset variable fails open and silently.
  // Overridable for a stage that genuinely needs to observe before enforcing:
  //   cdk deploy -c consentMode=audit-only
  consentEnabled: app.node.tryGetContext('consentEnabled') !== 'false',
  consentMode: (app.node.tryGetContext('consentMode') || 'enforce') as 'enforce' | 'audit-only' | 'disabled',
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
  imageUri: config.keycloakImageUri,
});
keycloakStack.addDependency(databaseStack);

// 4. Backend Stack
const backendStack = new BackendStack(app, 'ProxySmartBackend', {
  env,
  description: 'Proxy Smart - Backend API on ECS Fargate',
  vpc: vpcStack.vpc,
  // Internal for server-to-server (Cloud Map, registered by KeycloakStack), so
  // admin + token calls never traverse the public ALB and its WAF.
  keycloakUrl: 'http://keycloak.proxy-smart.internal:8080',
  keycloakPublicUrl: `https://${config.keycloakDomain}`,
  domainName: config.backendDomain,
  apexDomain: config.hostedZoneName,
  hostedZone,
  // Shared RDS for the backend's admin-config + mTLS stores (dedicated
  // proxy_smart database — see BackendStackProps.databaseName).
  database: databaseStack.database,
  dbSecret: databaseStack.secret,
  // FHIR URL is resolved after FHIR stack deploys — use internal service discovery
  fhirServerBase: config.fhirServerBase || 'http://hapi-fhir.proxy-smart.internal:8080/fhir',
  kisiEnabled: config.kisiEnabled,
  kisiBaseUrl: config.kisiBaseUrl,
  unifiAccessEnabled: config.unifiAccessEnabled,
  consentEnabled: config.consentEnabled,
  consentMode: config.consentMode,
  // Literal, not pacsStack.internalUrl — a Cloud Map name, so using the constant
  // avoids a cross-stack dependency in the wrong direction.
  dicomWebBaseUrl: PACS_INTERNAL_DICOMWEB_URL,
});
backendStack.addDependency(keycloakStack);
backendStack.addDependency(databaseStack);

// 5. FHIR Stack (internal only — no public ALB, uses Cloud Map service discovery)
const fhirStack = new FhirStack(app, 'ProxySmartFhir', {
  env,
  description: 'Proxy Smart - HAPI FHIR R4 server (internal, VPC-only access via Cloud Map)',
  vpc: vpcStack.vpc,
  cluster: backendStack.cluster,
});
fhirStack.addDependency(backendStack);

// 6. PACS Stack (internal only — Orthanc index on the shared RDS, pixel data in S3)
const pacsStack = new PacsStack(app, 'ProxySmartPacs', {
  env,
  description: 'Proxy Smart - Orthanc PACS (internal, DICOMweb via Cloud Map, S3 storage)',
  vpc: vpcStack.vpc,
  cluster: backendStack.cluster,
  // Shares the Keycloak/backend instance rather than adding a third: the index is
  // small, and this one is already Multi-AZ. Needs `CREATE DATABASE orthanc;` once
  // — see PacsStackProps.databaseName.
  database: databaseStack.database,
  dbSecret: databaseStack.secret,
  namespace: fhirStack.namespace,
});
pacsStack.addDependency(fhirStack);
pacsStack.addDependency(databaseStack);

// 7. Backup Stack (optional - enable when Keycloak is running)
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
