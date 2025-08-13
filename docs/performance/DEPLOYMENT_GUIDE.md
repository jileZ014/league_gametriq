# Basketball League Platform - Performance Optimization Deployment Guide

## Overview

This deployment guide covers the critical performance enhancements implemented for the basketball league platform to achieve:

- **Page Load Times**: <2 seconds (First Contentful Paint)
- **API Responses**: <100ms (P95)
- **Database Queries**: <50ms average
- **Static Asset Delivery**: <500ms globally
- **WebSocket Latency**: <50ms
- **Concurrent Users**: 1000+ during tournaments

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│   API Gateway    │────│   NestJS API    │
│   CDN Layer     │    │   Load Balancer  │    │   Application   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   S3 Assets     │    │   Redis Cluster  │    │   PostgreSQL    │
│   Static Files  │    │   Cache Layer    │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Deployment Checklist

### 1. Database Performance Setup

#### Deploy Performance Indexes
```bash
# Run the performance optimization migration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f apps/api/db/migrations/009_performance_indexes.sql
```

#### Verify Index Creation
```sql
-- Check critical indexes are created
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%performance%' 
   OR indexname LIKE 'idx_%live%'
ORDER BY tablename, indexname;
```

#### Initialize Materialized Views
```sql
-- Refresh materialized views for initial data
SELECT refresh_team_stats();
SELECT refresh_player_stats();
```

### 2. Redis Cache Deployment

#### Redis Cluster Configuration
```bash
# For production - deploy Redis cluster
redis-server redis.conf --cluster-enabled yes --cluster-config-file nodes.conf

# Verify cluster status
redis-cli --cluster check $REDIS_HOST:$REDIS_PORT
```

#### Cache Configuration
```bash
# Set Redis memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET notify-keyspace-events Ex

# Verify configuration
redis-cli CONFIG GET maxmemory-policy
```

### 3. CDN Setup (CloudFront)

#### Deploy CloudFront Distribution
```bash
# Apply the CloudFront configuration
aws cloudformation deploy \
  --template-file ops/aws/cloudfront-config.yml \
  --stack-name basketball-league-cdn \
  --parameter-overrides \
    Environment=production \
    BucketName=legacy-youth-sports-assets
```

#### Configure Origin Shield
```bash
# Enable origin shield for optimal performance
aws cloudfront put-distribution-config \
  --id $DISTRIBUTION_ID \
  --distribution-config file://cloudfront-origin-shield.json
```

### 4. API Performance Deployment

#### Environment Variables
```bash
# Performance configuration
export DB_POOL_MAX=20
export DB_POOL_MIN=2
export DB_POOL_IDLE=10000
export REDIS_HOST=your-redis-cluster-endpoint
export REDIS_CLUSTER_ENABLED=true
export RATE_LIMIT=1000
export WS_MAX_CONNECTIONS=2000
export AUTO_SCALING_ENABLED=true
export MIN_INSTANCES=2
export MAX_INSTANCES=10
```

#### Deploy API with Performance Optimizations
```bash
# Build optimized production bundle
npm run build

# Start with PM2 for production
pm2 start ecosystem.config.js --env production

# Verify performance middleware is active
curl -H "Accept-Encoding: gzip" http://your-api-endpoint/health/performance
```

### 5. Frontend Performance Deployment

#### Build Optimized Frontend
```bash
# Build with bundle analysis
npm run build:analyze

# Verify bundle sizes
# - Main bundle: <500KB gzipped
# - Basketball chunk: <200KB gzipped
# - Vendor chunk: <300KB gzipped
```

#### Deploy with Next.js Optimizations
```bash
# Start with optimized configuration
npm run start

# Verify performance headers
curl -I http://your-frontend-endpoint/
```

## Configuration Files Summary

### Key Files Created/Modified:

1. **CDN Configuration**: `/ops/aws/cloudfront-config.yml`
   - CloudFront distribution setup
   - Origin shield configuration
   - WAF integration

2. **Database Performance**: `/apps/api/db/migrations/009_performance_indexes.sql`
   - Critical performance indexes
   - Materialized views for heavy queries
   - Query performance monitoring

3. **Caching Strategy**: `/apps/api/src/config/cache.config.ts`
   - Redis configuration with clustering
   - Cache tier definitions (hot/warm/cold)
   - Invalidation patterns

4. **Cache Service**: `/apps/api/src/common/services/cache.service.ts`
   - High-performance cache implementation
   - Intelligent TTL selection
   - Health monitoring

