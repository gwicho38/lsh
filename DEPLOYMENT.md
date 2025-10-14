# LSH Daemon Deployment Guide

## Quick Start

Deploy the LSH daemon to fly.io and integrate it with your mcli dashboard in 5 minutes.

## Prerequisites

- fly.io account ([sign up](https://fly.io))
- fly CLI installed: `curl -L https://fly.io/install.sh | sh`
- Node.js 20+ installed
- Supabase project with credentials

## Step 1: Initial Setup

```bash
# Clone or navigate to LSH repository
cd /path/to/lsh

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create .env file from template
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL=https://your-project.supabase.co
# - SUPABASE_KEY=your_service_role_key
# - LSH_API_KEY=your_generated_api_key (or leave blank to auto-generate)
vim .env
```

## Step 2: Deploy to fly.io

### Option A: Using the deployment script (Recommended)

```bash
# First time deployment
./deploy.sh --setup --test

# Subsequent deployments
./deploy.sh --deploy-only
```

### Option B: Manual deployment

```bash
# Login to fly.io
fly auth login

# Create app
fly apps create mcli-lsh-daemon

# Set secrets
fly secrets set SUPABASE_URL=your_url -a mcli-lsh-daemon
fly secrets set SUPABASE_KEY=your_key -a mcli-lsh-daemon
fly secrets set LSH_API_KEY=$(openssl rand -base64 32) -a mcli-lsh-daemon

# Deploy
fly deploy -a mcli-lsh-daemon

# Check status
fly status -a mcli-lsh-daemon

# View logs
fly logs -a mcli-lsh-daemon
```

## Step 3: Verify Deployment

```bash
# Test health endpoint
curl https://mcli-lsh-daemon.fly.dev/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 123,
#   "version": "0.5.2"
# }

# Test status endpoint
curl https://mcli-lsh-daemon.fly.dev/api/status
```

## Step 4: Configure mcli Dashboard

### For local development:

```bash
# Set environment variable
export LSH_API_URL=https://mcli-lsh-daemon.fly.dev

# Or add to .env
echo "LSH_API_URL=https://mcli-lsh-daemon.fly.dev" >> .env

# Test connection
mcli lsh-status
```

### For Streamlit Cloud:

Add to your Streamlit secrets configuration:

```toml
LSH_API_URL = "https://mcli-lsh-daemon.fly.dev"
LSH_API_KEY = "your_api_key_from_secrets"
```

## Step 5: Test Integration

```bash
# Check LSH daemon status from mcli
mcli lsh-status

# List jobs
mcli lsh-jobs

# Create a test job
mcli lsh-create-job \
  --name "test-job" \
  --command "echo 'Hello from LSH'" \
  --schedule "0 */6 * * *"

# View job status
mcli lsh-jobs --format json
```

## Dashboard Integration

Once deployed, your mcli dashboard will automatically connect to the LSH daemon and display:

- **LSH Daemon Status**: Real-time connection status
- **Active Jobs**: Currently running scheduled jobs
- **Job History**: Completed and failed jobs
- **Event Stream**: Live events from the daemon
- **Job Management**: Create, trigger, and monitor jobs

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  mcli Dashboard │◄────────┤   LSH Daemon     │◄────────┤   Supabase DB   │
│  (Streamlit)    │  HTTPS  │   (fly.io)       │  HTTPS  │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
      │                              │
      │                              │
      ▼                              ▼
┌─────────────────┐         ┌──────────────────┐
│  User Browser   │         │  Scheduled Jobs  │
│                 │         │  Data Pipelines  │
└─────────────────┘         │  Event Streams   │
                            └──────────────────┘
```

## Configuration Options

### Environment Variables

Set these in fly.io secrets or .env file:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key

# Optional
LSH_API_KEY=your_api_key
PORT=3030
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://... (if using Postgres)
REDIS_URL=redis://... (if using Redis)
```

### fly.toml Configuration

Edit `fly.toml` to customize:

```toml
# Change region
primary_region = "iad"  # Virginia instead of San Jose

# Increase memory
[[vm]]
  memory_mb = 1024  # 1GB instead of 512MB

# Enable auto-stop for development
[http_service]
  auto_stop_machines = true
  min_machines_running = 0
```

## Monitoring

### View Logs

```bash
# Real-time logs
fly logs -a mcli-lsh-daemon --follow

# Last 100 lines
fly logs -a mcli-lsh-daemon --lines 100
```

### Check Health

```bash
# Health status
curl https://mcli-lsh-daemon.fly.dev/health

# Detailed status
curl https://mcli-lsh-daemon.fly.dev/api/status
```

### Dashboard

```bash
# Open fly.io dashboard
fly dashboard -a mcli-lsh-daemon
```

## Scaling

### Vertical Scaling (More Resources)

```bash
# Increase memory
fly scale memory 1024 -a mcli-lsh-daemon

# Upgrade CPU
fly scale vm shared-cpu-2x -a mcli-lsh-daemon
```

### Horizontal Scaling (More Machines)

```bash
# Scale to 2 machines
fly scale count 2 -a mcli-lsh-daemon

# Scale by region
fly scale count 1 --region sjc -a mcli-lsh-daemon
fly scale count 1 --region iad -a mcli-lsh-daemon
```

## Troubleshooting

### Deployment Fails

```bash
# Check build logs
fly logs -a mcli-lsh-daemon

# Try building locally
npm run build

# Test Docker build
docker build -t lsh-daemon .
```

### Health Checks Failing

```bash
# SSH into machine
fly ssh console -a mcli-lsh-daemon

# Check if app is running
ps aux | grep node

# Test health endpoint locally
curl http://localhost:3030/health

# Check logs
tail -f /app/logs/*.log
```

### Dashboard Can't Connect

1. Verify LSH_API_URL is set correctly
2. Test endpoint directly: `curl https://mcli-lsh-daemon.fly.dev/health`
3. Check CORS configuration in LSH daemon
4. Verify API key if authentication is enabled
5. Check dashboard logs for connection errors

### Common Errors

**"Unhealthy allocations detected"**
- Verify /health endpoint returns 200 OK
- Check PORT environment variable is 3030
- Ensure app binds to 0.0.0.0, not localhost

**"Connection refused"**
- Verify app is running: `fly status -a mcli-lsh-daemon`
- Check firewall rules
- Verify HTTPS is enabled in fly.toml

**"Out of memory"**
- Increase memory: `fly scale memory 1024 -a mcli-lsh-daemon`
- Optimize Node.js heap: `NODE_OPTIONS=--max-old-space-size=512`

## Cost Optimization

### Development Setup (Minimal Cost)

```toml
# In fly.toml
[http_service]
  auto_stop_machines = true
  min_machines_running = 0

[[vm]]
  memory_mb = 256
  cpus = 1
```

**Estimated cost:** ~$0-5/month (machines stop when idle)

### Production Setup (High Availability)

```toml
# In fly.toml
[http_service]
  auto_stop_machines = false
  min_machines_running = 2

[[vm]]
  memory_mb = 1024
  cpus = 2
```

**Estimated cost:** ~$30-50/month (always running, redundant)

## Security Best Practices

1. **Use Secrets**: Never commit credentials to git
   ```bash
   fly secrets set SUPABASE_KEY=xxx -a mcli-lsh-daemon
   ```

2. **Enable API Authentication**: Set LSH_API_KEY and require it in requests

3. **Use HTTPS**: Always use https:// URLs (fly.io provides free SSL)

4. **Rotate Keys**: Regularly rotate API keys and database credentials

5. **Monitor Access**: Review logs for suspicious activity
   ```bash
   fly logs -a mcli-lsh-daemon | grep "401\|403"
   ```

## Updating

### Deploy New Version

```bash
# Pull latest changes
git pull origin main

# Build
npm run build

# Deploy
fly deploy -a mcli-lsh-daemon
```

### Rollback

```bash
# List releases
fly releases -a mcli-lsh-daemon

# Rollback to specific version
fly releases rollback <version> -a mcli-lsh-daemon
```

## Advanced Topics

### Multi-Region Deployment

Deploy in multiple regions for global low latency:

```bash
# Deploy in 3 regions
fly scale count 1 --region sjc -a mcli-lsh-daemon  # US West
fly scale count 1 --region iad -a mcli-lsh-daemon  # US East
fly scale count 1 --region fra -a mcli-lsh-daemon  # Europe
```

### Custom Domain

```bash
# Add custom domain
fly certs create lsh.yourdomain.com -a mcli-lsh-daemon

# Add DNS records (shown in output)
# Update mcli configuration
export LSH_API_URL=https://lsh.yourdomain.com
```

### Database Persistence

Mount a volume for persistent SQLite storage:

```bash
# Create volume
fly volumes create lsh_data --size 1 -a mcli-lsh-daemon

# Update fly.toml
# [[mounts]]
#   source = "lsh_data"
#   destination = "/data"

# Deploy with volume
fly deploy -a mcli-lsh-daemon
```

## Support

- **LSH Issues**: https://github.com/gwicho38/lsh/issues
- **mcli Integration**: https://github.com/gwicho38/mcli/issues
- **fly.io Support**: https://community.fly.io
- **Documentation**: README.md

## Next Steps

1. ✅ Deploy LSH daemon to fly.io
2. ✅ Configure mcli dashboard
3. ✅ Test connection and health
4. 📊 Create scheduled jobs for data pipelines
5. 📈 Monitor performance and scale as needed
6. 🔄 Set up CI/CD for automatic deployments

---

**Deployed successfully?** Your LSH daemon is now running at:
`https://mcli-lsh-daemon.fly.dev`

Test it: `mcli lsh-status --url https://mcli-lsh-daemon.fly.dev`
