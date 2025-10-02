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
    runCleanup(): Promise<{
        table: string;
        status: string;
        deletedRecords?: number;
        cutoffDate?: string;
        error?: string;
    }[]>;
    private cleanupTable;
    private archiveTableData;
    private saveToS3;
    private saveToLocal;
    cleanupRedis(): Promise<void>;
    runArchive(): Promise<{
        table: string;
        status: string;
        recordsArchived?: number;
        error?: string;
    }[] | undefined>;
    private logCleanupResults;
    getRetentionStats(): Promise<{
        table: string;
        retentionDays: number;
        totalRecords: number;
        oldestRecord: any;
        newestRecord: any;
        tableSize: any;
        estimatedDeletions: number;
    }[]>;
    private estimateDeletions;
    triggerCleanup(tableName?: string): Promise<{
        table: string;
        status: string;
        deletedRecords?: number;
        cutoffDate?: string;
        error?: string;
    }[] | {
        table: string;
        status: string;
        deletedRecords: any;
        cutoffDate: string;
    }>;
    stop(): void;
}