5. **API Optimization**: `/apps/api/src/middleware/performance.middleware.ts`
   - Response compression
   - Field selection for payload reduction
   - Automated pagination

6. **Performance Monitoring**: `/apps/api/src/common/services/performance-monitoring.service.ts`
   - Real-time metrics collection
   - Alert thresholds
   - Tournament-specific tracking

7. **Next.js Configuration**: `/apps/web/next.config.js`
   - Bundle optimization
   - Image optimization with CDN
   - Caching headers

8. **Optimized Image Component**: `/apps/web/src/components/ui/optimized-image.tsx`
   - WebP/AVIF support
   - Responsive images
   - Basketball-specific optimizations

## Performance Monitoring

### Health Check Endpoints

```bash
# Overall system health
GET /health
# Returns: system status, component health, performance metrics

# Detailed performance metrics
GET /health/performance
# Returns: response times, throughput, cache hit rates

# Tournament-specific performance
GET /health/tournament/{tournamentId}
# Returns: tournament load metrics, optimization recommendations

# Cache performance
GET /health/cache
# Returns: cache statistics, hit rates, memory usage
```

### Monitoring Dashboard Integration

#### Prometheus Metrics
```yaml
# Add to prometheus.yml
scrape_configs:
  - job_name: 'basketball-league-api'
    static_configs:
      - targets: ['api.legacyyouthsports.com:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

#### Grafana Dashboard
Import the dashboard configuration from:
`/infrastructure/monitoring/grafana-dashboards/basketball-kpis.json`

## Performance Validation

### Load Testing
```bash
# Tournament simulation load test
k6 run --vus 1000 --duration 10m load-tests/tournament-simulation.js

# API performance test
k6 run --vus 500 --duration 5m load-tests/api-performance.js
```

### Expected Results:
- **API P95 Response Time**: <100ms
- **Database Query Average**: <50ms
- **Cache Hit Rate**: >85%
- **First Contentful Paint**: <2s
- **Time to Interactive**: <3s

## Tournament Day Preparation

### Pre-Tournament Checklist

1. **Scale Infrastructure**
   ```bash
   # Scale API instances
   kubectl scale deployment basketball-api --replicas=10
   
   # Increase database connections
   psql -c "ALTER SYSTEM SET max_connections = 100;"
   psql -c "SELECT pg_reload_conf();"
   ```

2. **Warm Caches**
   ```bash
   # Pre-load tournament data
   curl -X POST /api/cache/preload/tournament/{tournamentId}
   
   # Verify cache status
   curl /health/cache
   ```

3. **Enable Tournament Mode**
   ```bash
   export TOURNAMENT_MODE=true
   pm2 restart all --update-env
   ```

### During Tournament Monitoring

Monitor these critical metrics:
- Concurrent WebSocket connections
- Database connection pool utilization
- Cache hit rates
- API response times
- Error rates

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API P95 Response Time | >100ms | >200ms |
| Database Query Time | >50ms | >100ms |
| Cache Hit Rate | <85% | <70% |
| Error Rate | >1% | >5% |
| Memory Usage | >85% | >95% |
| WebSocket Connections | >1500 | >2000 |

## Troubleshooting

### Common Performance Issues

1. **High API Response Times**
   - Check database query performance
   - Verify cache hit rates
   - Monitor connection pool utilization

2. **Database Slowdowns**
   - Check running queries: `SELECT * FROM pg_stat_activity;`
   - Verify index usage: `EXPLAIN ANALYZE <query>`
   - Monitor connection pool

3. **Cache Issues**
   - Check Redis memory usage
   - Verify cluster node health
   - Monitor eviction rates

4. **High Memory Usage**
   - Restart API instances in rolling fashion
   - Check for memory leaks in custom code
   - Scale horizontally if needed

## Post-Tournament Optimization

### Performance Review
1. Analyze performance metrics from tournament
2. Identify bottlenecks and optimization opportunities
3. Update cache strategies based on usage patterns
4. Plan infrastructure scaling for next tournament

### Database Maintenance
```sql
-- Update table statistics
SELECT update_table_statistics();

-- Refresh materialized views
SELECT refresh_team_stats();
SELECT refresh_player_stats();

-- Vacuum and analyze critical tables
VACUUM ANALYZE games;
VACUUM ANALYZE team_standings;
VACUUM ANALYZE player_game_stats;
```

This comprehensive performance optimization ensures the basketball league platform can handle tournament day traffic with excellent user experience and reliable operation.