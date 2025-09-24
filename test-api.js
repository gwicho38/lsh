import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    cpu_usage: Math.random() * 100,
    memory_usage: Math.random() * 100,
    disk_usage: Math.random() * 100,
    network_io: Math.random() * 1000000,
    job_queue_size: Math.floor(Math.random() * 10),
    active_jobs: Math.floor(Math.random() * 5)
  });
});

app.get('/api/jobs', (req, res) => {
  const jobs = ['politician-trading-monitor', 'db-health-monitor', 'shell-analytics', 'system-metrics-collector'];
  res.json(jobs.map(job => ({
    job_name: job,
    last_run: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    status: Math.random() > 0.8 ? 'failure' : 'success',
    duration_ms: Math.floor(Math.random() * 5000)
  })));
});

app.get('/api/trades', (req, res) => {
  res.json([
    { name: 'Nancy Pelosi', ticker: 'NVDA', amount: '$1M - $5M', transaction_type: 'Purchase', transaction_date: '2025-01-20' },
    { name: 'Dan Crenshaw', ticker: 'TSLA', amount: '$500K - $1M', transaction_type: 'Sale', transaction_date: '2025-01-19' },
    { name: 'Josh Gottheimer', ticker: 'AAPL', amount: '$100K - $250K', transaction_type: 'Purchase', transaction_date: '2025-01-18' },
    { name: 'Mark Green', ticker: 'MSFT', amount: '$250K - $500K', transaction_type: 'Purchase', transaction_date: '2025-01-17' },
    { name: 'Michael McCaul', ticker: 'GOOGL', amount: '$1M - $5M', transaction_type: 'Sale', transaction_date: '2025-01-16' }
  ]);
});

app.get('/api/alerts', (req, res) => {
  const alerts = [];
  if (Math.random() > 0.5) {
    alerts.push({
      id: `alert-${Date.now()}`,
      severity: 'warning',
      message: 'High memory usage detected (>80%)',
      timestamp: new Date().toISOString(),
      resolved: false
    });
  }
  res.json(alerts);
});

const PORT = 3031;
app.listen(PORT, () => {
  console.log(`Test monitoring API running on port ${PORT}`);
});