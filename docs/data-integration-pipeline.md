# LSH + MCLI Data Integration Pipeline

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         SUPABASE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Trading  │  │ Shell    │  │  Jobs    │  │ Analytics│    │
│  │  Data    │  │ History  │  │  Table   │  │  Tables  │    │
│  └────▲─────┘  └────▲─────┘  └────▲─────┘  └────▲─────┘    │
│       │             │             │             │            │
└───────┼─────────────┼─────────────┼─────────────┼────────────┘
        │             │             │             │
        │      ┌──────┴─────────────┴─────────────┴──────┐
        │      │                                          │
        │      │         LSH DAEMON + API SERVER         │
        │      │                                          │
        │      │  ┌────────────────────────────────┐    │
        │      │  │   Scheduled Jobs (Cron)        │    │
        │      │  │   - Politician Trading Monitor │    │
        │      │  │   - Data Consistency Checks    │    │
        │      │  │   - Performance Monitoring     │    │
        │      │  └────────────┬───────────────────┘    │
        │      │               │                         │
        │      │  ┌────────────▼───────────────────┐    │
        │      │  │   API Server (Port 3030)       │    │
        │      │  │   - REST Endpoints              │    │
        │      │  │   - WebSocket/SSE Events        │    │
        │      │  │   - Webhook Dispatcher          │    │
        │      │  └────────────┬───────────────────┘    │
        │      └───────────────┼─────────────────────────┘
        │                      │
        │                      │ Events/Webhooks
        │                      │
        │      ┌───────────────▼─────────────────────────┐
        │      │           MCLI (DI Listener)            │
        │      │                                          │
        │      │  ┌────────────────────────────────┐    │
        │      │  │   Event Processor               │    │
        │      │  │   - Listen for LSH events       │    │
        │      │  │   - Transform data              │    │
        │      │  │   - Apply business logic        │    │
        │      │  └────────────┬───────────────────┘    │
        │      │               │                         │
        │      │  ┌────────────▼───────────────────┐    │
        │      │  │   Data Pipeline                 │    │
        │      │  │   - ETL Processing              │    │
        │      │  │   - Validation                  │    │
        │      │  │   - Enrichment                  │    │
        │      │  └────────────┬───────────────────┘    │
        │      └───────────────┼─────────────────────────┘
        │                      │
        └──────────────────────┘
                    Write Back
```

## Implementation Steps

### 1. LSH Daemon Configuration

```javascript
// LSH Daemon starts with API enabled
export LSH_API_ENABLED=true
export LSH_API_PORT=3030
export LSH_API_KEY=your-secure-key
export LSH_ENABLE_WEBHOOKS=true

lsh daemon restart
```

### 2. Create Supabase Integration Jobs

```javascript
// Example: Politician Trading Monitor Job
const tradingMonitorJob = {
  id: 'politician-trading-monitor',
  name: 'Politician Trading Monitor',
  command: `node scripts/monitoring-jobs/politician-trading-monitor.sh`,
  schedule: { cron: '0 */6 * * *' }, // Every 6 hours
  environment: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_ANON_KEY
  },
  databaseSync: true,
  onComplete: {
    webhook: 'http://localhost:4000/mcli/trading-data-received'
  }
};

// Register with LSH
await lshClient.createJob(tradingMonitorJob);
```

### 3. MCLI Event Listener Setup

```javascript
// mcli/src/listeners/lsh-listener.js
import express from 'express';
import { EventEmitter } from 'events';

class LSHDataListener extends EventEmitter {
  constructor(config) {
    super();
    this.app = express();
    this.port = config.port || 4000;
    this.setupRoutes();
  }

  setupRoutes() {
    // Webhook endpoint for LSH events
    this.app.post('/mcli/trading-data-received', async (req, res) => {
      const { event, data, timestamp } = req.body;

      // Emit for processing pipeline
      this.emit('trading:data', {
        source: 'lsh',
        event,
        data,
        timestamp
      });

      res.json({ success: true });
    });

    // SSE connection to LSH API
    this.connectToLSH();
  }

