# ML Dashboard Quick Start

## TL;DR - Start Everything Now

```bash
cd ~/repos/lsh
./start-ml-dashboard.sh
```

This starts:
- ✅ LSH Daemon (job management)
- ✅ Pipeline Service (port 3034)
- ✅ LSH API Server (port 3030)
- ✅ MCLI ML Dashboard (port 8501)

## Dashboards Available

| Dashboard | URL | Description |
|-----------|-----|-------------|
| **LSH Hub** | http://localhost:3034/hub | Central navigation |
| **Pipeline Dashboard** | http://localhost:3034/dashboard/ | Job workflows |
| **ML Dashboard** | http://localhost:8501 | ML training monitoring |
| **LSH API** | http://localhost:3030 | REST API |

## Individual Commands

### Start Just LSH Daemon
```bash
lsh daemon start
lsh daemon status
```

### Start Just Pipeline Service
```bash
cd ~/repos/lsh
node dist/pipeline/pipeline-service.js
```

### Start Just ML Dashboard
```bash
mcli workflow dashboard launch
```

### Start API Server
```bash
lsh api start
```

## Common Tasks

### View Running Jobs
```bash
lsh daemon job list
```

### Create a New Job
```bash
lsh daemon job create
```

### Trigger ML Training
```bash
lsh daemon job create --name "ml-training" --command "mcli model train"
lsh daemon job trigger <job-id>
```

### Check Service Status
```bash
# LSH Daemon
lsh daemon status

# Pipeline Service
curl http://localhost:3034/api/health

# All ports
lsof -i :3034  # Pipeline
lsof -i :3030  # API
lsof -i :8501  # ML Dashboard
```

## Stop Services

```bash
# Stop LSH daemon
lsh daemon stop

# Stop pipeline service
pkill -f "pipeline-service.js"

# Stop ML dashboard
# Press Ctrl+C in the terminal running it

# Stop API server
pkill -f "lsh api"
```

## Full Documentation

See [ML-DASHBOARD-STARTUP.md](docs/ML-DASHBOARD-STARTUP.md) for:
- Architecture overview
- Detailed setup instructions
- Environment configuration
- Integration examples
- Troubleshooting guide

## Quick Help

```bash
# LSH commands
lsh --help
lsh daemon --help
lsh daemon job --help
lsh api --help

# MCLI commands
mcli --help
mcli workflow --help
mcli workflow dashboard --help
```

## First Time Setup

1. **Install dependencies:**
   ```bash
   # LSH (already done)
   lsh --version

   # MCLI
   cd ~/repos/mcli
   uv sync --extra dashboard
   ```

2. **Configure environment:**
   Create `.env` file in ~/repos/lsh with your database credentials

3. **Start services:**
   ```bash
   ./start-ml-dashboard.sh
   ```

## Troubleshooting

**Dashboard won't start?**
```bash
# Check logs
tail -f /tmp/lsh-pipeline.log
tail -f /tmp/lsh-api.log

# Kill stuck processes
pkill -f "pipeline-service"
pkill -f "streamlit"
```

**Can't find mcli?**
```bash
export PATH="$HOME/.local/bin:$PATH"
hash -r
mcli --version
```

**Database connection errors?**
Check your `.env` file has the correct Supabase credentials.
