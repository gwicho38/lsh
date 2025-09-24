import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface PipelineJob {
  id?: string;
  externalId?: string;
  name: string;
  type: string;
  sourceSystem: string;
  targetSystem: string;
  status: JobStatus;
  priority: JobPriority;
  config: any;
  parameters?: any;
  cpuRequest?: number;
  memoryRequest?: number;
  gpuRequest?: number;
  scheduledAt?: Date;
  tags?: string[];
  labels?: Record<string, string>;
  owner?: string;
  team?: string;
  createdBy?: string;
}

export interface JobExecution {
  id?: string;
  jobId: string;
  executionNumber: number;
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  cpuUsed?: number;
  memoryUsed?: number;
  gpuUsed?: number;
  executor?: string;
  workerNode?: string;
  containerId?: string;
  inputDatasets?: any[];
  outputDatasets?: any[];
  artifacts?: any[];
  result?: any;
  errorMessage?: string;
  errorDetails?: any;
  retryCount?: number;
  retryAfter?: Date;
  logUrl?: string;
  metrics?: Record<string, any>;
}

export enum JobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface JobEvent {
  type: string;
  jobId: string;
  executionId?: string;
  data: any;
  timestamp: Date;
}

export class JobTracker extends EventEmitter {
  private pool: Pool;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    super();
    this.pool = pool;
  }

  // Job Management
  async createJob(job: PipelineJob): Promise<PipelineJob> {
    const id = job.id || uuidv4();
    const query = `
      INSERT INTO pipeline_jobs (
        id, external_id, name, type, source_system, target_system,
        status, priority, config, parameters, cpu_request, memory_request,
        gpu_request, scheduled_at, tags, labels, owner, team, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) RETURNING *
    `;

    const values = [
      id,
      job.externalId,
      job.name,
      job.type,
      job.sourceSystem || 'lsh',
      job.targetSystem || 'mcli',
      job.status || JobStatus.PENDING,
      job.priority || JobPriority.NORMAL,
      JSON.stringify(job.config),
      job.parameters ? JSON.stringify(job.parameters) : null,
      job.cpuRequest,
      job.memoryRequest,
      job.gpuRequest || 0,
      job.scheduledAt,
      job.tags,
      job.labels ? JSON.stringify(job.labels) : null,
      job.owner,
      job.team,
      job.createdBy
    ];

    const result = await this.pool.query(query, values);
    const createdJob = this.parseJobRow(result.rows[0]);

    // Emit job created event
    this.emit('job:created', {
      type: 'job:created',
      jobId: createdJob.id,
      data: createdJob,
      timestamp: new Date()
    });

    // Create initial execution
    await this.createExecution(createdJob.id!);

    return createdJob;
  }

  async getJob(jobId: string): Promise<PipelineJob | null> {
    const query = 'SELECT * FROM pipeline_jobs WHERE id = $1';
    const result = await this.pool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseJobRow(result.rows[0]);
  }

  async updateJobStatus(jobId: string, status: JobStatus, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE pipeline_jobs
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [jobId, status]);

    // Update latest execution
    const execQuery = `
      UPDATE job_executions
      SET status = $2, error_message = $3
      WHERE job_id = $1 AND execution_number = (
        SELECT MAX(execution_number) FROM job_executions WHERE job_id = $1
      )
    `;

    await this.pool.query(execQuery, [jobId, status, errorMessage]);

    // Emit status change event
    this.emit('job:status_changed', {
      type: 'job:status_changed',
      jobId,
      data: { status, errorMessage },
      timestamp: new Date()
    });
  }

  async listJobs(filters: {
    status?: JobStatus;
    sourceSystem?: string;
    targetSystem?: string;
    owner?: string;
    team?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ jobs: PipelineJob[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      whereClause += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    if (filters.sourceSystem) {
      whereClause += ` AND source_system = $${++paramCount}`;
      values.push(filters.sourceSystem);
    }

    if (filters.targetSystem) {
      whereClause += ` AND target_system = $${++paramCount}`;
      values.push(filters.targetSystem);
    }

    if (filters.owner) {
      whereClause += ` AND owner = $${++paramCount}`;
      values.push(filters.owner);
    }

    if (filters.team) {
      whereClause += ` AND team = $${++paramCount}`;
      values.push(filters.team);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM pipeline_jobs ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get jobs with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const jobsQuery = `
      SELECT * FROM pipeline_jobs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);
    const jobsResult = await this.pool.query(jobsQuery, values);

    const jobs = jobsResult.rows.map(row => this.parseJobRow(row));

    return { jobs, total };
  }

  // Execution Management
  async createExecution(jobId: string): Promise<JobExecution> {
    const executionNumber = await this.getNextExecutionNumber(jobId);

    const query = `
      INSERT INTO job_executions (
        id, job_id, execution_number, status
      ) VALUES (
        $1, $2, $3, $4
      ) RETURNING *
    `;

    const id = uuidv4();
    const values = [id, jobId, executionNumber, JobStatus.PENDING];

    const result = await this.pool.query(query, values);
    const execution = this.parseExecutionRow(result.rows[0]);

    // Emit execution created event
    this.emit('execution:created', {
      type: 'execution:created',
      jobId,
      executionId: execution.id,
      data: execution,
      timestamp: new Date()
    });

    return execution;
  }

  async startExecution(executionId: string, executor: string, workerNode?: string): Promise<void> {
    const query = `
      UPDATE job_executions
      SET status = $2, started_at = CURRENT_TIMESTAMP, executor = $3, worker_node = $4
      WHERE id = $1
    `;

    await this.pool.query(query, [executionId, JobStatus.RUNNING, executor, workerNode]);

    // Get job ID for event
    const execResult = await this.pool.query('SELECT job_id FROM job_executions WHERE id = $1', [executionId]);
    const jobId = execResult.rows[0]?.job_id;

    if (jobId) {
      // Update job status
      await this.updateJobStatus(jobId, JobStatus.RUNNING);

      // Emit execution started event
      this.emit('execution:started', {
        type: 'execution:started',
        jobId,
        executionId,
        data: { executor, workerNode },
        timestamp: new Date()
      });
    }
  }

  async completeExecution(
    executionId: string,
    result: any,
    metrics?: Record<string, any>,
    outputDatasets?: any[]
  ): Promise<void> {
    const query = `
      UPDATE job_executions
      SET
        status = $2,
        completed_at = CURRENT_TIMESTAMP,
        duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000,
        result = $3,
        metrics = $4,
        output_datasets = $5
      WHERE id = $1
      RETURNING job_id, duration_ms
    `;

    const values = [
      executionId,
      JobStatus.COMPLETED,
      JSON.stringify(result),
      metrics ? JSON.stringify(metrics) : null,
      outputDatasets ? JSON.stringify(outputDatasets) : null
    ];

    const execResult = await this.pool.query(query, values);
    const jobId = execResult.rows[0]?.job_id;
    const durationMs = execResult.rows[0]?.duration_ms;

    if (jobId) {
      // Update job status
      await this.updateJobStatus(jobId, JobStatus.COMPLETED);

      // Record metrics
      if (durationMs) {
        await this.recordMetric(jobId, executionId, 'execution_duration', durationMs, 'ms');
      }

      // Emit execution completed event
      this.emit('execution:completed', {
        type: 'execution:completed',
        jobId,
        executionId,
        data: { result, metrics, durationMs },
        timestamp: new Date()
      });
    }
  }

  async failExecution(executionId: string, errorMessage: string, errorDetails?: any): Promise<void> {
    const query = `
      UPDATE job_executions
      SET
        status = $2,
        completed_at = CURRENT_TIMESTAMP,
        duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000,
        error_message = $3,
        error_details = $4
      WHERE id = $1
      RETURNING job_id, retry_count
    `;

    const values = [
      executionId,
      JobStatus.FAILED,
      errorMessage,
      errorDetails ? JSON.stringify(errorDetails) : null
    ];

    const execResult = await this.pool.query(query, values);
    const jobId = execResult.rows[0]?.job_id;
    const retryCount = execResult.rows[0]?.retry_count || 0;

    if (jobId) {
      // Check if we should retry
      const shouldRetry = retryCount < 3; // Max 3 retries

      if (shouldRetry) {
        await this.scheduleRetry(executionId, retryCount + 1);
        await this.updateJobStatus(jobId, JobStatus.RETRYING);
      } else {
        await this.updateJobStatus(jobId, JobStatus.FAILED, errorMessage);
      }

      // Emit execution failed event
      this.emit('execution:failed', {
        type: 'execution:failed',
        jobId,
        executionId,
        data: { errorMessage, errorDetails, retryCount, willRetry: shouldRetry },
        timestamp: new Date()
      });
    }
  }

  private async scheduleRetry(executionId: string, retryCount: number): Promise<void> {
    // Exponential backoff: 1min, 2min, 4min
    const delayMinutes = Math.pow(2, retryCount - 1);
    const retryAfter = new Date(Date.now() + delayMinutes * 60 * 1000);

    const query = `
      UPDATE job_executions
      SET retry_count = $2, retry_after = $3, status = $4
      WHERE id = $1
    `;

    await this.pool.query(query, [executionId, retryCount, retryAfter, JobStatus.RETRYING]);
  }

  // Metrics
  async recordMetric(
    jobId: string,
    executionId: string | null,
    metricName: string,
    metricValue: number,
    metricUnit?: string,
    tags?: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO pipeline_metrics (
        id, job_id, execution_id, metric_name, metric_value, metric_unit, tags
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `;

    const values = [
      uuidv4(),
      jobId,
      executionId,
      metricName,
      metricValue,
      metricUnit,
      tags ? JSON.stringify(tags) : null
    ];

    await this.pool.query(query, values);
  }

  async getJobMetrics(jobId: string, metricName?: string): Promise<any[]> {
    let query = 'SELECT * FROM pipeline_metrics WHERE job_id = $1';
    const values: any[] = [jobId];

    if (metricName) {
      query += ' AND metric_name = $2';
      values.push(metricName);
    }

    query += ' ORDER BY recorded_at DESC LIMIT 100';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // Event Recording
  async recordEvent(
    eventType: string,
    eventSource: string,
    eventData: any,
    jobId?: string,
    executionId?: string
  ): Promise<void> {
    const query = `
      INSERT INTO pipeline_events (
        id, event_type, event_source, event_data, job_id, execution_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )
    `;

    const values = [
      uuidv4(),
      eventType,
      eventSource,
      JSON.stringify(eventData),
      jobId,
      executionId
    ];

    await this.pool.query(query, values);
  }

  // Monitoring
  async getActiveJobs(): Promise<PipelineJob[]> {
    const query = `
      SELECT * FROM active_jobs
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => this.parseJobRow(row));
  }

  async getJobSuccessRates(): Promise<any[]> {
    const query = 'SELECT * FROM job_success_rates';
    const result = await this.pool.query(query);
    return result.rows;
  }

  // Polling for updates
  startPolling(intervalMs: number = 5000): void {
    if (this.pollingInterval) {
      return;
    }

    this.pollingInterval = setInterval(async () => {
      try {
        // Check for retries that are due
        await this.processRetries();

        // Check for scheduled jobs
        await this.processScheduledJobs();

        // Check for stuck jobs
        await this.checkStuckJobs();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async processRetries(): Promise<void> {
    const query = `
      SELECT id, job_id FROM job_executions
      WHERE status = 'retrying' AND retry_after <= CURRENT_TIMESTAMP
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      // Create new execution for retry
      const newExecution = await this.createExecution(row.job_id);

      // Emit retry event
      this.emit('job:retry', {
        type: 'job:retry',
        jobId: row.job_id,
        executionId: newExecution.id,
        data: { originalExecutionId: row.id },
        timestamp: new Date()
      });
    }
  }

  private async processScheduledJobs(): Promise<void> {
    const query = `
      UPDATE pipeline_jobs
      SET status = 'queued'
      WHERE status = 'pending' AND scheduled_at <= CURRENT_TIMESTAMP
      RETURNING id
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      this.emit('job:queued', {
        type: 'job:queued',
        jobId: row.id,
        timestamp: new Date()
      });
    }
  }

  private async checkStuckJobs(): Promise<void> {
    // Jobs running for more than 1 hour without updates
    const query = `
      SELECT j.id, e.id as execution_id
      FROM pipeline_jobs j
      JOIN job_executions e ON j.id = e.job_id
      WHERE j.status = 'running'
        AND e.started_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
        AND e.status = 'running'
    `;

    const result = await this.pool.query(query);

    for (const row of result.rows) {
      this.emit('job:stuck', {
        type: 'job:stuck',
        jobId: row.id,
        executionId: row.execution_id,
        timestamp: new Date()
      });
    }
  }

  // Helper methods
  private async getNextExecutionNumber(jobId: string): Promise<number> {
    const query = 'SELECT get_next_execution_number($1) as num';
    const result = await this.pool.query(query, [jobId]);
    return result.rows[0].num;
  }

  private parseJobRow(row: any): PipelineJob {
    return {
      id: row.id,
      externalId: row.external_id,
      name: row.name,
      type: row.type,
      sourceSystem: row.source_system,
      targetSystem: row.target_system,
      status: row.status,
      priority: row.priority,
      config: row.config,
      parameters: row.parameters,
      cpuRequest: row.cpu_request ? parseFloat(row.cpu_request) : undefined,
      memoryRequest: row.memory_request,
      gpuRequest: row.gpu_request,
      scheduledAt: row.scheduled_at,
      tags: row.tags,
      labels: row.labels,
      owner: row.owner,
      team: row.team,
      createdBy: row.created_by
    };
  }

  private parseExecutionRow(row: any): JobExecution {
    return {
      id: row.id,
      jobId: row.job_id,
      executionNumber: row.execution_number,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      cpuUsed: row.cpu_used ? parseFloat(row.cpu_used) : undefined,
      memoryUsed: row.memory_used,
      gpuUsed: row.gpu_used,
      executor: row.executor,
      workerNode: row.worker_node,
      containerId: row.container_id,
      inputDatasets: row.input_datasets,
      outputDatasets: row.output_datasets,
      artifacts: row.artifacts,
      result: row.result,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      retryCount: row.retry_count,
      retryAfter: row.retry_after,
      logUrl: row.log_url,
      metrics: row.metrics
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.stopPolling();
    this.removeAllListeners();
  }
}