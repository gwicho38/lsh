import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { JobTracker, PipelineJob, JobStatus, JobExecution } from './job-tracker.js';

export interface MCLIConfig {
  baseUrl: string;
  apiKey?: string;
  webhookUrl?: string;
  timeout?: number;
}

export interface MCLIJob {
  id: string;
  name: string;
  type: string;
  config: any;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: string;
}

export interface MCLISubmitRequest {
  name: string;
  type: string;
  config: any;
  parameters?: any;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface MCLISubmitResponse {
  job_id: string;
  status: string;
  message: string;
}

export class MCLIBridge extends EventEmitter {
  private client: AxiosInstance;
  private jobTracker: JobTracker;
  private config: MCLIConfig;
  private jobMapping: Map<string, string> = new Map(); // MCLI ID -> Pipeline Job ID

  constructor(config: MCLIConfig, jobTracker: JobTracker) {
    super();
    this.config = config;
    this.jobTracker = jobTracker;

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey })
      }
    });

    this.setupJobTrackerListeners();
  }

  private setupJobTrackerListeners() {
    // Listen for job created events
    this.jobTracker.on('job:created', async (event) => {
      const job = event.data as PipelineJob;
      if (job.targetSystem === 'mcli') {
        try {
          await this.submitJobToMCLI(job);
        } catch (error) {
          console.error(`Failed to submit job ${job.id} to MCLI:`, error);
          await this.jobTracker.updateJobStatus(job.id!, JobStatus.FAILED,
            `Failed to submit to MCLI: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    // Listen for job retry events
    this.jobTracker.on('job:retry', async (event) => {
      const job = await this.jobTracker.getJob(event.jobId);
      if (job && job.targetSystem === 'mcli') {
        try {
          await this.submitJobToMCLI(job);
        } catch (error) {
          console.error(`Failed to retry job ${job.id} to MCLI:`, error);
        }
      }
    });
  }

  async submitJobToMCLI(job: PipelineJob): Promise<MCLISubmitResponse> {
    const request: MCLISubmitRequest = {
      name: job.name,
      type: job.type,
      config: job.config,
      parameters: job.parameters,
      callback_url: this.config.webhookUrl ? `${this.config.webhookUrl}/webhook/mcli` : undefined,
      metadata: {
        pipeline_job_id: job.id,
        source_system: job.sourceSystem,
        owner: job.owner,
        team: job.team,
        tags: job.tags
      }
    };

    try {
      // Submit to MCLI
      const response = await this.client.post<MCLISubmitResponse>('/api/jobs/submit', request);

      // Store mapping
      this.jobMapping.set(response.data.job_id, job.id!);

      // Update job with external ID
      await this.updateJobExternalId(job.id!, response.data.job_id);

      // Update status to queued
      await this.jobTracker.updateJobStatus(job.id!, JobStatus.QUEUED);

      // Get current execution
      const executions = await this.getLatestExecution(job.id!);
      if (executions) {
        await this.jobTracker.startExecution(executions.id!, 'mcli', response.data.job_id);
      }

      // Emit submission event
      this.emit('mcli:submitted', {
        pipelineJobId: job.id,
        mcliJobId: response.data.job_id,
        timestamp: new Date()
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        throw new Error(`MCLI submission failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  async getJobStatus(mcliJobId: string): Promise<MCLIJob> {
    try {
      const response = await this.client.get<MCLIJob>(`/api/jobs/${mcliJobId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get MCLI job status: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  async cancelJob(mcliJobId: string): Promise<void> {
    try {
      await this.client.post(`/api/jobs/${mcliJobId}/cancel`);

      // Update pipeline job status
      const pipelineJobId = this.jobMapping.get(mcliJobId);
      if (pipelineJobId) {
        await this.jobTracker.updateJobStatus(pipelineJobId, JobStatus.CANCELLED);
      }

      this.emit('mcli:cancelled', {
        mcliJobId,
        pipelineJobId,
        timestamp: new Date()
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to cancel MCLI job: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  async getJobLogs(mcliJobId: string): Promise<string> {
    try {
      const response = await this.client.get<{ logs: string }>(`/api/jobs/${mcliJobId}/logs`);
      return response.data.logs;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get MCLI job logs: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  // Webhook handler for MCLI callbacks
  async handleWebhook(payload: any): Promise<void> {
    const { job_id, status, result, error, metrics, artifacts } = payload;

    // Get pipeline job ID
    let pipelineJobId = this.jobMapping.get(job_id);

    if (!pipelineJobId && payload.metadata?.pipeline_job_id) {
      pipelineJobId = payload.metadata.pipeline_job_id;
      this.jobMapping.set(job_id, pipelineJobId);
    }

    if (!pipelineJobId) {
      console.warn(`Received webhook for unknown MCLI job: ${job_id}`);
      return;
    }

    // Get latest execution
    const execution = await this.getLatestExecution(pipelineJobId);
    if (!execution) {
      console.warn(`No execution found for pipeline job: ${pipelineJobId}`);
      return;
    }

    // Update based on status
    switch (status) {
      case 'running':
        await this.jobTracker.updateJobStatus(pipelineJobId, JobStatus.RUNNING);
        break;

      case 'completed':
      case 'success':
        await this.jobTracker.completeExecution(
          execution.id!,
          result,
          metrics,
          artifacts
        );
        break;

      case 'failed':
      case 'error':
        await this.jobTracker.failExecution(
          execution.id!,
          error?.message || 'Job failed in MCLI',
          error
        );
        break;

      case 'cancelled':
        await this.jobTracker.updateJobStatus(pipelineJobId, JobStatus.CANCELLED);
        break;

      default:
        console.warn(`Unknown MCLI job status: ${status}`);
    }

    // Record event
    await this.jobTracker.recordEvent(
      'mcli_webhook',
      'mcli',
      payload,
      pipelineJobId,
      execution.id
    );

    // Emit webhook event
    this.emit('mcli:webhook', {
      mcliJobId: job_id,
      pipelineJobId,
      status,
      timestamp: new Date()
    });
  }

  // Sync job status from MCLI
  async syncJobStatus(mcliJobId: string): Promise<void> {
    try {
      const mcliJob = await this.getJobStatus(mcliJobId);

      const pipelineJobId = this.jobMapping.get(mcliJobId);
      if (!pipelineJobId) {
        console.warn(`No pipeline job found for MCLI job: ${mcliJobId}`);
        return;
      }

      // Map MCLI status to pipeline status
      const statusMap: Record<string, JobStatus> = {
        'pending': JobStatus.PENDING,
        'queued': JobStatus.QUEUED,
        'running': JobStatus.RUNNING,
        'completed': JobStatus.COMPLETED,
        'success': JobStatus.COMPLETED,
        'failed': JobStatus.FAILED,
        'error': JobStatus.FAILED,
        'cancelled': JobStatus.CANCELLED
      };

      const pipelineStatus = statusMap[mcliJob.status] || JobStatus.PENDING;
      await this.jobTracker.updateJobStatus(pipelineJobId, pipelineStatus);

      // If completed or failed, update execution
      if (mcliJob.status === 'completed' || mcliJob.status === 'success') {
        const execution = await this.getLatestExecution(pipelineJobId);
        if (execution) {
          await this.jobTracker.completeExecution(
            execution.id!,
            mcliJob.result,
            undefined,
            undefined
          );
        }
      } else if (mcliJob.status === 'failed' || mcliJob.status === 'error') {
        const execution = await this.getLatestExecution(pipelineJobId);
        if (execution) {
          await this.jobTracker.failExecution(
            execution.id!,
            mcliJob.error || 'Job failed in MCLI',
            undefined
          );
        }
      }

      this.emit('mcli:synced', {
        mcliJobId,
        pipelineJobId,
        status: pipelineStatus,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`Failed to sync MCLI job status for ${mcliJobId}:`, error);
    }
  }

  // Batch sync multiple jobs
  async syncAllActiveJobs(): Promise<void> {
    const activeJobs = await this.jobTracker.getActiveJobs();

    for (const job of activeJobs) {
      if (job.targetSystem === 'mcli' && job.externalId) {
        await this.syncJobStatus(job.externalId);
        // Add delay to avoid overwhelming MCLI API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Start periodic sync
  startPeriodicSync(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        await this.syncAllActiveJobs();
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, intervalMs);
  }

  // Helper methods
  private async updateJobExternalId(jobId: string, externalId: string): Promise<void> {
    // This would be implemented in JobTracker, but for now we'll use raw SQL
    const pool = (this.jobTracker as any).pool;
    await pool.query(
      'UPDATE pipeline_jobs SET external_id = $1 WHERE id = $2',
      [externalId, jobId]
    );
  }

  private async getLatestExecution(jobId: string): Promise<JobExecution | null> {
    // This would be implemented in JobTracker
    const pool = (this.jobTracker as any).pool;
    const result = await pool.query(
      `SELECT * FROM job_executions
       WHERE job_id = $1
       ORDER BY execution_number DESC
       LIMIT 1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return (this.jobTracker as any).parseExecutionRow(result.rows[0]);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (_error) {
      return false;
    }
  }

  // Get MCLI statistics
  async getStatistics(): Promise<any> {
    try {
      const response = await this.client.get('/api/statistics');
      return response.data;
    } catch (error) {
      console.error('Failed to get MCLI statistics:', error);
      return null;
    }
  }

  // Cleanup
  cleanup(): void {
    this.removeAllListeners();
    this.jobMapping.clear();
  }
}