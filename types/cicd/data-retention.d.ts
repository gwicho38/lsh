import { Pool } from 'pg';
import Redis from 'ioredis';
export declare class DataRetentionService {
    private pool;
    private redis;
    private policies;
    private archiveConfig;
    private cronJobs;
    constructor(pool: Pool, redis: Redis);
    private setupCronJobs;
    runCleanup(): Promise<never[]>;
    private cleanupTable;
    private archiveTableData;
    private saveToS3;
    private saveToLocal;
    cleanupRedis(): Promise<void>;
    runArchive(): Promise<never[] | undefined>;
    private logCleanupResults;
    getRetentionStats(): Promise<never[]>;
    private estimateDeletions;
    triggerCleanup(tableName?: string): Promise<never[] | {
        table: string;
        status: string;
        deletedRecords: any;
        cutoffDate: string;
    }>;
    stop(): void;
}
