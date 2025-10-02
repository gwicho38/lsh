# ML Dashboard Startup Guide

Complete guide for starting the integrated ML Dashboard that combines LSH job management with MCLI machine learning pipelines.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  ML Dashboard                   │
│         (Streamlit + LSH Pipeline UI)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐      ┌──────────────────┐   │
│  │ LSH Daemon   │◄────►│ MCLI Workflows   │   │
│  │ (Port 3030)  │      │ (Python/ML)      │   │
│  └──────────────┘      └──────────────────┘   │
│         │                      │               │
│         ▼                      ▼               │
│  ┌──────────────────────────────────────┐     │
│  │    Pipeline Service (Port 3034)      │     │
│  │    - Job Tracking                    │     │
│  │    - Workflow Engine                 │     │
│  │    - Data Sync                       │     │
│  └──────────────────────────────────────┘     │
│                     │                          │
│                     ▼                          │
│  ┌──────────────────────────────────────┐     │
│  │         Supabase Database            │     │
│  │    (Postgres + Realtime)             │     │
│  └──────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Install Dependencies

```bash
# LSH (already installed via npm)
lsh --version  # Should show 0.5.1

# MCLI
cd ~/repos/mcli
uv sync --extra dashboard

# Verify installation
mcli --version
mcli workflow dashboard info
```

### 2. Environment Configuration

Create `.env` files in both repositories:

**~/repos/lsh/.env**
```bash
# LSH Configuration
LSH_API_ENABLED=true
LSH_API_PORT=3030
MONITORING_API_PORT=3033

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Redis (optional for caching)
REDIS_URL=redis://localhost:6379
```

**~/repos/mcli/.env**
```bash
# MCLI Configuration
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379

# LSH Integration
LSH_API_URL=http://localhost:3030
LSH_API_KEY=your_api_key_from_daemon
```

## Startup Methods

### Method 1: One-Click Launch (Recommended)

Use the automated launcher script:

```bash
cd ~/repos/lsh
./launch-dashboard.sh
```

This script will:
1. Check if MCLI is installed
2. Start the LSH pipeline service (port 3034)
3. Launch the Electron desktop app
4. Open the dashboard in a native window

**Endpoints Available:**
- Dashboard Hub: http://localhost:3034/hub
- Pipeline Dashboard: http://localhost:3034/dashboard/
- ML Dashboard: http://localhost:3034/ml/dashboard
- CI/CD Dashboard: http://localhost:3034/cicd/dashboard

### Method 2: Manual Step-by-Step

For more control, start each service manually:

#### Step 1: Start LSH Daemon

```bash
# If not already running
lsh daemon start

# Verify
lsh daemon status
```

#### Step 2: Start LSH Pipeline Service

```bash
cd ~/repos/lsh

# Compile TypeScript (if needed)
npm run build

# Start pipeline service
node dist/pipeline/pipeline-service.js

# Or in background
nohup node dist/pipeline/pipeline-service.js > /tmp/pipeline.log 2>&1 &

# Verify
curl http://localhost:3034/api/health
```

#### Step 3: Start MCLI ML Dashboard

```bash
cd ~/repos/mcli

# Launch Streamlit dashboard
mcli workflow dashboard launch

# Or specify custom port
mcli workflow dashboard launch --port 8502 --host 0.0.0.0
```

This opens a Streamlit app on http://localhost:8501

#### Step 4: (Optional) Start API Server

If you need programmatic access:

```bash
lsh api start --port 3030
# Save the generated API key for use with MCLI
```

### Method 3: MCLI Workflow Integration

Start everything via MCLI:

```bash
# Start MCLI daemon (includes job management)
mcli workflow daemon start

# Launch dashboard
mcli workflow dashboard launch

# Check status
mcli workflow daemon status
```

## Dashboard Features

### LSH Pipeline Dashboard (Port 3034)

- **Hub**: Central navigation and system overview
- **Pipeline Dashboard**: View and manage data pipelines
- **Workflow Visualization**: See job dependencies and execution flow
- **Real-time Job Monitoring**: Track running jobs
- **Database Sync**: Supabase integration status

