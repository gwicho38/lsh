import { EventEmitter } from 'events';
import { JobTracker, PipelineJob } from './job-tracker.js';
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
    config: Record<string, unknown>;
    status: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    result?: unknown;
    error?: string;
}
export interface MCLISubmitRequest {
    name: string;
    type: string;
    config: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    callback_url?: string;
    metadata?: Record<string, unknown>;
}
export interface MCLISubmitResponse {
    job_id: string;
    status: string;
    message: string;
}
export declare class MCLIBridge extends EventEmitter {
    private client;
    private jobTracker;
    private config;
    private jobMapping;
    constructor(config: MCLIConfig, jobTracker: JobTracker);
    private setupJobTrackerListeners;
    submitJobToMCLI(job: PipelineJob): Promise<MCLISubmitResponse>;
    getJobStatus(mcliJobId: string): Promise<MCLIJob>;
    cancelJob(mcliJobId: string): Promise<void>;
    getJobLogs(mcliJobId: string): Promise<string>;
    handleWebhook(payload: Record<string, unknown>): Promise<void>;
    syncJobStatus(mcliJobId: string): Promise<void>;
    syncAllActiveJobs(): Promise<void>;
    startPeriodicSync(intervalMs?: number): NodeJS.Timeout;
    private updateJobExternalId;
    private getLatestExecution;
    healthCheck(): Promise<boolean>;
    getStatistics(): Promise<Record<string, unknown> | null>;
    cleanup(): void;
}
