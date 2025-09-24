# CI/CD Dashboard Documentation

## Overview

The CI/CD Dashboard is a comprehensive monitoring and analytics platform for continuous integration and deployment pipelines across multiple platforms (GitHub Actions, GitLab CI, Jenkins).

## Architecture

### Components

1. **Webhook Receiver** (`src/cicd/webhook-receiver.ts`)
   - Express.js server handling webhook events
   - Real-time Socket.IO integration
   - Multi-platform webhook parsing
   - RESTful API endpoints

2. **Analytics Engine** (`src/cicd/analytics.ts`)
   - Trend analysis and predictions
   - Anomaly detection using Z-score
   - Cost analysis and optimization
   - Performance insights

3. **Cache Manager** (`src/cicd/cache-manager.ts`)
   - Redis-based caching layer
   - Decorator-based caching
   - Cache invalidation strategies
   - Performance optimization

4. **Authentication & Authorization** (`src/cicd/auth.ts`)
   - JWT-based authentication
   - API key support
   - Role-based access control (RBAC)
   - Audit logging

5. **Performance Monitor** (`src/cicd/performance-monitor.ts`)
   - Real-time performance metrics
   - Resource usage tracking
   - Alert thresholds
   - Health status reporting

6. **Data Retention Service** (`src/cicd/data-retention.ts`)
   - Automated cleanup policies
   - Data archiving to S3/local storage
   - Scheduled maintenance tasks
   - Storage optimization

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- TypeScript 5+

### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Database
export DATABASE_URL="postgresql://user:password@localhost:5432/cicd"

# Redis
export REDIS_URL="redis://localhost:6379"

# Authentication
export JWT_SECRET="your-secret-key"

# GitHub
export GITHUB_WEBHOOK_SECRET="your-github-secret"

# GitLab
export GITLAB_TOKEN="your-gitlab-token"

# Archive (optional)
export ENABLE_ARCHIVE="true"
export ARCHIVE_S3_BUCKET="your-s3-bucket"
# or
export ARCHIVE_LOCAL_PATH="/var/backups/cicd"
```

3. Initialize database:
```bash
psql -U your_user -d cicd -f src/cicd/schema.sql
```

4. Build TypeScript:
```bash
npm run build
```

5. Start the service:
```bash
node dist/cicd/webhook-receiver.js
```

## Configuration

### Webhook Setup

#### GitHub Actions
1. Go to Settings > Webhooks in your repository
2. Add webhook URL: `https://your-domain.com/webhook/github`
3. Set content type to `application/json`
4. Select events: Workflow runs, Check runs
5. Add secret for signature verification

#### GitLab CI
1. Go to Settings > Webhooks in your project
2. Add webhook URL: `https://your-domain.com/webhook/gitlab`
3. Select triggers: Pipeline events, Job events
4. Add secret token

#### Jenkins
1. Install Generic Webhook Trigger plugin
2. Configure webhook URL: `https://your-domain.com/webhook/jenkins`
3. Set up authentication token

### Authentication

The system supports three authentication methods:

1. **JWT Tokens** (for web UI):
```javascript
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

2. **API Keys** (for programmatic access):
```javascript
GET /api/metrics
Authorization: ApiKey cicd_xxxxxxxxxxxxx
```

3. **Role-Based Access**:
- `admin`: Full access
- `developer`: View and trigger pipelines
- `viewer`: Read-only access

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/api-key` - Generate API key

### Pipeline Data
- `GET /api/pipelines` - List recent pipelines
- `GET /api/pipelines/:id` - Get pipeline details
- `GET /api/pipelines/:id/stages` - Get pipeline stages

### Metrics
- `GET /api/metrics` - Current metrics
- `GET /api/metrics/history` - Historical metrics
- `GET /api/performance` - Performance metrics

### Analytics
- `GET /api/analytics/report` - Generate analytics report
- `GET /api/analytics/trends` - Get trend data
- `GET /api/analytics/anomalies` - Detect anomalies
- `GET /api/analytics/predictions` - Get predictions
- `GET /api/analytics/costs` - Cost analysis
- `GET /api/analytics/insights` - Get insights
- `GET /api/analytics/bottlenecks` - Identify bottlenecks

