/**
 * In-Memory Job Storage
 * Fast, volatile storage for jobs and executions
 * Used by JobManager for runtime job tracking
 */
import { JobStorage, BaseJobSpec, BaseJobFilter, BaseJobExecution } from './base-job-manager.js';
export declare class MemoryJobStorage implements JobStorage {
    private jobs;
    private executions;
    private maxExecutionsPerJob;
    constructor(maxExecutionsPerJob?: number);
    save(job: BaseJobSpec): Promise<void>;
    get(jobId: string): Promise<BaseJobSpec | null>;
    list(filter?: BaseJobFilter): Promise<BaseJobSpec[]>;
    update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void>;
    delete(jobId: string): Promise<void>;
    saveExecution(execution: BaseJobExecution): Promise<void>;
    getExecutions(jobId: string, limit?: number): Promise<BaseJobExecution[]>;
    cleanup(): Promise<void>;
    getJobCount(): number;
    getExecutionCount(jobId?: string): number;
}
export default MemoryJobStorage;
