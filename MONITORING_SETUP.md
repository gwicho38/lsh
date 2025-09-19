# 🔄 LSH Multi-Database Monitoring System

Complete monitoring solution for your Supabase databases and LSH shell operations.

## 📊 **What Was Created**

### **Core Setup Script**
- `scripts/setup-monitoring-jobs.sh` - Main setup script that creates all monitoring jobs

### **Individual Monitoring Jobs** (in `scripts/monitoring-jobs/`)
1. **`db-health-monitor.sh`** - Database connectivity and health (every 5 min)
2. **`politician-trading-monitor.sh`** - New trading disclosures (every 30 min)
3. **`shell-analytics.sh`** - Shell usage patterns (hourly)
4. **`data-consistency-check.sh`** - Data integrity validation (every 6 hours)
5. **`performance-monitor.sh`** - System performance metrics (every 15 min)
6. **`alert-monitor.sh`** - Critical issue detection (every 2 min)
7. **`daily-summary.sh`** - Comprehensive daily report (daily at 9 AM)
8. **`log-cleanup.sh`** - Clean old logs (daily at 2 AM)

### **Dashboard & Management**
- `scripts/monitor-dashboard.sh` - Real-time monitoring dashboard
- `scripts/monitor-status.sh` - Quick status check
- `scripts/setup-system-cron.sh` - Add jobs to system cron
- `scripts/run-all-monitoring.sh` - Manual execution of all jobs

## 🚀 **Quick Start**

### **1. Initial Setup**
```bash
# Create all monitoring jobs
./scripts/setup-monitoring-jobs.sh
```

### **2. View Real-time Dashboard**
```bash
# Static dashboard
./scripts/monitor-dashboard.sh

# Live updating dashboard (updates every 30 seconds)
./scripts/monitor-dashboard.sh --live
```

### **3. Add to System Cron (Recommended)**
```bash
# Install all jobs to system crontab
./scripts/setup-system-cron.sh --install

# View installed cron jobs
./scripts/setup-system-cron.sh --list

# Remove from cron if needed
./scripts/setup-system-cron.sh --remove
```

### **4. Manual Execution**
```bash
# Run all monitoring jobs once
./scripts/run-all-monitoring.sh

# Run specific job
./scripts/run-all-monitoring.sh db-health-monitor
```

## 📋 **Monitoring Schedule**

| Job | Frequency | Purpose |
|-----|-----------|---------|
| 🏥 Database Health | Every 5 min | Connection status, response times |
| 🏛️ Trading Monitor | Every 30 min | New politician disclosures |
| 📊 Shell Analytics | Hourly | Command patterns, job success rates |
| 🔍 Data Consistency | Every 6 hours | Integrity checks, duplicate detection |
| ⚡ Performance | Every 15 min | CPU, memory, disk usage |
| 🚨 Alert Monitor | Every 2 min | Critical issue detection |
| 📈 Daily Summary | 9 AM daily | Comprehensive reports |
| 🧹 Log Cleanup | 2 AM daily | Remove old logs |

## 📊 **Database Coverage**

### **mcli Database** (Primary Focus)
- **Politician Trading Tables**: `politicians`, `trading_disclosures`, `data_pull_jobs`
- **Shell Operations**: `shell_history`, `shell_jobs`, `shell_sessions`
- **Health Monitoring**: Connection status, data freshness, collection job status

### **Conduit Database**
- Connection monitoring
- Reservation system health (when accessible)

### **lefv.io Database**
- Connection status (currently inactive/limited access)

## 🔧 **Management Commands**

### **View Status**
```bash
./scripts/monitor-status.sh           # Quick system status
./scripts/monitor-dashboard.sh        # Full dashboard
crontab -l | grep monitoring-jobs     # System cron jobs
```

### **View Logs**
```bash
ls logs/                              # All monitoring logs
tail -f logs/db-health-monitor.log    # Live database health
tail -f logs/politician-trading-monitor.log  # Trading activity
```

### **Manual Operations**
```bash
# Test single monitoring job
./scripts/monitoring-jobs/db-health-monitor.sh

# Run all jobs manually
./scripts/run-all-monitoring.sh

# Check specific database
lsh supabase test
```

## 🚨 **Alert System**

### **Critical Alerts** (Immediate Action)
- Database connection failures
- Data collection job failures (3+ consecutive)
- High disk usage (>80%)
- API rate limiting

### **Warning Alerts** (Monitor)
- Slow response times (>100ms)
- Data staleness (>2 hours)
- Background job queue backlog

### **Daily Reports**
- Collection statistics
- Performance trends
- Usage analytics
- Optimization recommendations

## 📈 **Expected Outputs**

### **Database Health Monitor**
```
[2025-09-16 22:17:10] 🏥 DB Health Check: mcli=✅ conduit=✅ lefv.io=⚠️ inactive
Testing Supabase connection...
✅ Supabase connection successful
Response time: 45ms, Status: Healthy
```

### **Politician Trading Monitor**
```
[2025-09-16 22:17:11] 🏛️ Trading Monitor: Checking for new disclosures...
Found 3 new disclosures in last 30 minutes
Latest: Nancy Pelosi - NVDA purchase - $25K-50K range
```

### **Dashboard Output**
```
┌─ Database Status ──────────────────────────────────────────┐
│ ✅ mcli (Politician Trading)    | 45ms | 2.1GB           │
│ ✅ Conduit (Reservations)       | 23ms | 890MB           │
│ ⚠️  lefv.io (Personal)          | N/A  | Inactive        │
└────────────────────────────────────────────────────────────┘
```

## 🛠 **Troubleshooting**

### **Common Issues**

1. **"Daemon not accessible"**
   ```bash
   sudo lsh daemon start
   ps aux | grep lshd  # Check processes
   ```

2. **"Permission denied"**
   ```bash
   chmod +x scripts/monitoring-jobs/*.sh
   chmod +x scripts/*.sh
   ```

3. **"Cron jobs not running"**
   ```bash
   crontab -l  # Check installed jobs
   tail -f logs/*.log  # Check execution logs
   ```

4. **"Database connection failed"**
   ```bash
   lsh supabase test  # Test connectivity
   # Check API keys and permissions
   ```

## 📁 **File Structure**
```
lsh/
├── scripts/
│   ├── setup-monitoring-jobs.sh     # Main setup
│   ├── setup-system-cron.sh         # Cron installation
│   ├── monitor-dashboard.sh          # Real-time dashboard
│   ├── monitor-status.sh             # Quick status
│   ├── run-all-monitoring.sh         # Manual execution
│   └── monitoring-jobs/              # Individual job scripts
│       ├── db-health-monitor.sh
│       ├── politician-trading-monitor.sh
│       ├── shell-analytics.sh
│       ├── data-consistency-check.sh
│       ├── performance-monitor.sh
│       ├── alert-monitor.sh
│       ├── daily-summary.sh
│       └── log-cleanup.sh
├── logs/                             # All monitoring logs
└── MONITORING_SETUP.md               # This documentation
```

---

🎉 **Your comprehensive monitoring system is ready!**

Start with: `./scripts/setup-system-cron.sh --install` to enable automatic monitoring.