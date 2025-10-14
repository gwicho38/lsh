/**
 * Database Job Storage
 * Persistent storage for jobs and executions using DatabasePersistence
 * Used by CronJobManager and other database-backed managers
 */
import { JobStorage, BaseJobSpec, BaseJobFilter, BaseJobExecution } from './base-job-manager.js';
export declare class DatabaseJobStorage implements JobStorage {
    private persistence;
    private userId?;
    constructor(userId?: string);
    save(job: BaseJobSpec): Promise<void>;
    get(jobId: string): Promise<BaseJobSpec | null>;
    list(filter?: BaseJobFilter): Promise<BaseJobSpec[]>;
    private mapDbStatusToJobStatus;
    update(jobId: string, updates: Partial<BaseJobSpec>): Promise<void>;
    delete(jobId: string): Promise<void>;
    saveExecution(execution: BaseJobExecution): Promise<void>;
    getExecutions(jobId: string, limit?: number): Promise<BaseJobExecution[]>;
    private mapDbStatus;
    cleanup(): Promise<void>;
}
export default DatabaseJobStorage;
