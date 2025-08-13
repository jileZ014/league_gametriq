# ADR-022: WebSocket Real-time Infrastructure Architecture

## Status
Proposed

## Context
The Legacy Youth Sports basketball platform requires real-time capabilities to handle:
- 1000+ concurrent connections on Saturdays
- Live score updates with < 500ms latency
- Tournament bracket updates
- Real-time notifications
- Phoenix market with 80+ leagues and 3,500+ teams

## Decision

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CloudFront                           │
│              (WebSocket Support via CloudFront)              │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│              Application Load Balancer (ALB)                 │
│                  - Sticky Sessions                           │
│                  - WebSocket Protocol Support                │
│                  - Health Checks                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┬────────────┬────────────┐
        │                       │            │            │
┌───────▼────────┐    ┌────────▼─────┐   ┌─▼──────────┐ │
│   ECS Fargate  │    │  ECS Fargate │   │ECS Fargate │ │
│   Container 1  │    │  Container 2 │   │Container 3 │ │
│  (Socket.io)   │    │ (Socket.io)  │   │(Socket.io) │ │
└───────┬────────┘    └──────┬───────┘   └─┬──────────┘ │
        │                     │             │            │
        └─────────────────────┴─────────────┴────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  ElastiCache Redis  │
                    │   - Multi-AZ         │
                    │   - Pub/Sub Adapter │
                    │   - Session Store   │
                    └────────────────────┘
```

## AWS Services Configuration

### 1. Application Load Balancer (ALB)
```yaml
Type: AWS::ElasticLoadBalancingV2::LoadBalancer
Properties:
  Type: application
  Scheme: internet-facing
  IpAddressType: ipv4
  
TargetGroup:
  Protocol: HTTP
  Port: 3000
  HealthCheckPath: /health
  HealthCheckIntervalSeconds: 30
  TargetType: ip
  Stickiness:
    Enabled: true
    Type: app_cookie
    CookieName: io
    CookieDuration: 86400
```

### 2. ECS Fargate Configuration
```yaml
TaskDefinition:
  Cpu: 2048  # 2 vCPU
  Memory: 4096  # 4 GB
  
Service:
  DesiredCount: 3
  MinimumHealthyPercent: 100
  MaximumPercent: 200
  
AutoScaling:
  MinCapacity: 3
  MaxCapacity: 20
  TargetCPUUtilization: 70
  TargetMemoryUtilization: 80
  ScaleInCooldown: 300
  ScaleOutCooldown: 60
  
  # Custom metric for connection count
  CustomMetric:
    MetricName: WebSocketConnections
    TargetValue: 500  # Scale when > 500 connections per task
```

### 3. ElastiCache Redis Configuration
```yaml
Type: AWS::ElastiCache::ReplicationGroup
Properties:
  Engine: redis
  EngineVersion: 7.0
  CacheNodeType: cache.r6g.xlarge  # 4 vCPU, 26.32 GB
  NumCacheClusters: 2  # Primary + 1 replica
  AutomaticFailoverEnabled: true
  MultiAZEnabled: true
  
  # Redis configuration
  Parameters:
    maxmemory-policy: allkeys-lru
    timeout: 300
    tcp-keepalive: 60
    
  # Security
  AtRestEncryptionEnabled: true
  TransitEncryptionEnabled: true
  AuthToken: !Ref RedisAuthToken
```

### 4. CloudWatch Monitoring
```yaml
Dashboard:
  Widgets:
    - ConnectionCount
    - MessageThroughput
    - Latency (p50, p95, p99)
    - ErrorRate
    - CPUUtilization
    - MemoryUtilization
    
Alarms:
  - HighConnectionCount:
      Threshold: 900
      EvaluationPeriods: 2
      DatapointsToAlarm: 2
      
  - HighLatency:
      MetricName: p99Latency
      Threshold: 1000  # 1 second
      
  - HighErrorRate:
      MetricName: 4xxErrorRate
      Threshold: 0.05  # 5%
      
  - RedisConnectionFailure:
      MetricName: RedisConnectionCount
      Threshold: 0
      TreatMissingData: breaching
```

### 5. Auto-Scaling Strategy

#### Horizontal Scaling Triggers:
1. **CPU Utilization > 70%** - Add 2 tasks
2. **Memory Utilization > 80%** - Add 2 tasks
3. **Active Connections > 500/task** - Add 3 tasks
4. **Message Queue Depth > 1000** - Add 2 tasks
5. **P99 Latency > 1s** - Add 2 tasks

#### Scale-In Policy:
- Wait 5 minutes after scale-out
- Remove 1 task at a time
- Maintain minimum 3 tasks

### 6. Disaster Recovery

#### Multi-AZ Deployment:
```yaml
Availability Zones:
  - us-west-2a  # Primary
  - us-west-2b  # Secondary
  - us-west-2c  # Tertiary
  
