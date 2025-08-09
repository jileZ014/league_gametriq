# GameTriq Basketball League Management Platform
# Disaster Recovery Plan

## Executive Summary

This disaster recovery (DR) plan ensures the GameTriq Basketball League Management Platform can recover from catastrophic failures with minimal downtime and data loss. Our DR strategy targets a Recovery Time Objective (RTO) of 1 hour and Recovery Point Objective (RPO) of 15 minutes for production systems.

## Recovery Objectives

### Service Level Targets
- **RTO (Recovery Time Objective)**: 60 minutes
- **RPO (Recovery Point Objective)**: 15 minutes  
- **Availability Target**: 99.9% (43.8 minutes downtime per month)
- **Data Integrity**: 100% (zero acceptable data loss for financial transactions)

### Business Impact Classification
1. **Critical Services** (RTO: 15 minutes, RPO: 5 minutes)
   - Authentication Service
   - Payment Service
   - Live Game Scoring

2. **High Priority Services** (RTO: 30 minutes, RPO: 15 minutes)
   - Schedule Service
   - Game Service
   - User Service

3. **Standard Services** (RTO: 60 minutes, RPO: 30 minutes)
   - Notification Service
   - Reporting Service

## DR Architecture

### Multi-Region Setup
- **Primary Region**: US-West-2 (Oregon)
- **DR Region**: US-East-1 (Virginia)
- **Data Replication**: Real-time for critical services, near real-time for others

### Infrastructure Components

#### Database Replication
```yaml
Primary Database (US-West-2):
  - PostgreSQL 14 with streaming replication
  - Point-in-time recovery enabled
  - WAL archiving to S3 with cross-region replication
  - Automated backups every 4 hours

Standby Database (US-East-1):
  - Hot standby with read replicas
  - Synchronous replication for critical data
  - Asynchronous replication for analytics data
  - Automated promotion capability
```

#### Redis Cluster
```yaml
Primary Cache (US-West-2):
  - Redis 7.0 cluster with persistence
  - AOF (Append Only File) enabled
  - RDB snapshots every 15 minutes

DR Cache (US-East-1):
  - Redis replication with 30-second sync
  - Automatic failover with Redis Sentinel
  - Data reconstruction from database if needed
```

#### Application Services
```yaml
Primary Services (US-West-2):
  - Kubernetes cluster with auto-scaling
  - Health checks and readiness probes
  - Circuit breakers for graceful degradation

DR Services (US-East-1):
  - Warm standby environment (50% capacity)
  - Blue-green deployment capability
  - Auto-scaling to full capacity on failover
```

## Disaster Scenarios and Procedures

### Scenario 1: Single Service Failure

**Detection Time**: < 2 minutes (via health checks)
**Recovery Time**: 5-10 minutes (automatic)

**Automated Response**:
1. Circuit breaker activation
2. Pod restart via Kubernetes
3. Load balancer removes unhealthy instances
4. Auto-scaling adds replacement capacity

**Manual Escalation** (if automated recovery fails):
1. On-call engineer receives PagerDuty alert
2. Check service logs and metrics
3. Restart service manually if needed
4. Scale resources if capacity issue

### Scenario 2: Database Primary Failure

**Detection Time**: < 1 minute
**Recovery Time**: 10-15 minutes

**Automated Response**:
1. Health check failures trigger alerts
2. Read replicas continue serving read traffic
3. Write operations queue in Redis with TTL

**Manual Recovery Process**:
1. **Assess Situation** (2-3 minutes)
   ```bash
   # Check database status
   kubectl exec -it postgres-primary -- pg_isready
   
   # Check replication lag
   kubectl exec -it postgres-standby -- \
     psql -c "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
   ```

2. **Promote Standby** (5-7 minutes)
   ```bash
   # Promote standby to primary
   kubectl patch postgresql gametriq-db --type='merge' \
     -p='{"spec":{"postgresql":{"primaryHost":"postgres-standby"}}}'
   
   # Update connection strings
   kubectl set env deployment/schedule-service \
     DATABASE_HOST=postgres-standby.gametriq-production.svc.cluster.local
   ```