### MCLI ML Dashboard (Port 8501)

- **Model Training Monitoring**: View training metrics in real-time
- **Data Pipeline Status**: Track data preprocessing jobs
- **Prediction Results**: View ML model predictions
- **Performance Metrics**: Model accuracy, latency, resource usage
- **Experiment Tracking**: MLflow integration

## Common Commands

### Job Management

```bash
# Via LSH
lsh daemon job list
lsh daemon job create --name "ml-training" --command "mcli model train"
lsh daemon job trigger <job-id>

# Via MCLI
mcli workflow scheduler list
mcli workflow scheduler add --name "daily-training" --cron "0 2 * * *"
```

### Database Operations

```bash
# Sync LSH jobs to Supabase
lsh daemon db sync

# Query ML results
mcli workflow sync pull --table ml_predictions
```

### Monitoring

```bash
# LSH daemon status
lsh daemon status

# Pipeline service health
curl http://localhost:3034/api/health

# MCLI workflows
mcli workflow daemon status
```

## Troubleshooting

### Dashboard Won't Start

```bash
# Check if ports are in use
lsof -i :3034  # Pipeline service
lsof -i :8501  # Streamlit
lsof -i :3030  # LSH API

# Kill processes if needed
pkill -f "node dist/pipeline/pipeline-service.js"
pkill -f "streamlit run"

# Check logs
tail -f /tmp/pipeline.log
```

### Database Connection Issues

```bash
# Test Supabase connection
cd ~/repos/lsh
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
client.from('jobs').select('*').limit(1).then(console.log);
"

# Test Postgres connection (MCLI)
cd ~/repos/mcli
python -c "
from mcli.ml.config import settings
print(f'DB URL: {settings.database.url}')
"
```

### MCLI Not Found

```bash
# Reinstall MCLI
cd ~/repos/mcli
uv sync

# Or use explicit path
export PATH="$HOME/.local/bin:$PATH"
hash -r
```

## Integration Examples

### Trigger ML Training from LSH

```bash
# Create a job that runs MCLI training
lsh daemon job create \
  --name "nightly-ml-training" \
  --schedule "0 2 * * *" \
  --command "mcli model train --config configs/production.yaml"

# Trigger immediately
lsh daemon job trigger <job-id>
```

### Monitor Training from Dashboard

1. Start the ML dashboard: `mcli workflow dashboard launch`
2. Open http://localhost:8501
3. Select "Training Monitoring" tab
4. View real-time metrics as LSH daemon runs the job

### API Integration Example

```python
# Python script using both APIs
import requests

# LSH API
lsh_api = "http://localhost:3030"
api_key = "your_api_key"

# Create a job
response = requests.post(
    f"{lsh_api}/api/jobs",
    headers={"X-API-Key": api_key},
    json={
        "name": "ML Training",
        "command": "mcli model train",
        "type": "shell"
    }
)

job_id = response.json()["id"]

# Trigger the job
requests.post(f"{lsh_api}/api/jobs/{job_id}/trigger")

# Poll MCLI for results
# ... (use MCLI client library)
```

## Next Steps

1. **Set up scheduled ML training jobs** using LSH daemon
2. **Configure data pipelines** to feed models
3. **Create monitoring alerts** for failed jobs
4. **Set up webhooks** to notify on training completion
5. **Integrate with CI/CD** for automated model deployment

## Quick Reference

```bash
# Start everything (one command)
./launch-dashboard.sh

# Or manually:
lsh daemon start                         # Start job daemon
node dist/pipeline/pipeline-service.js   # Start pipeline service
mcli workflow dashboard launch           # Start ML dashboard

# Stop everything
pkill -f "lshd"
pkill -f "pipeline-service"
pkill -f "streamlit"
```

## Additional Resources

- LSH Documentation: `lsh help`
- MCLI Documentation: `mcli --help`
- Pipeline API: http://localhost:3034/api/docs (when running)
- Dashboard Source: `~/repos/lsh/src/cicd/dashboard/`
- ML Dashboard Source: `~/repos/mcli/src/mcli/ml/dashboard/`
