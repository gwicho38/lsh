# LSH Monitoring Commands Reference

## ✅ BUILT-IN LSH COMMANDS

### Core Daemon Management
```bash
# Check daemon status
lsh daemon status

# Start/stop/restart daemon
lsh daemon start
lsh daemon stop
lsh daemon restart

# Clean up daemon processes
lsh daemon cleanup
```

### Job Management Commands
```bash
# List all monitoring jobs
lsh daemon job list

# Create a new monitoring job
lsh daemon job create --name "job-name" --command "command" --schedule "*/5 * * * *"

# Trigger specific job immediately
lsh daemon job trigger <job-id>

# Trigger all jobs at once
lsh daemon job trigger-all

# Get job information
lsh daemon job info <job-id>

# Stop a running job
lsh daemon job stop <job-id>

# Remove a job
lsh daemon job remove <job-id> --force
```

### Database Integration Commands
```bash
# View job statistics
lsh daemon db stats

# View execution history
lsh daemon db history

# Show recent executions with output
lsh daemon db recent

# Check specific job status
lsh daemon db status <job-id>

# Sync jobs to database
lsh daemon db sync
```

### Supabase Database Commands
```bash
# Test database connection
lsh supabase test

# Query database
lsh supabase query --table "trading_disclosures" --select "*" --limit 10
```

## 📊 EXTERNAL MONITORING SCRIPTS

### Setup and Configuration
```bash
# Initial setup of all monitoring jobs
./scripts/setup-monitoring-jobs.sh

# Setup system cron jobs
./scripts/setup-system-cron.sh

# Install daemon as system service
./scripts/install-daemon.sh
```

### Monitoring Dashboards
```bash
# View monitoring dashboard
./scripts/monitor-dashboard.sh

# Live monitoring (refreshes every 30s)
./scripts/monitor-dashboard.sh --live

# Check monitoring status
./scripts/monitor-status.sh
```

### Validation and Testing
```bash
# Validate all cron jobs are running
./scripts/validate-cron-jobs.sh

# Test live monitoring system
./scripts/test-live-monitoring.sh

# Run all monitoring jobs manually
./scripts/run-all-monitoring.sh
```

### Maintenance Scripts
```bash
# Clean up daemon processes
./scripts/daemon-cleanup.sh

# Restart daemon safely
./scripts/daemon-restart.sh

# Repair LSH user permissions
./scripts/repair-lsh-user.sh

# Clean up old user data
./scripts/cleanup-old-user.sh

# Uninstall monitoring system
./scripts/uninstall.sh
```

## 📁 MONITORING JOB SCRIPTS

Located in `/scripts/monitoring-jobs/`:

```bash
# Database health check (every 5 min)
./scripts/monitoring-jobs/db-health-monitor.sh

# Politician trading monitor (every 30 min)
./scripts/monitoring-jobs/politician-trading-monitor.sh

# Shell analytics (hourly)
./scripts/monitoring-jobs/shell-analytics.sh

# Data consistency check (every 6 hours)
./scripts/monitoring-jobs/data-consistency-check.sh

# Performance monitor (every 15 min)
./scripts/monitoring-jobs/performance-monitor.sh

# Alert monitor (every 2 min)
./scripts/monitoring-jobs/alert-monitor.sh

# Daily summary (9 AM daily)
./scripts/monitoring-jobs/daily-summary.sh

# Log cleanup (2 AM daily)
./scripts/monitoring-jobs/log-cleanup.sh
```

## 📈 LOG FILE LOCATIONS

```bash
# View daemon log
tail -f /tmp/lsh-job-daemon-lefv.log

# Check scheduled executions
tail -f /tmp/lsh-job-daemon-lefv.log | grep "Started scheduled"

# Monitor job logs
tail -f /Users/lefv/repos/lsh/logs/db-health-monitor.log
tail -f /Users/lefv/repos/lsh/logs/politician-trading-monitor.log
tail -f /Users/lefv/repos/lsh/logs/performance-monitor.log
tail -f /Users/lefv/repos/lsh/logs/shell-analytics.log
tail -f /Users/lefv/repos/lsh/logs/alert-monitor.log
tail -f /Users/lefv/repos/lsh/logs/data-consistency-check.log
tail -f /Users/lefv/repos/lsh/logs/daily-summary.log
tail -f /Users/lefv/repos/lsh/logs/log-cleanup.log
```

## 🔧 COMMON OPERATIONS

### Check if jobs are running automatically
```bash
# Quick status check
lsh daemon status

# See recent executions
tail -10 /tmp/lsh-job-daemon-lefv.log | grep "Started scheduled"

# Validate automatic execution
./scripts/validate-cron-jobs.sh
```

### Troubleshoot issues
```bash
# Check for errors in daemon log
tail -100 /tmp/lsh-job-daemon-lefv.log | grep -i error

# Check specific job output
lsh daemon job trigger <job-id>

# Restart daemon if stuck
lsh daemon restart

# Re-register all monitoring jobs
./scripts/setup-monitoring-jobs.sh
```

### Monitor system health
```bash
# View real-time dashboard
./scripts/monitor-dashboard.sh --live

# Check database connectivity
lsh supabase test

# View job statistics
lsh daemon db stats
```

## 🚀 QUICK START

1. **Setup monitoring:**
   ```bash
   ./scripts/setup-monitoring-jobs.sh
   ```

2. **Start daemon:**
   ```bash
   lsh daemon start
   ```

3. **Verify it's working:**
   ```bash
   lsh daemon status
   ./scripts/validate-cron-jobs.sh
   ```

4. **View dashboard:**
   ```bash
   ./scripts/monitor-dashboard.sh --live
   ```

## 📊 JOB SCHEDULES

- **Every 2 minutes:** alert-monitor
- **Every 5 minutes:** db-health-monitor
- **Every 15 minutes:** performance-monitor
- **Every 30 minutes:** politician-trading-monitor
- **Every hour:** shell-analytics
- **Every 6 hours:** data-consistency-check
- **Daily at 9 AM:** daily-summary
- **Daily at 2 AM:** log-cleanup