### Real-time
- WebSocket: `ws://your-domain.com/socket.io`

Events:
- `pipeline:started`
- `pipeline:completed`
- `pipeline:failed`
- `stage:updated`
- `metrics:updated`

## Dashboards

### Main Dashboard (`/dashboard`)
- Real-time pipeline status
- Success/failure rates
- Active pipelines
- Recent events

### Analytics Dashboard (`/dashboard/analytics`)
- Trend analysis charts
- Cost breakdown
- Performance insights
- Anomaly alerts
- Predictions

### Features:
- Real-time updates via WebSocket
- Interactive charts
- Period selection (daily/weekly/monthly)
- Export capabilities

## Performance Optimization

### Caching Strategy

The system implements multi-level caching:

1. **API Response Caching**:
   - TTL: 5 minutes for metrics
   - TTL: 1 hour for analytics
   - Automatic invalidation on updates

2. **Database Query Caching**:
   - Prepared statements
   - Connection pooling
   - Query result caching

3. **Static Asset Caching**:
   - CDN integration
   - Browser caching headers
   - Compression

### Performance Monitoring

Monitor key metrics:
- CPU usage threshold: 80%
- Memory usage threshold: 85%
- Response time threshold: 1000ms
- Error rate threshold: 5%

Access health status:
```bash
GET /health
```

## Data Retention

### Policies

| Table | Retention | Archive |
|-------|-----------|---------|
| pipeline_events | 90 days | Yes |
| build_metrics | 180 days | Yes |
| audit_logs | 365 days | Yes |
| pipeline_stages | 90 days | No |
| alerts | 30 days | No |
| webhook_logs | 7 days | No |

### Manual Cleanup

Trigger cleanup for specific table:
```bash
POST /api/admin/cleanup
{
  "table": "pipeline_events"
}
```

## Security

### Best Practices

1. **Secrets Management**:
   - Use environment variables
   - Rotate JWT secrets regularly
   - Secure webhook secrets

2. **Access Control**:
   - Implement least privilege
   - Regular permission audits
   - API key expiration

3. **Data Protection**:
   - Encrypt sensitive data
   - HTTPS only
   - Rate limiting

4. **Monitoring**:
   - Audit all actions
   - Alert on suspicious activity
   - Regular security scans

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**:
```bash
# Check Redis status
redis-cli ping

# Start Redis
brew services start redis  # macOS
systemctl start redis      # Linux
```

2. **Database Connection Issues**:
```bash
# Check PostgreSQL status
pg_isready

# Check connection string
psql $DATABASE_URL
```

3. **Webhook Not Received**:
- Verify webhook URL is accessible
- Check webhook secret matches
- Review webhook delivery logs in platform

4. **High Memory Usage**:
- Check cache size: `GET /api/cache/stats`
- Review retention policies
- Increase Node.js heap size if needed

## Development

### Running Tests
```bash
npm test
```

### Local Development
```bash
npm run dev
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
COPY src/cicd/dashboard ./dist/cicd/dashboard
EXPOSE 3030
CMD ["node", "dist/cicd/webhook-receiver.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cicd-dashboard
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cicd-dashboard
  template:
    metadata:
      labels:
        app: cicd-dashboard
    spec:
      containers:
      - name: dashboard
        image: your-registry/cicd-dashboard:latest
        ports:
        - containerPort: 3030
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: cicd-secrets
              key: database-url
```

## Monitoring

### Metrics to Track

1. **Application Metrics**:
   - Request rate
   - Response time
   - Error rate
   - Active connections

2. **Business Metrics**:
   - Pipeline success rate
   - Average build time
   - Cost per build
   - Team productivity

3. **Infrastructure Metrics**:
   - CPU utilization
   - Memory usage
   - Disk I/O
   - Network throughput

### Alerting

Configure alerts for:
- Pipeline failure rate > 20%
- Response time > 2 seconds
- Memory usage > 90%
- Database connection pool exhausted

## Support

For issues or questions:
1. Check the troubleshooting guide
2. Review logs: `tail -f logs/cicd-dashboard.log`
3. Create an issue on GitHub
4. Contact the development team

## License

MIT License - See LICENSE file for details