  async connectToLSH() {
    const eventSource = new EventSource('http://localhost:3030/api/events');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch(data.type) {
        case 'job:completed':
          if (data.data.id.includes('politician-trading')) {
            this.processTradingData(data.data);
          }
          break;

        case 'supabase:sync':
          this.processSupabaseSync(data);
          break;
      }
    };
  }

  async processTradingData(jobData) {
    // Extract output from job
    const { stdout, jobId, completedAt } = jobData;

    // Parse trading data
    const trades = this.parseTradingOutput(stdout);

    // Apply transformations
    const enrichedTrades = await this.enrichTrades(trades);

    // Write to destination
    await this.writeToDataWarehouse(enrichedTrades);

    // Trigger downstream processes
    this.emit('trading:processed', {
      jobId,
      recordCount: enrichedTrades.length,
      timestamp: completedAt
    });
  }
}
```

### 4. Data Processing Pipeline

```javascript
// mcli/src/pipelines/trading-pipeline.js
class TradingDataPipeline {
  constructor(listener) {
    this.listener = listener;
    this.setupPipeline();
  }

  setupPipeline() {
    this.listener.on('trading:data', async (payload) => {
      try {
        // Stage 1: Validation
        const validated = await this.validate(payload.data);

        // Stage 2: Transformation
        const transformed = await this.transform(validated);

        // Stage 3: Enrichment
        const enriched = await this.enrich(transformed);

        // Stage 4: Load
        await this.load(enriched);

        // Stage 5: Notify
        await this.notify({
          status: 'success',
          records: enriched.length
        });

      } catch (error) {
        await this.handleError(error, payload);
      }
    });
  }

  async validate(data) {
    // Validate schema
    // Check for required fields
    // Verify data types
    return data;
  }

  async transform(data) {
    // Apply business rules
    // Calculate derived fields
    // Normalize data
    return data;
  }

  async enrich(data) {
    // Add market data
    // Add historical context
    // Add analytics
    return data;
  }

  async load(data) {
    // Write to data warehouse
    // Update materialized views
    // Trigger downstream jobs
  }
}
```

### 5. Webhook Configuration

```javascript
// Configure LSH to send webhooks to MCLI
const webhookConfig = {
  endpoints: [
    'http://localhost:4000/mcli/job-completed',
    'http://localhost:4000/mcli/job-failed'
  ],
  events: ['job:completed', 'job:failed', 'supabase:sync'],
  retryPolicy: {
    maxRetries: 3,
    backoff: 'exponential'
  }
};

// Register webhooks
await fetch('http://localhost:3030/api/webhooks', {
  method: 'POST',
  headers: {
    'X-API-Key': LSH_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookConfig)
});
```

### 6. Monitoring and Observability

```javascript
// Monitor pipeline health
const monitor = {
  metrics: {
    jobsProcessed: 0,
    recordsTransformed: 0,
    errors: 0,
    avgProcessingTime: 0
  },

  async checkHealth() {
    // Check LSH daemon status
    const lshStatus = await fetch('http://localhost:3030/api/status');

    // Check MCLI listener
    const mcliStatus = await this.checkMCLIHealth();

    // Check Supabase connection
    const dbStatus = await this.checkDatabaseHealth();

    return {
      lsh: lshStatus.ok,
      mcli: mcliStatus,
      database: dbStatus,
      metrics: this.metrics
    };
  }
};
```

## Integration Benefits

1. **Real-time Data Flow**: SSE/WebSocket connections enable real-time data streaming
2. **Fault Tolerance**: Webhook retries and job persistence ensure data integrity
3. **Scalability**: Distributed architecture allows independent scaling
4. **Observability**: Built-in monitoring and event tracking
5. **Flexibility**: Multiple integration patterns (webhooks, polling, streaming)

## Example Use Cases

### 1. Politician Trading Alerts
```bash
# LSH job fetches trading data every 6 hours
# MCLI processes and enriches the data
# Alerts generated for significant trades
```

### 2. Shell Command Analytics
```bash
# LSH tracks all shell commands
# MCLI aggregates usage patterns
# Generates daily/weekly reports
```

### 3. Performance Monitoring
```bash
# LSH monitors system metrics
# MCLI analyzes trends
# Auto-scales resources based on patterns
```

## Next Steps

1. Set up MCLI listener service
2. Configure webhook endpoints
3. Create data transformation rules
4. Set up monitoring dashboards
5. Implement error handling and retry logic
6. Add authentication between services
7. Deploy to production environment