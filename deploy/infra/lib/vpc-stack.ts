import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';

/**
 * The VPC's CIDR, as a compile-time literal.
 *
 * Other stacks that need it MUST import this rather than reading
 * `vpc.vpcCidrBlock`. That attribute is a CloudFormation reference, so using it
 * makes the consuming stack depend on a new `Export` from ProxySmartVpc — and
 * the production deploy runs each stack with `--exclusively`, so the VPC stack
 * never deploys to publish it. The result is a rollback with:
 *
 *   No export named ProxySmartVpc:ExportsOutputFnGetAtt...CidrBlock... found
 *
 * A literal renders inline and needs no export, keeping the stacks independently
 * deployable. It is still declared once, here, next to the VPC that uses it.
 */
export const VPC_CIDR = '10.0.0.0/16';

export interface VpcStackProps extends cdk.StackProps {
  /**
   * Number of NAT Gateways. Use 2 for production HA.
   * @default 1
   */
  natGateways?: number;
}

/**
 * VPC Stack for Proxy Smart
 * 
 * Creates a VPC with:
 * - Public subnets (for ALBs)
 * - Private subnets with egress (for ECS tasks)
 * - Isolated subnets (for RDS)
 */
export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'ProxySmartVpc', {
      ipAddresses: ec2.IpAddresses.cidr(VPC_CIDR),
      maxAzs: 2,
      // Cost optimization: 1 NAT instead of 2
      // ⚠️ For production HA, set natGateways: 2 (one per AZ)
      natGateways: props?.natGateways ?? 1,
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
      // Enable VPC Flow Logs for security monitoring
      flowLogs: {
        'FlowLogCloudWatch': {
          trafficType: ec2.FlowLogTrafficType.ALL,
          destination: ec2.FlowLogDestination.toCloudWatchLogs(),
        },
      },
    });

    // Tag subnets for easy identification
    cdk.Tags.of(this.vpc).add('Application', 'proxy-smart');
    cdk.Tags.of(this.vpc).add('Environment', 'production');

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'ProxySmartVpcId',
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
    });
  }
}
