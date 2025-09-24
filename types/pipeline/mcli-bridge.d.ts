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
    handleWebhook(payload: any): Promise<void>;
    syncJobStatus(mcliJobId: string): Promise<void>;
    syncAllActiveJobs(): Promise<void>;
    startPeriodicSync(intervalMs?: number): NodeJS.Timeout;
    private updateJobExternalId;
    private getLatestExecution;
    healthCheck(): Promise<boolean>;
    getStatistics(): Promise<any>;
    cleanup(): void;
}
