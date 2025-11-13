# LSH Daemon Integration with Supabase

This document describes the complete integration between LSH, the job daemon (lshd), and Supabase PostgreSQL for creating and managing database-backed cron jobs.

## Overview

The daemon integration provides:
- **Persistent Job Management**: Jobs run independently of shell sessions
- **Database Persistence**: All job data is stored in Supabase PostgreSQL
- **Cron Scheduling**: Full cron expression support with timezone handling
- **Job Monitoring**: Real-time status tracking and execution history
- **Template System**: Pre-built job templates for common tasks
- **Comprehensive Reporting**: Detailed analytics and performance metrics

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│     LSH     │◄──►│   Daemon     │◄──►│  Supabase   │
│   Client    │    │   (lshd)     │    │ PostgreSQL │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                     │
       │                   │                     │
   Commands            Job Execution         Data Storage
   & Control          & Scheduling          & Analytics
```

## Quick Start

### 1. Start the Daemon

```bash
# Start the daemon
lsh daemon start

# Check daemon status
lsh daemon status
```

### 2. Create a Database-Backed Cron Job

```bash
# Create a job from template
lsh cron create-from-template database-backup

# Create a custom job
lsh daemon job create \
  --name "Daily Backup" \
  --command "tar -czf /backups/backup_$(date +%Y%m%d).tar.gz /data" \
  --schedule "0 2 * * *" \
  --working-dir "/backups" \
  --priority 8
```

### 3. Monitor Jobs

```bash
# List all jobs
lsh cron list

# Get job report
lsh cron report job_123

# Get comprehensive report
lsh cron comprehensive-report
```

## Available Commands

### Daemon Management

```bash
# Daemon control
lsh daemon start          # Start the daemon
lsh daemon stop           # Stop the daemon
lsh daemon restart        # Restart the daemon
lsh daemon status         # Get daemon status

# Job management
lsh daemon job create     # Create a new job
lsh daemon job list       # List all jobs
lsh daemon job start <id> # Start a job
lsh daemon job stop <id>  # Stop a job
lsh daemon job remove <id> # Remove a job
lsh daemon job info <id>  # Get job information

# Database integration
lsh daemon db history     # Get job execution history
lsh daemon db stats       # Get job statistics
```

### Cron Job Management

```bash
# Templates
lsh cron templates                    # List available templates
lsh cron create-from-template <id>   # Create job from template

# Job management
lsh cron list                         # List all cron jobs
lsh cron start <jobId>                # Start a job
lsh cron stop <jobId>                 # Stop a job
lsh cron remove <jobId>               # Remove a job
lsh cron info <jobId>                 # Get job information

# Reporting
lsh cron report <jobId>               # Get job execution report
lsh cron reports                      # Get reports for all jobs
lsh cron comprehensive-report         # Generate comprehensive report
lsh cron export --format json         # Export job data
```

## Job Templates

### Available Templates

1. **database-backup**: Daily database backup
   - Command: `pg_dump -h localhost -U postgres mydb > /backups/mydb_$(date +%Y%m%d).sql`
   - Schedule: `0 2 * * *` (Daily at 2 AM)
   - Category: backup

2. **log-cleanup**: Clean old log files
   - Command: `find /var/log -name "*.log" -mtime +30 -delete`
   - Schedule: `0 3 * * 0` (Weekly on Sunday at 3 AM)
   - Category: maintenance

3. **disk-monitor**: Monitor disk space
   - Command: `df -h | awk '$5 > 80 {print $0}' | mail -s "Disk Space Alert" admin@example.com`
   - Schedule: `*/15 * * * *` (Every 15 minutes)
   - Category: monitoring

4. **data-sync**: Data synchronization
   - Command: `rsync -av /data/ user@remote:/backup/data/`
   - Schedule: `0 1 * * *` (Daily at 1 AM)
   - Category: data-processing

### Creating Jobs from Templates

```bash
# Create a database backup job
lsh cron create-from-template database-backup \
  --name "Production DB Backup" \
  --command "pg_dump -h prod-db -U backup prod_db > /backups/prod_$(date +%Y%m%d).sql" \
  --working-dir "/backups"

# Create a custom log cleanup job
lsh cron create-from-template log-cleanup \
  --name "Application Log Cleanup" \
  --command "find /var/log/app -name '*.log' -mtime +7 -delete" \
  --schedule "0 4 * * *"
```

## Cron Schedule Examples

```bash
# Every minute
"* * * * *"

# Every 5 minutes
"*/5 * * * *"

# Every hour
"0 * * * *"

# Daily at 2 AM
"0 2 * * *"

# Weekly on Sunday at 3 AM
"0 3 * * 0"

# Monthly on the 1st at midnight
"0 0 1 * *"

# Weekdays at 9 AM
"0 9 * * 1-5"

