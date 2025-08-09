# Infrastructure as Code (IaC) Specifications
## Basketball League Management Platform

**Document ID:** IaC-BLMP-001  
**Version:** 1.0  
**Date:** January 8, 2025  
**Author:** Lead Solutions Architect  
**Status:** Draft  
**Classification:** Infrastructure Specification  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AWS CDK Stack Architecture](#2-aws-cdk-stack-architecture)
3. [Network Infrastructure](#3-network-infrastructure)
4. [Compute Infrastructure](#4-compute-infrastructure)
5. [Database Infrastructure](#5-database-infrastructure)
6. [Storage Infrastructure](#6-storage-infrastructure)
7. [Security Infrastructure](#7-security-infrastructure)
8. [Monitoring & Observability](#8-monitoring--observability)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Disaster Recovery](#10-disaster-recovery)

---

## 1. Executive Summary

This document provides Infrastructure as Code specifications for deploying the Basketball League Management Platform on AWS. The infrastructure is defined using AWS CDK (Cloud Development Kit) with TypeScript, ensuring version-controlled, repeatable, and auditable infrastructure deployments.

### 1.1 Infrastructure Goals
- **Scalability**: Auto-scale from 100 to 10,000+ concurrent users
- **Availability**: 99.9% uptime SLA with multi-AZ deployment
- **Security**: Defense-in-depth with encryption everywhere
- **Cost Optimization**: Pay-per-use with reserved capacity for baseline
- **Automation**: Fully automated deployments with zero manual steps

### 1.2 Technology Stack
- **IaC Tool**: AWS CDK v2 with TypeScript
- **Container Orchestration**: ECS Fargate
- **Serverless**: Lambda for event processing
- **Database**: RDS PostgreSQL Multi-AZ
- **Caching**: ElastiCache Redis
- **CDN**: CloudFront
- **Monitoring**: CloudWatch, X-Ray

---

## 2. AWS CDK Stack Architecture

### 2.1 Stack Organization

```typescript
// lib/basketball-league-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BasketballLeagueStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Network Stack
    const networkStack = new NetworkStack(this, 'NetworkStack', {
      env: props?.env,
    });

    // Security Stack
    const securityStack = new SecurityStack(this, 'SecurityStack', {
      vpc: networkStack.vpc,
      env: props?.env,
    });

    // Database Stack
    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      vpc: networkStack.vpc,
      securityGroup: securityStack.databaseSecurityGroup,
      env: props?.env,
    });

    // Compute Stack
    const computeStack = new ComputeStack(this, 'ComputeStack', {
      vpc: networkStack.vpc,
      database: databaseStack.database,
      env: props?.env,
    });

    // API Stack
    const apiStack = new ApiStack(this, 'ApiStack', {
      services: computeStack.services,
      env: props?.env,
    });

    // Frontend Stack
    const frontendStack = new FrontendStack(this, 'FrontendStack', {
      apiEndpoint: apiStack.apiEndpoint,
      env: props?.env,
    });

    // Monitoring Stack
    const monitoringStack = new MonitoringStack(this, 'MonitoringStack', {
      resources: {
        api: apiStack.api,
        services: computeStack.services,
        database: databaseStack.database,
      },
      env: props?.env,
    });
  }
}
```

### 2.2 Environment Configuration

```typescript
// bin/app.ts
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BasketballLeagueStack } from '../lib/basketball-league-stack';

const app = new cdk.App();

// Environment configurations
const environments = {
  dev: {
    account: process.env.CDK_DEPLOY_ACCOUNT || '123456789012',
    region: process.env.CDK_DEPLOY_REGION || 'us-west-2',
  },
  staging: {
    account: '123456789013',
    region: 'us-west-2',
  },
  prod: {
    account: '123456789014',
    region: 'us-west-2',
  },
};

// Deploy stacks for each environment
new BasketballLeagueStack(app, 'BasketballLeague-Dev', {
  env: environments.dev,
  stackName: 'basketball-league-dev',
  tags: {
    Environment: 'dev',
    Project: 'basketball-league',
    ManagedBy: 'cdk',
  },
});

new BasketballLeagueStack(app, 'BasketballLeague-Staging', {
  env: environments.staging,
  stackName: 'basketball-league-staging',
  tags: {
    Environment: 'staging',
    Project: 'basketball-league',
    ManagedBy: 'cdk',
  },
});

new BasketballLeagueStack(app, 'BasketballLeague-Prod', {
  env: environments.prod,
  stackName: 'basketball-league-prod',
  tags: {
    Environment: 'prod',
    Project: 'basketball-league',
    ManagedBy: 'cdk',
    CostCenter: 'engineering',
  },
});

app.synth();
```

---

## 3. Network Infrastructure

### 3.1 VPC Configuration

```typescript
// lib/stacks/network-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.NestedStack {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly databaseSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
    super(scope, id, props);

    // Create VPC with public, private, and isolated subnets
    this.vpc = new ec2.Vpc(this, 'BasketballLeagueVPC', {
      vpcName: 'basketball-league-vpc',
      maxAzs: 2, // Multi-AZ for high availability
      natGateways: 2, // One per AZ for redundancy
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24, // /24 = 256 IPs per subnet
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28, // /28 = 16 IPs per subnet
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs for network monitoring
    this.vpc.addFlowLog('VPCFlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    // VPC Endpoints for AWS services (cost optimization)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [
        { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    // Interface endpoints for other AWS services
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    this.vpc.addInterfaceEndpoint('ECREndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Export subnet references
    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;
    this.databaseSubnets = this.vpc.isolatedSubnets;

    // Output VPC details
    new cdk.CfnOutput(this, 'VPCId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'basketball-league-vpc-id',
    });
  }
}
```

### 3.2 Security Groups

```typescript
// lib/stacks/security-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface SecurityStackProps extends cdk.NestedStackProps {
  vpc: ec2.Vpc;
}

export class SecurityStack extends cdk.NestedStack {
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly databaseSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // ALB Security Group
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from anywhere'
    );

    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from anywhere (redirect to HTTPS)'
    );

    // ECS Security Group
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB'
    );

    // Database Security Group
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: false,
    });

    this.databaseSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from ECS tasks'
    );

    // Redis Security Group
    this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: false,
    });

    this.redisSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis from ECS tasks'
    );

    // Add tags for compliance
    cdk.Tags.of(this.albSecurityGroup).add('Name', 'basketball-league-alb-sg');
    cdk.Tags.of(this.ecsSecurityGroup).add('Name', 'basketball-league-ecs-sg');
    cdk.Tags.of(this.databaseSecurityGroup).add('Name', 'basketball-league-db-sg');
    cdk.Tags.of(this.redisSecurityGroup).add('Name', 'basketball-league-redis-sg');
  }
}
```

---

## 4. Compute Infrastructure

### 4.1 ECS Cluster Configuration

```typescript
// lib/stacks/compute-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class ComputeStack extends cdk.NestedStack {
  public readonly cluster: ecs.Cluster;
  public readonly services: Map<string, ecs.FargateService>;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'BasketballLeagueCluster', {
      clusterName: 'basketball-league-cluster',
      vpc: props.vpc,
      containerInsights: true, // Enable Container Insights for monitoring
      enableFargateCapacityProviders: true,
    });

    // ECR Repositories for services
    const repositories = this.createECRRepositories();

    // Task Execution Role
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Add permissions for Secrets Manager
    taskExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:*:*:secret:basketball-league/*'],
    }));

    // Task Role for application permissions
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add S3 permissions
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
      resources: ['arn:aws:s3:::basketball-league-*/*'],
    }));

    // Create services
    this.services = new Map();
    const serviceConfigs = this.getServiceConfigurations();

    for (const [serviceName, config] of Object.entries(serviceConfigs)) {
      const service = this.createFargateService(
        serviceName,
        config,
        repositories.get(serviceName)!,
        taskExecutionRole,
        taskRole,
        props
      );
      this.services.set(serviceName, service);
    }
  }

  private createECRRepositories(): Map<string, ecr.Repository> {
    const repos = new Map<string, ecr.Repository>();
    const services = [
      'auth-service',
      'user-service',
      'league-service',
      'game-service',
      'schedule-service',
      'stats-service',
      'communication-service',
      'payment-service',
    ];

    for (const service of services) {
      const repo = new ecr.Repository(this, `${service}-repo`, {
        repositoryName: `basketball-league/${service}`,
        imageScanOnPush: true,
        lifecycleRules: [
          {
            rulePriority: 1,
            description: 'Keep last 10 images',
            maxImageCount: 10,
          },
        ],
      });
      repos.set(service, repo);
    }

    return repos;
  }

  private getServiceConfigurations(): Record<string, ServiceConfig> {
    return {
      'auth-service': {
        cpu: 512,
        memory: 1024,
        desiredCount: 2,
        maxCapacity: 10,
        targetCPUUtilization: 70,
        healthCheckPath: '/health',
        priority: 10,
        pathPattern: '/api/auth/*',
      },
      'user-service': {
        cpu: 512,
        memory: 1024,
        desiredCount: 2,
        maxCapacity: 10,
        targetCPUUtilization: 70,
        healthCheckPath: '/health',
        priority: 20,
        pathPattern: '/api/users/*',
      },
      'league-service': {
        cpu: 1024,
        memory: 2048,
        desiredCount: 2,
        maxCapacity: 20,
        targetCPUUtilization: 60,
        healthCheckPath: '/health',
        priority: 30,
        pathPattern: '/api/leagues/*',
      },
      'game-service': {
        cpu: 1024,
        memory: 2048,
        desiredCount: 3,
        maxCapacity: 30,
        targetCPUUtilization: 50,
        healthCheckPath: '/health',
        priority: 40,
        pathPattern: '/api/games/*',
      },
      'stats-service': {
        cpu: 2048,
        memory: 4096,
        desiredCount: 2,
        maxCapacity: 10,
        targetCPUUtilization: 80,
        healthCheckPath: '/health',
        priority: 50,
        pathPattern: '/api/stats/*',
      },
    };
  }

  private createFargateService(
    serviceName: string,
    config: ServiceConfig,
    repository: ecr.Repository,
    executionRole: iam.Role,
    taskRole: iam.Role,
    props: ComputeStackProps
  ): ecs.FargateService {
    // Create log group
    const logGroup = new logs.LogGroup(this, `${serviceName}-logs`, {
      logGroupName: `/ecs/basketball-league/${serviceName}`,
      retention: logs.RetentionDays.SEVEN_DAYS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, `${serviceName}-task`, {
      family: `basketball-league-${serviceName}`,
      cpu: config.cpu,
      memoryLimitMiB: config.memory,
      executionRole,
      taskRole,
    });

    // Add container
    const container = taskDefinition.addContainer(`${serviceName}-container`, {
      containerName: serviceName,
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: serviceName,
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        SERVICE_NAME: serviceName,
        AWS_REGION: this.region,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          props.databaseSecret,
          'connection_string'
        ),
        REDIS_URL: ecs.Secret.fromSecretsManager(
          props.redisSecret,
          'connection_string'
        ),
      },
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:3000${config.healthCheckPath} || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Create service
    const service = new ecs.FargateService(this, `${serviceName}-service`, {
      serviceName: `basketball-league-${serviceName}`,
      cluster: this.cluster,
      taskDefinition,
      desiredCount: config.desiredCount,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.ecsSecurityGroup],
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 2,
          base: 0,
        },
        {
          capacityProvider: 'FARGATE',
          weight: 1,
          base: 1,
        },
      ],
      enableLogging: true,
      propagateTags: ecs.PropagatedTagSource.SERVICE,
      enableECSManagedTags: true,
    });

    // Auto-scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: config.desiredCount,
      maxCapacity: config.maxCapacity,
    });

    scaling.scaleOnCpuUtilization(`${serviceName}-cpu-scaling`, {
      targetUtilizationPercent: config.targetCPUUtilization,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    scaling.scaleOnMemoryUtilization(`${serviceName}-memory-scaling`, {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    return service;
  }
}

interface ServiceConfig {
  cpu: number;
  memory: number;
  desiredCount: number;
  maxCapacity: number;
  targetCPUUtilization: number;
  healthCheckPath: string;
  priority: number;
  pathPattern: string;
}
```

### 4.2 Lambda Functions

```typescript
// lib/constructs/lambda-functions.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class LambdaFunctions extends Construct {
  public readonly schedulingFunction: lambda.Function;
  public readonly notificationFunction: lambda.Function;
  public readonly analyticsFunction: lambda.Function;
  public readonly imageProcessingFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);

    // Shared Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // Scheduling Function (Complex algorithm processing)
    this.schedulingFunction = new lambdaNodejs.NodejsFunction(this, 'SchedulingFunction', {
      functionName: 'basketball-league-scheduling',
      entry: 'src/lambda/scheduling/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 3008, // High memory for complex calculations
      timeout: cdk.Duration.minutes(15),
      environment: {
        DATABASE_URL: props.databaseUrl,
        REDIS_URL: props.redisUrl,
      },
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      role: lambdaRole,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
    });

    // Notification Function (Email/SMS processing)
    this.notificationFunction = new lambdaNodejs.NodejsFunction(this, 'NotificationFunction', {
      functionName: 'basketball-league-notifications',
      entry: 'src/lambda/notifications/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        SENDGRID_API_KEY: props.sendgridApiKey,
        TWILIO_ACCOUNT_SID: props.twilioAccountSid,
        TWILIO_AUTH_TOKEN: props.twilioAuthToken,
      },
      role: lambdaRole,
      reservedConcurrentExecutions: 100, // Limit concurrent executions
    });

    // Set up SQS trigger for notification function
    const notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: 'basketball-league-notifications',
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'NotificationDLQ', {
          queueName: 'basketball-league-notifications-dlq',
        }),
        maxReceiveCount: 3,
      },
    });

    this.notificationFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(notificationQueue, {
        batchSize: 10,
        maxBatchingWindowMs: 5000,
      })
    );

    // Analytics Function (Statistics processing)
    this.analyticsFunction = new lambdaNodejs.NodejsFunction(this, 'AnalyticsFunction', {
      functionName: 'basketball-league-analytics',
      entry: 'src/lambda/analytics/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 2048,
      timeout: cdk.Duration.minutes(5),
      environment: {
        DATABASE_URL: props.databaseUrl,
        ELASTICSEARCH_URL: props.elasticsearchUrl,
      },
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      role: lambdaRole,
    });

    // Image Processing Function (Team logos, player photos)
    this.imageProcessingFunction = new lambdaNodejs.NodejsFunction(this, 'ImageProcessingFunction', {
      functionName: 'basketball-league-image-processing',
      entry: 'src/lambda/image-processing/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 2048,
      timeout: cdk.Duration.seconds(60),
      environment: {
        S3_BUCKET: props.s3Bucket,
        CLOUDFRONT_DISTRIBUTION: props.cloudfrontDistribution,
      },
      role: lambdaRole,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'SharpLayer',
          'arn:aws:lambda:us-west-2:123456789012:layer:sharp:1'
        ),
      ],
    });

    // Grant S3 permissions to image processing function
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [`arn:aws:s3:::${props.s3Bucket}/*`],
    }));

    // Add CloudWatch Insights queries for monitoring
    this.createCloudWatchInsightsQueries();
  }

  private createCloudWatchInsightsQueries(): void {
    // Performance monitoring query
    new logs.QueryDefinition(this, 'LambdaPerformanceQuery', {
      queryDefinitionName: 'Basketball-League-Lambda-Performance',
      queryString: `
        fields @timestamp, @duration, @type
        | filter @type = "REPORT"
        | stats avg(@duration) as avgDuration,
                max(@duration) as maxDuration,
                min(@duration) as minDuration,
                count() as invocations
        by bin(5m)
      `,
      logGroups: [
        `/aws/lambda/basketball-league-scheduling`,
        `/aws/lambda/basketball-league-notifications`,
        `/aws/lambda/basketball-league-analytics`,
      ],
    });

    // Error monitoring query
    new logs.QueryDefinition(this, 'LambdaErrorQuery', {
      queryDefinitionName: 'Basketball-League-Lambda-Errors',
      queryString: `
        fields @timestamp, @message
        | filter @message like /ERROR/
        | stats count() as errorCount by bin(5m)
      `,
      logGroups: [
        `/aws/lambda/basketball-league-scheduling`,
        `/aws/lambda/basketball-league-notifications`,
        `/aws/lambda/basketball-league-analytics`,
      ],
    });
  }
}
```

---

## 5. Database Infrastructure

### 5.1 RDS PostgreSQL Configuration

```typescript
// lib/stacks/database-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.NestedStack {
  public readonly database: rds.DatabaseCluster;
  public readonly databaseSecret: secretsmanager.Secret;
  public readonly readEndpoint: string;
  public readonly writeEndpoint: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // KMS key for encryption
    const encryptionKey = new kms.Key(this, 'DatabaseEncryptionKey', {
      description: 'KMS key for RDS encryption',
      enableKeyRotation: true,
      alias: 'alias/basketball-league-rds',
    });

    // Database credentials secret
    this.databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: 'basketball-league/rds/credentials',
      description: 'RDS database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'dbadmin',
        }),
        generateStringKey: 'password',
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        passwordLength: 32,
      },
    });

    // Parameter group for PostgreSQL optimization
    const parameterGroup = new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_2,
      }),
      description: 'Custom parameter group for basketball league database',
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements,pg_hint_plan,pgaudit',
        'log_statement': 'all',
        'log_duration': 'on',
        'log_min_duration_statement': '1000', // Log queries taking > 1 second
        'max_connections': '1000',
        'random_page_cost': '1.1',
        'effective_cache_size': '48GB',
        'work_mem': '32MB',
        'maintenance_work_mem': '2GB',
        'checkpoint_segments': '32',
        'checkpoint_completion_target': '0.9',
        'wal_buffers': '16MB',
        'default_statistics_target': '100',
      },
    });

    // Aurora PostgreSQL cluster
    this.database = new rds.DatabaseCluster(this, 'Database', {
      clusterIdentifier: 'basketball-league-cluster',
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_2,
      }),
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
      instances: 2, // One writer, one reader
      instanceProps: {
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [props.databaseSecurityGroup],
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.R6G,
          ec2.InstanceSize.XLARGE
        ),
        parameterGroup,
        autoMinorVersionUpgrade: true,
        enablePerformanceInsights: true,
        performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      },
      storageEncrypted: true,
      storageEncryptionKey: encryptionKey,
      backup: {
        retention: cdk.Duration.days(30),
        preferredWindow: '03:00-04:00', // 3-4 AM UTC (8-9 PM Phoenix time)
      },
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deletionProtection: true,
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.THIRTY_DAYS,
      defaultDatabaseName: 'basketball_league',
      copyTagsToSnapshot: true,
      serverlessV2ScalingConfiguration: {
        minCapacity: 0.5,
        maxCapacity: 4,
      },
    });

    // Create read replica for analytics workloads
    const readReplica = new rds.DatabaseInstanceReadReplica(this, 'ReadReplica', {
      sourceDatabaseInstance: this.database.instanceIdentifiers[0],
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.R6G,
        ec2.InstanceSize.LARGE
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.databaseSecurityGroup],
      storageEncrypted: true,
      storageEncryptionKey: encryptionKey,
      autoMinorVersionUpgrade: true,
      deleteAutomatedBackups: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // CloudWatch Alarms
    this.createDatabaseAlarms();

    // Outputs
    this.readEndpoint = this.database.clusterReadEndpoint.hostname;
    this.writeEndpoint = this.database.clusterEndpoint.hostname;

    new cdk.CfnOutput(this, 'DatabaseWriteEndpoint', {
      value: this.writeEndpoint,
      description: 'Database write endpoint',
      exportName: 'basketball-league-db-write-endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseReadEndpoint', {
      value: this.readEndpoint,
      description: 'Database read endpoint',
      exportName: 'basketball-league-db-read-endpoint',
    });
  }

  private createDatabaseAlarms(): void {
    // CPU Utilization Alarm
    new cloudwatch.Alarm(this, 'DatabaseCPUAlarm', {
      metric: this.database.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Database CPU utilization is too high',
    });

    // Database Connections Alarm
    new cloudwatch.Alarm(this, 'DatabaseConnectionsAlarm', {
      metric: this.database.metricDatabaseConnections(),
      threshold: 900, // 90% of max_connections (1000)
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Database connections approaching limit',
    });

    // Deadlock Alarm
    new cloudwatch.Alarm(this, 'DatabaseDeadlockAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'Deadlocks',
        dimensionsMap: {
          DBClusterIdentifier: this.database.clusterIdentifier,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Database deadlock detected',
    });
  }
}
```

### 5.2 ElastiCache Redis Configuration

```typescript
// lib/constructs/redis-cache.ts
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class RedisCache extends Construct {
  public readonly cluster: elasticache.CfnReplicationGroup;
  public readonly connectionSecret: secretsmanager.Secret;
  public readonly primaryEndpoint: string;
  public readonly readerEndpoint: string;

  constructor(scope: Construct, id: string, props: RedisCacheProps) {
    super(scope, id);

    // Create subnet group for Redis
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Basketball League Redis cache',
      subnetIds: props.vpc.isolatedSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: 'basketball-league-redis-subnet-group',
    });

    // Parameter group for Redis configuration
    const parameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
      cacheParameterGroupFamily: 'redis7',
      description: 'Custom parameters for Basketball League Redis',
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'timeout': '300',
        'tcp-keepalive': '60',
        'tcp-backlog': '511',
        'databases': '16',
        'notify-keyspace-events': 'Ex',
      },
    });

    // Redis auth token (password)
    const authToken = new secretsmanager.Secret(this, 'RedisAuthToken', {
      secretName: 'basketball-league/redis/auth-token',
      description: 'Redis authentication token',
      generateSecretString: {
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        passwordLength: 32,
      },
    });

    // Redis Replication Group (cluster mode disabled for simplicity)
    this.cluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupId: 'basketball-league-redis',
      replicationGroupDescription: 'Redis cache for Basketball League platform',
      engine: 'redis',
      engineVersion: '7.0',
      cacheNodeType: 'cache.r6g.xlarge',
      numCacheClusters: 2, // Primary + 1 read replica
      automaticFailoverEnabled: true,
      multiAzEnabled: true,
      cacheSubnetGroupName: subnetGroup.ref,
      cacheParameterGroupName: parameterGroup.ref,
      securityGroupIds: [props.redisSecurityGroup.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      authToken: authToken.secretValue.unsafeUnwrap(),
      snapshotRetentionLimit: 7,
      snapshotWindow: '03:00-05:00',
      preferredMaintenanceWindow: 'sun:05:00-sun:07:00',
      notificationTopicArn: props.snsTopicArn,
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          logFormat: 'json',
          logGroup: '/aws/elasticache/basketball-league',
          logType: 'slow-log',
        },
      ],
      tags: [
        {
          key: 'Name',
          value: 'basketball-league-redis',
        },
        {
          key: 'Environment',
          value: props.environment,
        },
      ],
    });

    // Store connection information in Secrets Manager
    this.connectionSecret = new secretsmanager.Secret(this, 'RedisConnectionSecret', {
      secretName: 'basketball-league/redis/connection',
      description: 'Redis connection information',
      secretObjectValue: {
        host: cdk.SecretValue.unsafePlainText(
          this.cluster.attrPrimaryEndPointAddress
        ),
        port: cdk.SecretValue.unsafePlainText('6379'),
        authToken: authToken.secretValue,
      },
    });

    // CloudWatch Alarms
    this.createRedisAlarms();

    // Outputs
    this.primaryEndpoint = this.cluster.attrPrimaryEndPointAddress;
    this.readerEndpoint = this.cluster.attrReaderEndPointAddress;
  }

  private createRedisAlarms(): void {
    // CPU Utilization Alarm
    new cloudwatch.Alarm(this, 'RedisCPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 75,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Redis CPU utilization is too high',
    });

    // Memory Utilization Alarm
    new cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 85,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Redis memory utilization is too high',
    });

    // Evictions Alarm
    new cloudwatch.Alarm(this, 'RedisEvictionsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'Evictions',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Redis is evicting keys due to memory pressure',
    });
  }
}
```

---

## 6. Storage Infrastructure

### 6.1 S3 Buckets Configuration

```typescript
// lib/constructs/storage.ts
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class Storage extends Construct {
  public readonly mediaBucket: s3.Bucket;
  public readonly backupBucket: s3.Bucket;
  public readonly logsBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);

    // Media storage bucket (team logos, player photos, etc.)
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `basketball-league-media-${props.environment}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
        {
          id: 'transition-to-ia',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: props.allowedOrigins,
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Backup bucket for database backups
    this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `basketball-league-backups-${props.environment}`,
      encryption: s3.BucketEncryption.KMS_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: 'delete-old-backups',
          expiration: cdk.Duration.days(90),
        },
        {
          id: 'transition-to-glacier',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER_FLEXIBLE_RETRIEVAL,
              transitionAfter: cdk.Duration.days(7),
            },
          ],
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Logs bucket for application and access logs
    this.logsBucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: `basketball-league-logs-${props.environment}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'delete-old-logs',
          expiration: cdk.Duration.days(30),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // CloudFront distribution for media delivery
    this.distribution = this.createCloudFrontDistribution(props);
  }

  private createCloudFrontDistribution(props: StorageProps): cloudfront.Distribution {
    // Origin Access Identity for S3
    const oai = new cloudfront.OriginAccessIdentity(this, 'MediaOAI', {
      comment: 'OAI for Basketball League media bucket',
    });

    // Grant read permissions to CloudFront
    this.mediaBucket.grantRead(oai);

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'MediaDistribution', {
      comment: 'Basketball League media distribution',
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(this.mediaBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: new cloudfront.CachePolicy(this, 'MediaCachePolicy', {
          cachePolicyName: 'basketball-league-media-cache',
          defaultTtl: cdk.Duration.days(7),
          maxTtl: cdk.Duration.days(365),
          minTtl: cdk.Duration.seconds(0),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
          headerBehavior: cloudfront.CacheHeaderBehavior.none(),
          cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        }),
        responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
          responseHeadersPolicyName: 'basketball-league-security-headers',
          securityHeadersBehavior: {
            contentTypeOptions: { override: true },
            frameOptions: {
              frameOption: cloudfront.HeadersFrameOption.DENY,
              override: true,
            },
            referrerPolicy: {
              referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
              override: true,
            },
            strictTransportSecurity: {
              accessControlMaxAge: cdk.Duration.days(365),
              includeSubdomains: true,
              override: true,
            },
            xssProtection: {
              protection: true,
              modeBlock: true,
              override: true,
            },
          },
          customHeadersBehavior: {
            customHeaders: [
              {
                header: 'Cache-Control',
                value: 'public, max-age=604800, immutable',
                override: false,
              },
            ],
          },
        }),
      },
      domainNames: props.domainNames,
      certificate: props.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      logBucket: this.logsBucket,
      logFilePrefix: 'cloudfront/',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
      enabled: true,
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    return distribution;
  }
}
```

---

## 7. Security Infrastructure

### 7.1 WAF Configuration

```typescript
// lib/constructs/waf.ts
import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class WebApplicationFirewall extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafProps) {
    super(scope, id);

    // IP rate limiting rule
    const rateLimitRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: 2000, // 2000 requests per 5 minutes
          aggregateKeyType: 'IP',
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 429,
            customResponseBodyKey: 'rate-limit-exceeded',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule',
      },
    };

    // Geo-blocking rule (optional - for US-only access)
    const geoBlockingRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'GeoBlockingRule',
      priority: 2,
      statement: {
        notStatement: {
          statement: {
            geoMatchStatement: {
              countryCodes: ['US'],
            },
          },
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 403,
            customResponseBodyKey: 'geo-blocked',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'GeoBlockingRule',
      },
    };

    // SQL injection protection
    const sqlInjectionRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'SQLInjectionRule',
      priority: 3,
      statement: {
        orStatement: {
          statements: [
            {
              sqliMatchStatement: {
                fieldToMatch: {
                  body: {
                    oversizeHandling: 'MATCH',
                  },
                },
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                  {
                    priority: 1,
                    type: 'HTML_ENTITY_DECODE',
                  },
                ],
              },
            },
            {
              sqliMatchStatement: {
                fieldToMatch: {
                  queryString: {},
                },
                textTransformations: [
                  {
                    priority: 0,
                    type: 'URL_DECODE',
                  },
                ],
              },
            },
          ],
        },
      },
      action: {
        block: {},
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'SQLInjectionRule',
      },
    };

    // XSS protection
    const xssRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'XSSRule',
      priority: 4,
      statement: {
        xssMatchStatement: {
          fieldToMatch: {
            body: {
              oversizeHandling: 'MATCH',
            },
          },
          textTransformations: [
            {
              priority: 0,
              type: 'URL_DECODE',
            },
            {
              priority: 1,
              type: 'HTML_ENTITY_DECODE',
            },
          ],
        },
      },
      action: {
        block: {},
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'XSSRule',
      },
    };

    // AWS Managed Rules
    const awsManagedRulesCommonRuleSet: wafv2.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 10,
      overrideAction: {
        none: {},
      },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          excludedRules: [
            { name: 'SizeRestrictions_BODY' }, // Exclude for file uploads
          ],
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesCommonRuleSetMetric',
      },
    };

    // Known bad inputs rule set
    const awsManagedRulesKnownBadInputsRuleSet: wafv2.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 11,
      overrideAction: {
        none: {},
      },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric',
      },
    };

    // Custom response bodies
    const customResponseBodies = {
      'rate-limit-exceeded': {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
        }),
      },
      'geo-blocked': {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Access denied from your location.',
        }),
      },
    };

    // Create Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name: `basketball-league-waf-${props.environment}`,
      scope: 'REGIONAL', // For ALB
      defaultAction: {
        allow: {},
      },
      rules: [
        rateLimitRule,
        // geoBlockingRule, // Uncomment if geo-blocking is needed
        sqlInjectionRule,
        xssRule,
        awsManagedRulesCommonRuleSet,
        awsManagedRulesKnownBadInputsRuleSet,
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'BasketballLeagueWAF',
      },
      customResponseBodies,
      tags: [
        {
          key: 'Name',
          value: `basketball-league-waf-${props.environment}`,
        },
        {
          key: 'Environment',
          value: props.environment,
        },
      ],
    });

    // Associate WAF with ALB
    if (props.albArn) {
      new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
        resourceArn: props.albArn,
        webAclArn: this.webAcl.attrArn,
      });
    }
  }
}
```

---

## 8. Monitoring & Observability

### 8.1 CloudWatch Dashboards

```typescript
// lib/constructs/monitoring.ts
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export class Monitoring extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    // SNS Topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'basketball-league-alarms',
      displayName: 'Basketball League Platform Alarms',
    });

    // Add email subscriptions
    props.alertEmails.forEach(email => {
      this.alarmTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(email)
      );
    });

    // Create main dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'MainDashboard', {
      dashboardName: `basketball-league-${props.environment}`,
      periodOverride: cloudwatch.PeriodOverride.AUTO,
    });

    // Add widgets
    this.addApiMetrics(props);
    this.addEcsMetrics(props);
    this.addDatabaseMetrics(props);
    this.addCacheMetrics(props);
    this.addBusinessMetrics(props);
    this.createSyntheticMonitoring(props);
  }

  private addApiMetrics(props: MonitoringProps): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Metrics',
        left: [
          props.apiGateway.metricCount({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          props.apiGateway.metric4XXError({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          props.apiGateway.metric5XXError({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          props.apiGateway.metricLatency({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'API Success Rate',
        metrics: [
          new cloudwatch.MathExpression({
            expression: '(m1 - m2 - m3) / m1 * 100',
            usingMetrics: {
              m1: props.apiGateway.metricCount(),
              m2: props.apiGateway.metric4XXError(),
              m3: props.apiGateway.metric5XXError(),
            },
            label: 'Success Rate %',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 6,
        height: 3,
      })
    );
  }

  private addEcsMetrics(props: MonitoringProps): void {
    const ecsWidgets = props.ecsServices.map(service => 
      new cloudwatch.GraphWidget({
        title: `ECS Service: ${service.serviceName}`,
        left: [
          service.metricCpuUtilization({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          service.metricMemoryUtilization({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'ECS/ContainerInsights',
            metricName: 'TaskCount',
            dimensionsMap: {
              ServiceName: service.serviceName,
              ClusterName: props.clusterName,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 8,
        height: 6,
      })
    );

    this.dashboard.addWidgets(...ecsWidgets);
  }

  private addDatabaseMetrics(props: MonitoringProps): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database Performance',
        left: [
          props.database.metricCPUUtilization({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          props.database.metricDatabaseConnections({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'ReadLatency',
            dimensionsMap: {
              DBClusterIdentifier: props.database.clusterIdentifier,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'WriteLatency',
            dimensionsMap: {
              DBClusterIdentifier: props.database.clusterIdentifier,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );
  }

  private addCacheMetrics(props: MonitoringProps): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Redis Cache Performance',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ElastiCache',
            metricName: 'CPUUtilization',
            dimensionsMap: {
              CacheClusterId: props.redisClusterId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ElastiCache',
            metricName: 'DatabaseMemoryUsagePercentage',
            dimensionsMap: {
              CacheClusterId: props.redisClusterId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/ElastiCache',
            metricName: 'CacheHitRate',
            dimensionsMap: {
              CacheClusterId: props.redisClusterId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );
  }

  private addBusinessMetrics(props: MonitoringProps): void {
    // Custom metrics for business KPIs
    const namespace = 'BasketballLeague/Business';

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'User Activity',
        left: [
          new cloudwatch.Metric({
            namespace,
            metricName: 'ActiveUsers',
            statistic: 'Average',
            period: cdk.Duration.hours(1),
          }),
          new cloudwatch.Metric({
            namespace,
            metricName: 'NewRegistrations',
            statistic: 'Sum',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Game Activity',
        left: [
          new cloudwatch.Metric({
            namespace,
            metricName: 'GamesInProgress',
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace,
            metricName: 'LiveScoreUpdates',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );
  }

  private createSyntheticMonitoring(props: MonitoringProps): void {
    // CloudWatch Synthetics for end-to-end monitoring
    // This would typically be defined separately but included here for completeness
    
    const syntheticsRole = new iam.Role(this, 'SyntheticsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchSyntheticsFullAccess'),
      ],
    });

    // Health check canary
    new synthetics.Canary(this, 'HealthCheckCanary', {
      canaryName: 'basketball-league-health',
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_9,
      test: synthetics.Test.custom({
        code: synthetics.Code.fromInline(`
          const synthetics = require('Synthetics');
          const log = require('SyntheticsLogger');

          const apiEndpoint = '${props.apiEndpoint}';

          const apiCanaryBlueprint = async function () {
            const page = await synthetics.getPage();
            
            const response = await page.goto(apiEndpoint + '/health', {
              waitUntil: 'networkidle0',
              timeout: 30000,
            });
            
            if (!response) {
              throw new Error('No response received');
            }
            
            const status = response.status();
            if (status !== 200) {
              throw new Error(\`Health check failed with status: \${status}\`);
            }
            
            log.info('Health check passed');
          };

          exports.handler = async () => {
            return await synthetics.executeStep('healthCheck', apiCanaryBlueprint);
          };
        `),
        handler: 'index.handler',
      }),
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(5)),
      role: syntheticsRole,
      startAfterCreation: true,
    });
  }
}
```

---

## 9. CI/CD Pipeline

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Basketball League Platform

on:
  push:
    branches:
      - main
      - develop
      - 'release/*'
  pull_request:
    branches:
      - main
      - develop

env:
  AWS_REGION: us-west-2
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-west-2.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth, user, league, game, stats]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: services/${{ matrix.service }}
      
      - name: Run tests
        run: npm test
        working-directory: services/${{ matrix.service }}
      
      - name: Run linting
        run: npm run lint
        working-directory: services/${{ matrix.service }}
      
      - name: Security scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: services/${{ matrix.service }}
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload security results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    strategy:
      matrix:
        service: [auth, user, league, game, stats]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REPOSITORY: basketball-league/${{ matrix.service }}-service
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
                       -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
                       services/${{ matrix.service }}
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy-infrastructure:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/heads/release/')
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install CDK
        run: npm install -g aws-cdk
      
      - name: Install dependencies
        run: npm ci
        working-directory: infrastructure
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Deploy CDK stacks
        run: |
          cdk deploy --all --require-approval never
        working-directory: infrastructure
        env:
          CDK_DEPLOY_ACCOUNT: ${{ secrets.AWS_ACCOUNT_ID }}
          CDK_DEPLOY_REGION: ${{ env.AWS_REGION }}

  deploy-services:
    needs: deploy-infrastructure
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth, user, league, game, stats]
    
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster basketball-league-cluster \
            --service basketball-league-${{ matrix.service }}-service \
            --force-new-deployment

  smoke-tests:
    needs: deploy-services
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run smoke tests
        run: |
          npm ci
          npm run test:smoke
        working-directory: tests/smoke
        env:
          API_ENDPOINT: ${{ secrets.API_ENDPOINT }}
```

---

## 10. Disaster Recovery

### 10.1 Backup and Recovery Strategy

```typescript
// lib/constructs/disaster-recovery.ts
import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class DisasterRecovery extends Construct {
  public readonly backupPlan: backup.BackupPlan;
  public readonly backupVault: backup.BackupVault;

  constructor(scope: Construct, id: string, props: DisasterRecoveryProps) {
    super(scope, id);

    // Create backup vault with encryption
    this.backupVault = new backup.BackupVault(this, 'BackupVault', {
      backupVaultName: `basketball-league-backup-${props.environment}`,
      encryptionKey: props.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      accessPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('backup.amazonaws.com')],
            actions: ['backup:CopyIntoBackupVault'],
            resources: ['*'],
          }),
        ],
      }),
    });

    // Create backup plan
    this.backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
      backupPlanName: `basketball-league-backup-plan-${props.environment}`,
      backupVault: this.backupVault,
      backupPlanRules: [
        // Daily backups for RDS
        new backup.BackupPlanRule({
          ruleName: 'DailyRDSBackup',
          scheduleExpression: events.Schedule.cron({
            hour: '3',
            minute: '0',
          }),
          startWindow: cdk.Duration.hours(1),
          completionWindow: cdk.Duration.hours(2),
          deleteAfter: cdk.Duration.days(30),
          moveToColdStorageAfter: cdk.Duration.days(7),
        }),
        // Weekly backups with longer retention
        new backup.BackupPlanRule({
          ruleName: 'WeeklyBackup',
          scheduleExpression: events.Schedule.cron({
            weekDay: 'SUN',
            hour: '4',
            minute: '0',
          }),
          startWindow: cdk.Duration.hours(1),
          completionWindow: cdk.Duration.hours(3),
          deleteAfter: cdk.Duration.days(90),
          moveToColdStorageAfter: cdk.Duration.days(30),
        }),
        // Monthly backups for compliance
        new backup.BackupPlanRule({
          ruleName: 'MonthlyBackup',
          scheduleExpression: events.Schedule.cron({
            day: '1',
            hour: '5',
            minute: '0',
          }),
          startWindow: cdk.Duration.hours(1),
          completionWindow: cdk.Duration.hours(4),
          deleteAfter: cdk.Duration.days(365),
          moveToColdStorageAfter: cdk.Duration.days(90),
        }),
      ],
    });

    // Add resources to backup plan
    this.backupPlan.addSelection('BackupSelection', {
      selectionName: 'basketball-league-resources',
      resources: [
        backup.BackupResource.fromRdsDatabaseCluster(props.database),
        backup.BackupResource.fromTag('Backup', 'true'),
      ],
      allowRestores: true,
    });

    // Create disaster recovery testing Lambda
    const drTestFunction = new lambda.Function(this, 'DRTestFunction', {
      functionName: `basketball-league-dr-test-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const backup = new AWS.Backup();
        const sns = new AWS.SNS();

        exports.handler = async (event) => {
          try {
            // List recovery points
            const vaultName = process.env.VAULT_NAME;
            const recoveryPoints = await backup.listRecoveryPointsByBackupVault({
              BackupVaultName: vaultName,
              MaxResults: 1,
            }).promise();

            if (recoveryPoints.RecoveryPoints.length === 0) {
              throw new Error('No recovery points found');
            }

            // Test restore (metadata only, not actual restore)
            const latestRecoveryPoint = recoveryPoints.RecoveryPoints[0];
            console.log('Latest recovery point:', latestRecoveryPoint);

            // Send notification
            await sns.publish({
              TopicArn: process.env.SNS_TOPIC_ARN,
              Subject: 'DR Test Successful',
              Message: \`Disaster Recovery test completed successfully.
                Latest recovery point: \${latestRecoveryPoint.RecoveryPointArn}
                Creation date: \${latestRecoveryPoint.CreationDate}\`,
            }).promise();

            return {
              statusCode: 200,
              body: JSON.stringify({ success: true }),
            };
          } catch (error) {
            console.error('DR test failed:', error);
            
            await sns.publish({
              TopicArn: process.env.SNS_TOPIC_ARN,
              Subject: 'DR Test Failed',
              Message: \`Disaster Recovery test failed: \${error.message}\`,
            }).promise();

            throw error;
          }
        };
      `),
      environment: {
        VAULT_NAME: this.backupVault.backupVaultName,
        SNS_TOPIC_ARN: props.snsTopicArn,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant permissions
    this.backupVault.grant(drTestFunction, 'backup:ListRecoveryPointsByBackupVault');
    
    // Schedule DR tests
    new events.Rule(this, 'DRTestSchedule', {
      ruleName: `basketball-league-dr-test-${props.environment}`,
      schedule: events.Schedule.cron({
        weekDay: 'MON',
        hour: '9',
        minute: '0',
      }),
      targets: [new targets.LambdaFunction(drTestFunction)],
    });

    // Cross-region replication (for production)
    if (props.environment === 'prod') {
      this.setupCrossRegionReplication(props);
    }
  }

  private setupCrossRegionReplication(props: DisasterRecoveryProps): void {
    // Create backup vault in secondary region
    const secondaryVault = new backup.BackupVault(this, 'SecondaryBackupVault', {
      backupVaultName: `basketball-league-backup-${props.environment}-dr`,
      encryptionKey: props.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add copy action to backup plan rules
    this.backupPlan.addRule(new backup.BackupPlanRule({
      ruleName: 'CrossRegionCopy',
      copyActions: [
        {
          destinationBackupVault: secondaryVault,
          deleteAfter: cdk.Duration.days(30),
        },
      ],
      scheduleExpression: events.Schedule.cron({
        hour: '6',
        minute: '0',
      }),
      deleteAfter: cdk.Duration.days(7),
    }));
  }
}
```

---

## Appendices

### Appendix A: Environment Variables

```bash
# CDK deployment environment variables
export CDK_DEPLOY_ACCOUNT=123456789012
export CDK_DEPLOY_REGION=us-west-2
export ENVIRONMENT=prod

# Service configuration
export DATABASE_URL=postgresql://user:pass@host:5432/db
export REDIS_URL=redis://host:6379
export API_ENDPOINT=https://api.basketballleague.com

# External services
export STRIPE_SECRET_KEY=sk_live_xxx
export SENDGRID_API_KEY=SG.xxx
export TWILIO_ACCOUNT_SID=xxx
export TWILIO_AUTH_TOKEN=xxx

# Monitoring
export ALERT_EMAIL=ops@basketballleague.com
export SLACK_WEBHOOK=https://hooks.slack.com/xxx
```

### Appendix B: Cost Optimization Tags

```typescript
// Standard tags for cost allocation
export const standardTags = {
  Project: 'basketball-league',
  Environment: environment,
  ManagedBy: 'cdk',
  CostCenter: 'engineering',
  Owner: 'platform-team',
  DataClassification: 'internal',
  Backup: 'true', // For backup selection
  MonitoringLevel: 'standard', // standard, enhanced, critical
};
```

### Appendix C: Deployment Commands

```bash
# Bootstrap CDK (one-time setup)
cdk bootstrap aws://123456789012/us-west-2

# Deploy all stacks
cdk deploy --all

# Deploy specific stack
cdk deploy BasketballLeague-Prod

# Diff before deployment
cdk diff

# Destroy stacks (careful!)
cdk destroy --all

# Synthesize CloudFormation
cdk synth
```

---

*This Infrastructure as Code specification document will be continuously updated as the platform evolves.*

**Document Control:**
- Review Cycle: Sprint boundaries
- Change Process: Infrastructure review required
- Distribution: DevOps Team, Platform Team, Security Team