3. **Verify Recovery** (2-3 minutes)
   ```bash
   # Test write operations
   curl -X POST https://api.gametriq.com/api/v1/health/db-write-test
   
   # Check application health
   kubectl get pods -l app=gametriq-services
   ```

### Scenario 3: Full Region Failure

**Detection Time**: 2-5 minutes
**Recovery Time**: 45-60 minutes

**Immediate Actions** (First 5 minutes):
1. Operations team receives critical alerts
2. Confirm region-wide outage via AWS Status Page
3. Activate DR runbook and notify stakeholders
4. Begin DNS failover process

**DNS Failover** (5-10 minutes):
```bash
# Update DNS to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123EXAMPLE \
  --change-batch file://failover-dns.json

# Verify DNS propagation
dig +short api.gametriq.com @8.8.8.8
```

**Database Failover** (10-20 minutes):
```bash
# Promote DR database cluster
helm upgrade gametriq-db ./charts/postgresql \
  --set postgresql.primary.enabled=true \
  --set postgresql.readReplicas.enabled=true \
  --namespace gametriq-dr

# Restore from latest backup if needed
pg_restore -h postgres-dr.gametriq-dr.svc.cluster.local \
  -U gametriq -d gametriq_production \
  s3://gametriq-prod-backups/daily/$(date -d "yesterday" +%Y%m%d).sql.gz
```

**Application Services Failover** (20-40 minutes):
```bash
# Scale up DR environment to full capacity
kubectl scale deployment --replicas=3 \
  -l app=gametriq-services -n gametriq-dr

# Update external load balancer targets
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/gametriq-dr \
  --targets Id=i-dr-instance-1,Port=8080 Id=i-dr-instance-2,Port=8080

# Verify service health
kubectl get svc,ing -n gametriq-dr
curl -f https://api-dr.gametriq.com/health
```

**Data Synchronization** (20-30 minutes):
```bash
# Sync Redis cache from database
redis-cli -h redis-dr.gametriq-dr.svc.cluster.local \
  --eval cache-rebuild.lua

# Update CDN cache invalidation
aws cloudfront create-invalidation \
  --distribution-id E123EXAMPLE \
  --paths "/*"
```

### Scenario 4: Data Corruption or Security Incident

**Detection Time**: Variable (minutes to hours)
**Recovery Time**: 2-4 hours

**Immediate Response**:
1. Isolate affected systems
2. Preserve forensic evidence
3. Assess scope of corruption/breach
4. Activate incident response team

**Data Recovery Process**:
```bash
# Stop application writes to prevent further corruption
kubectl scale deployment --replicas=0 -l app=gametriq-services

# Identify clean backup point
aws s3 ls s3://gametriq-prod-backups/daily/ | grep -E "2024.*\.sql\.gz$"

# Restore from clean backup
pg_restore -h postgres-primary.gametriq-production.svc.cluster.local \
  -U gametriq -d gametriq_recovery \
  s3://gametriq-prod-backups/daily/20241201.sql.gz

# Validate data integrity
psql -h postgres-primary.gametriq-production.svc.cluster.local \
  -U gametriq -d gametriq_recovery \
  -f data-integrity-checks.sql
```

## Communication Plan

### Stakeholder Notification Matrix

| Incident Level | Internal Notifications | External Notifications | Timeline |
|----------------|----------------------|----------------------|----------|
| **Level 1** (Service Degradation) | Engineering Team, Operations | None | Immediate |
| **Level 2** (Service Outage) | + Management, Customer Support | Status page update | Within 5 minutes |
| **Level 3** (Regional Failure) | + Executive Team, Legal | + Customer email, Social media | Within 10 minutes |
| **Level 4** (Data Breach/Corruption) | All stakeholders | + Regulatory notifications | Within 15 minutes |

### Communication Templates

**Internal Alert Template**:
```
SUBJECT: [LEVEL X] GameTriq Production Incident - [Brief Description]

INCIDENT DETAILS:
- Start Time: [UTC timestamp]
- Services Affected: [List of services]
- User Impact: [Description]
- Root Cause: [If known]

CURRENT STATUS:
- Actions Taken: [List]
- ETA for Resolution: [Estimate]
- Next Update: [Time]

INCIDENT COMMANDER: [Name and contact]
```