Failover Strategy:
  - Automatic failover for Redis
  - ALB health checks for ECS tasks
  - Cross-AZ data replication
```

#### Backup Strategy:
- Redis snapshots every 6 hours
- Retain snapshots for 7 days
- Point-in-time recovery enabled

### 7. Security Configuration

```yaml
SecurityGroups:
  ALB:
    Ingress:
      - Port: 443
        Protocol: TCP
        Source: 0.0.0.0/0
      - Port: 80
        Protocol: TCP
        Source: 0.0.0.0/0
        
  ECS:
    Ingress:
      - Port: 3000
        Protocol: TCP
        Source: !Ref ALBSecurityGroup
        
  Redis:
    Ingress:
      - Port: 6379
        Protocol: TCP
        Source: !Ref ECSSecurityGroup
        
WAF:
  Rules:
    - RateLimitRule:
        Limit: 1000
        WindowSeconds: 60
    - GeoBlockRule:
        AllowedCountries: [US]
    - IPReputationList: AWS-Managed
```

### 8. Cost Optimization

#### Estimated Monthly Costs (Production):
```
ALB:                      $20
ECS Fargate (3 tasks):    $300
ElastiCache Redis:        $200
CloudWatch:               $50
Data Transfer:            $100
CloudFront:               $50
Total:                    ~$720/month
```

#### Cost Optimization Strategies:
1. Use Fargate Spot for non-critical tasks (30% savings)
2. Reserved Instances for Redis (40% savings)
3. Implement connection pooling to reduce task count
4. Use CloudFront caching to reduce backend load
5. Schedule scale-down during off-peak hours

### 9. Performance Optimization

#### Connection Management:
```javascript
// Optimal Socket.io configuration
{
  pingInterval: 25000,
  pingTimeout: 60000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket'],
  perMessageDeflate: {
    threshold: 1024
  }
}
```

#### Redis Optimization:
- Use Redis pipelining for batch operations
- Implement Redis connection pooling
- Set appropriate TTLs for cached data
- Use Redis Cluster for > 10,000 connections

### 10. Monitoring Metrics

#### Key Performance Indicators (KPIs):
1. **Connection Success Rate**: > 99.5%
2. **Message Delivery Rate**: > 99.9%
3. **P50 Latency**: < 100ms
4. **P95 Latency**: < 500ms
5. **P99 Latency**: < 1000ms
6. **Uptime**: > 99.9%

#### Custom CloudWatch Metrics:
```javascript
// Publish custom metrics
await cloudWatch.putMetricData({
  Namespace: 'GametriqWebSocket',
  MetricData: [
    {
      MetricName: 'ActiveConnections',
      Value: connectionCount,
      Unit: 'Count',
      Dimensions: [
        { Name: 'Environment', Value: 'production' },
        { Name: 'Namespace', Value: namespace }
      ]
    }
  ]
}).promise();
```

## Consequences

### Positive:
- Highly scalable architecture supporting 10,000+ concurrent connections
- Sub-second latency for real-time updates
- Automatic failover and recovery
- Cost-effective with auto-scaling
- Production-ready monitoring and alerting

### Negative:
- Initial setup complexity
- Requires DevOps expertise for maintenance
- Sticky sessions may cause uneven load distribution
- Redis becomes a single point of failure (mitigated by Multi-AZ)

## Alternatives Considered

1. **AWS API Gateway WebSocket**
   - Pros: Serverless, automatic scaling
   - Cons: Limited Socket.io support, higher latency

2. **EC2 with Auto Scaling Groups**
   - Pros: More control, potentially lower cost
   - Cons: Higher operational overhead

3. **AWS AppSync**
   - Pros: GraphQL subscriptions, managed service
   - Cons: Not suitable for Socket.io, learning curve

## Implementation Checklist

- [ ] Set up VPC with public/private subnets
- [ ] Deploy ALB with sticky sessions
- [ ] Configure ECS cluster with Fargate
- [ ] Set up ElastiCache Redis cluster
- [ ] Implement Socket.io with Redis adapter
- [ ] Configure auto-scaling policies
- [ ] Set up CloudWatch dashboards
- [ ] Implement CloudWatch alarms
- [ ] Configure WAF rules
- [ ] Set up backup and recovery
- [ ] Load testing with 1000+ connections
- [ ] Implement connection pooling
- [ ] Set up CI/CD pipeline
- [ ] Document runbooks
- [ ] Train operations team

## References
- [AWS WebSocket Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api.html)
- [Socket.io Scaling Guide](https://socket.io/docs/v4/using-multiple-nodes/)
- [Redis Pub/Sub Documentation](https://redis.io/docs/manual/pubsub/)
- [ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)