# Every 15 minutes during business hours (9 AM - 5 PM)
"*/15 9-17 * * 1-5"
```

## Database Schema

The integration uses the following Supabase tables:

### shell_jobs
- `id`: UUID primary key
- `user_id`: User identifier (optional)
- `session_id`: Session identifier
- `job_id`: Job identifier
- `command`: Command to execute
- `status`: Job status (running, stopped, completed, failed)
- `working_directory`: Working directory
- `started_at`: Job start time
- `completed_at`: Job completion time
- `exit_code`: Exit code
- `output`: Job output
- `error`: Error message

### shell_sessions
- `id`: UUID primary key
- `session_id`: Session identifier
- `hostname`: Hostname
- `working_directory`: Working directory
- `environment_variables`: Environment variables (JSONB)
- `started_at`: Session start time
- `ended_at`: Session end time
- `is_active`: Active status

## Job Lifecycle

1. **Creation**: Job is created via CLI and stored in database
2. **Scheduling**: Daemon checks for scheduled jobs every 10 seconds
3. **Execution**: Job is started when schedule matches
4. **Monitoring**: Status is tracked in real-time
5. **Completion**: Results are stored in database
6. **Reporting**: Analytics are generated from execution history

## Monitoring and Alerting

### Job Status Monitoring

```bash
# Check job status
lsh cron info job_123

# Get execution history
lsh daemon db history --job-id job_123

# Get statistics
lsh daemon db stats --job-id job_123
```

### Performance Metrics

- **Success Rate**: Percentage of successful executions
- **Average Duration**: Mean execution time
- **Resource Usage**: Memory and CPU consumption
- **Error Analysis**: Common failure patterns
- **Trend Analysis**: Performance over time

## Error Handling

### Retry Logic
- Configurable maximum retries per job
- Exponential backoff for retries
- Failure notifications

### Error Types
- **Command Errors**: Non-zero exit codes
- **Timeout Errors**: Jobs exceeding time limit
- **Resource Errors**: Memory/CPU limits exceeded
- **System Errors**: Daemon or database issues

## Security Considerations

### Access Control
- User-based job isolation
- Permission-based command execution
- Secure environment variable handling

### Data Protection
- Encrypted database connections
- Secure credential storage
- Audit logging

## Performance Optimization

### Daemon Configuration
- Adjustable check intervals
- Memory usage limits
- Concurrent job limits

### Database Optimization
- Proper indexing on job tables
- Regular cleanup of old records
- Connection pooling

## Troubleshooting

### Common Issues

1. **Daemon Not Running**
   ```bash
   lsh daemon status
   lsh daemon start
   ```

2. **Job Not Executing**
   ```bash
   lsh cron info <jobId>
   lsh daemon job start <jobId>
   ```

3. **Database Connection Issues**
   ```bash
   lsh supabase test
   lsh supabase sync
   ```

4. **Permission Errors**
   ```bash
   # Check job working directory permissions
   ls -la /path/to/job/directory
   
   # Check daemon user permissions
   ps aux | grep lshd
   ```

### Logs and Debugging

```bash
# Daemon logs
tail -f /tmp/lsh-job-daemon.log

# Job execution logs
lsh cron report <jobId>

# Database logs
lsh supabase history --search "error"
```

## Advanced Usage

### Custom Job Templates

```typescript
// Create custom template
const customTemplate = {
  id: 'custom-backup',
  name: 'Custom Backup',
  description: 'Custom backup job',
  command: 'custom-backup-script.sh',
  schedule: '0 1 * * *',
  category: 'backup',
  tags: ['custom', 'backup'],
  environment: { BACKUP_PATH: '/backups' },
  workingDirectory: '/scripts',
  priority: 7,
  maxRetries: 3,
  timeout: 1800000, // 30 minutes
};
```

### Programmatic Job Management

```typescript
import CronJobManager from './lib/cron-job-manager.js';

const manager = new CronJobManager('user123');
await manager.connect();

// Create job from template
const job = await manager.createJobFromTemplate('database-backup', {
  name: 'Production Backup',
  command: 'pg_dump prod_db > /backups/prod.sql'
});

// Get job report
const report = await manager.getJobReport(job.id);
console.log(`Success rate: ${report.successRate}%`);

// Generate comprehensive report
const comprehensiveReport = await manager.generateComprehensiveReport();
console.log(comprehensiveReport);
```

## Integration Examples

### Database Backup Automation

```bash
# Create daily backup job
lsh cron create-from-template database-backup \
  --name "Daily Production Backup" \
  --command "pg_dump -h prod-db -U backup prod_db | gzip > /backups/prod_$(date +%Y%m%d).sql.gz" \
  --working-dir "/backups" \
  --priority 9

# Monitor backup job
lsh cron report job_daily_backup
```

### Log Management

```bash
# Create log rotation job
lsh daemon job create \
  --name "Log Rotation" \
  --command "logrotate /etc/logrotate.conf" \
  --schedule "0 0 * * *" \
  --working-dir "/var/log" \
  --priority 5

# Create log cleanup job
lsh cron create-from-template log-cleanup \
  --name "Application Log Cleanup" \
  --command "find /var/log/app -name '*.log' -mtime +30 -delete"
```

### System Monitoring

```bash
# Create disk monitoring job
lsh cron create-from-template disk-monitor \
  --name "Disk Space Alert" \
  --command "df -h | awk '\$5 > 85 {print \$0}' | mail -s 'Disk Alert' admin@company.com"

# Create system health check
lsh daemon job create \
  --name "System Health Check" \
  --command "system-health-check.sh" \
  --schedule "*/10 * * * *" \
  --priority 8
```

## Conclusion

The LSH daemon integration with Supabase provides a robust, scalable solution for managing scheduled jobs with full database persistence and monitoring capabilities. The system is designed for production use with comprehensive error handling, security features, and performance optimization.

For more information, see the source code in the `src/lib/` and `src/services/` directories.