**Customer Notification Template**:
```
We're currently experiencing technical difficulties with our GameTriq platform. 
We're working to resolve this issue as quickly as possible and will provide 
updates every 30 minutes until resolved.

What's affected: [Services]
What we're doing: [Actions]
Expected resolution: [Time estimate]

We apologize for any inconvenience. Visit https://status.gametriq.com for updates.
```

## Recovery Testing

### Quarterly DR Tests
1. **Database Failover Test** (January, April, July, October)
   - Test primary database failure
   - Measure RTO and RPO
   - Verify data consistency

2. **Application Failover Test** (February, May, August, November)
   - Test service-level failover
   - Verify auto-scaling
   - Test circuit breakers

3. **Full Regional Failover Test** (March, June, September, December)
   - Complete region failover exercise
   - End-to-end user journey testing
   - Performance validation

### Monthly Backup Testing
```bash
#!/bin/bash
# Monthly backup restoration test
BACKUP_DATE=$(date -d "last month" +%Y%m%d)
TEST_DB="gametriq_backup_test_$(date +%Y%m%d)"

# Restore backup to test database
pg_restore -h postgres-test.gametriq-test.svc.cluster.local \
  -U gametriq -d $TEST_DB \
  s3://gametriq-prod-backups/daily/${BACKUP_DATE}.sql.gz

# Run data integrity tests
psql -h postgres-test.gametriq-test.svc.cluster.local \
  -U gametriq -d $TEST_DB \
  -f tests/data-integrity-suite.sql

# Cleanup
dropdb -h postgres-test.gametriq-test.svc.cluster.local \
  -U gametriq $TEST_DB
```

## Monitoring and Alerting

### Key Metrics to Monitor
1. **Application Health**
   - Service response times
   - Error rates
   - Availability percentages

2. **Database Health**
   - Replication lag
   - Connection counts
   - Query performance

3. **Infrastructure Health**
   - Resource utilization
   - Network connectivity
   - Storage availability

### Alert Thresholds
```yaml
critical_alerts:
  - name: "Service Unavailable"
    condition: "availability < 99%"
    duration: "2m"
    
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    duration: "5m"
    
  - name: "Database Replication Lag"
    condition: "replication_lag > 60s"
    duration: "1m"

warning_alerts:
  - name: "High Response Time"
    condition: "response_time_p95 > 500ms"
    duration: "10m"
    
  - name: "Low Disk Space"
    condition: "disk_usage > 80%"
    duration: "5m"
```

## Recovery Validation

### Post-Recovery Checklist
- [ ] All services responding to health checks
- [ ] Database writes and reads functioning
- [ ] User authentication working
- [ ] Payment processing operational
- [ ] Email notifications sending
- [ ] Monitoring and alerting functional
- [ ] Performance within SLA targets
- [ ] No data integrity issues
- [ ] All integrations restored
- [ ] CDN and static assets serving

### Success Criteria
1. **RTO Achievement**: Recovery completed within 60 minutes
2. **RPO Achievement**: Data loss limited to 15 minutes or less  
3. **Functional Validation**: All critical user journeys working
4. **Performance Validation**: Response times within 2x normal
5. **Data Validation**: No corruption or inconsistency detected

## Continuous Improvement

### Post-Incident Review Process
1. **Timeline Documentation** (within 24 hours)
2. **Root Cause Analysis** (within 72 hours)  
3. **Improvement Action Items** (within 1 week)
4. **DR Plan Updates** (within 2 weeks)
5. **Team Training Updates** (within 1 month)

### Annual DR Plan Review
- Review and update RTO/RPO targets
- Assess new technologies and services
- Update contact information and procedures
- Review and update communication templates
- Validate insurance coverage and contracts
- Update vendor SLAs and support contacts

---

**Document Version**: 1.0  
**Last Updated**: Sprint 4 Implementation  
**Next Review**: Quarterly  
**Owner**: Platform Engineering Team  
**Approved By**: CTO, VP Engineering