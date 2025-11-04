import { Pool } from 'pg';
import Redis from 'ioredis';
import * as cron from 'node-cron';

interface RetentionPolicy {
  tableName: string;
  retentionDays: number;
  dateColumn: string;
  archiveBeforeDelete?: boolean;
}

interface ArchiveConfig {
  enabled: boolean;
  s3Bucket?: string;
  localPath?: string;
  compress: boolean;
}

export class DataRetentionService {
  private pool: Pool;
  private redis: Redis;
  private policies: RetentionPolicy[];
  private archiveConfig: ArchiveConfig;
  private cronJobs: cron.ScheduledTask[] = [];

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;

    // Define retention policies
    this.policies = [
      { tableName: 'pipeline_events', retentionDays: 90, dateColumn: 'created_at', archiveBeforeDelete: true },
      { tableName: 'build_metrics', retentionDays: 180, dateColumn: 'recorded_at', archiveBeforeDelete: true },
      { tableName: 'audit_logs', retentionDays: 365, dateColumn: 'timestamp', archiveBeforeDelete: true },
      { tableName: 'pipeline_stages', retentionDays: 90, dateColumn: 'started_at' },
      { tableName: 'alerts', retentionDays: 30, dateColumn: 'created_at' },
      { tableName: 'webhook_logs', retentionDays: 7, dateColumn: 'received_at' }
    ];

    this.archiveConfig = {
      enabled: process.env.ENABLE_ARCHIVE === 'true',
      s3Bucket: process.env.ARCHIVE_S3_BUCKET,
      localPath: process.env.ARCHIVE_LOCAL_PATH || '/var/backups/cicd',
      compress: true
    };

    this.setupCronJobs();
  }

  private setupCronJobs() {
    // Daily cleanup at 2 AM
    const dailyCleanup = cron.schedule('0 2 * * *', async () => {
      console.warn('Running daily data cleanup...');
      await this.runCleanup();
    });

    // Weekly archive at Sunday 3 AM
    const weeklyArchive = cron.schedule('0 3 * * 0', async () => {
      console.warn('Running weekly data archive...');
      await this.runArchive();
    });

    // Hourly Redis cleanup
    const hourlyRedisCleanup = cron.schedule('0 * * * *', async () => {
      console.warn('Running Redis cleanup...');
      await this.cleanupRedis();
    });

    this.cronJobs.push(dailyCleanup, weeklyArchive, hourlyRedisCleanup);
  }

  async runCleanup() {
    const results: Array<{ table: string; status: string; deletedRecords?: number; cutoffDate?: string; error?: string }> = [];

    for (const policy of this.policies) {
      try {
        const result = await this.cleanupTable(policy);
        results.push(result);
      } catch (error) {
        console.error(`Error cleaning up ${policy.tableName}:`, error);
        results.push({
          table: policy.tableName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log cleanup results
    await this.logCleanupResults(results);

    return results;
  }

  private async cleanupTable(policy: RetentionPolicy) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Archive if needed
    if (policy.archiveBeforeDelete && this.archiveConfig.enabled) {
      await this.archiveTableData(policy.tableName, policy.dateColumn, cutoffDate);
    }

    // Delete old records
    const deleteQuery = `
      DELETE FROM ${policy.tableName}
      WHERE ${policy.dateColumn} < $1
      RETURNING COUNT(*) as deleted_count
    `;

    const result = await this.pool.query(deleteQuery, [cutoffDate]);
    const deletedCount = result.rowCount || 0;

    // Vacuum the table to reclaim space
    await this.pool.query(`VACUUM ANALYZE ${policy.tableName}`);

    return {
      table: policy.tableName,
      status: 'success',
      deletedRecords: deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  private async archiveTableData(tableName: string, dateColumn: string, cutoffDate: Date) {
    const selectQuery = `
      SELECT * FROM ${tableName}
      WHERE ${dateColumn} < $1
    `;

    const result = await this.pool.query(selectQuery, [cutoffDate]);

    if (result.rows.length === 0) {
      return;
    }

    const archiveData = {
      tableName,
      archiveDate: new Date().toISOString(),
      recordCount: result.rows.length,
      cutoffDate: cutoffDate.toISOString(),
      data: result.rows
    };

    // Save archive based on configuration
    if (this.archiveConfig.s3Bucket) {
      await this.saveToS3(archiveData);
    } else if (this.archiveConfig.localPath) {
      await this.saveToLocal(archiveData);
    }
  }

  private async saveToS3(archiveData: { recordCount: number; tableName: string; [key: string]: unknown }) {
    // Implementation would use AWS SDK
    console.warn(`Would save ${archiveData.recordCount} records from ${archiveData.tableName} to S3`);
    // Placeholder for S3 upload logic
  }

  private async saveToLocal(archiveData: { recordCount: number; tableName: string; [key: string]: unknown }) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const zlib = await import('zlib');
    const { promisify } = await import('util');

    const gzip = promisify(zlib.gzip);

    const timestamp = 'archiveDate' in archiveData && typeof archiveData.archiveDate === 'string'
      ? archiveData.archiveDate.replace(/:/g, '-')
      : 'weekOf' in archiveData && typeof archiveData.weekOf === 'string'
        ? archiveData.weekOf
        : new Date().toISOString().replace(/:/g, '-');
    const fileName = `${archiveData.tableName}_${timestamp}.json`;
    const filePath = path.join(this.archiveConfig.localPath!, fileName);

    let data = JSON.stringify(archiveData);

    if (this.archiveConfig.compress) {
      data = (await gzip(data)).toString('base64');
      const compressedPath = filePath + '.gz';
      await fs.writeFile(compressedPath, data);
      console.warn(`Archived ${archiveData.recordCount} records to ${compressedPath}`);
    } else {
      await fs.writeFile(filePath, data);
      console.warn(`Archived ${archiveData.recordCount} records to ${filePath}`);
    }
  }

  async cleanupRedis() {
    const patterns = [
      'metrics:*',
      'durations:*',
      'stage_durations:*',
      'webhook:*'
    ];

    const cutoffTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        // Extract date from key if possible
        const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const keyDate = new Date(dateMatch[1]);
          if (keyDate.getTime() < cutoffTimestamp) {
            await this.redis.del(key);
          }
        }
      }
    }

    // Clean up expired cache entries
    const cacheKeys = await this.redis.keys('cicd:cache:*');
    for (const key of cacheKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // No expiration set, check age
        await this.redis.expire(key, 3600); // Set 1 hour expiration
      }
    }

    console.warn('Redis cleanup completed');
  }

  async runArchive() {
    if (!this.archiveConfig.enabled) {
      console.warn('Archiving is disabled');
      return;
    }

    const tables = ['pipeline_events', 'build_metrics', 'audit_logs'];
    const results: Array<{ table: string; status: string; recordsArchived?: number; error?: string }> = [];

    for (const tableName of tables) {
      try {
        // Archive last week's data
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();

        const query = `
          SELECT * FROM ${tableName}
          WHERE created_at >= $1 AND created_at < $2
        `;

        const result = await this.pool.query(query, [startDate, endDate]);

        if (result.rows.length > 0) {
          const archiveData = {
            tableName,
            weekOf: startDate.toISOString().split('T')[0],
            recordCount: result.rows.length,
            data: result.rows
          };

          if (this.archiveConfig.s3Bucket) {
            await this.saveToS3(archiveData);
          } else if (this.archiveConfig.localPath) {
            await this.saveToLocal(archiveData);
          }

          results.push({
            table: tableName,
            status: 'success',
            recordsArchived: result.rows.length
          });
        }
      } catch (error) {
        console.error(`Error archiving ${tableName}:`, error);
        results.push({
          table: tableName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async logCleanupResults(results: Array<{ status: string; deletedRecords?: number; [key: string]: unknown }>) {
    const query = `
      INSERT INTO data_retention_logs (
        execution_time, tables_processed, records_deleted, status, details
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    const totalDeleted = results
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + (r.deletedRecords || 0), 0);

    const status = results.every(r => r.status === 'success') ? 'success' :
                   results.some(r => r.status === 'success') ? 'partial' : 'failed';

    await this.pool.query(query, [
      new Date(),
      results.length,
      totalDeleted,
      status,
      JSON.stringify(results)
    ]);
  }

  async getRetentionStats() {
    const stats: Array<{
      table: string;
      retentionDays: number;
      totalRecords: number;
      oldestRecord: string;
      newestRecord: string;
      tableSize: string;
      estimatedDeletions: number
    }> = [];

    for (const policy of this.policies) {
      const countQuery = `
        SELECT
          COUNT(*) as total_records,
          MIN(${policy.dateColumn}) as oldest_record,
          MAX(${policy.dateColumn}) as newest_record,
          pg_size_pretty(pg_total_relation_size('${policy.tableName}')) as table_size
        FROM ${policy.tableName}
      `;

      try {
        const result = await this.pool.query(countQuery);
        const row = result.rows[0];

        stats.push({
          table: policy.tableName,
          retentionDays: policy.retentionDays,
          totalRecords: parseInt(row.total_records),
          oldestRecord: row.oldest_record,
          newestRecord: row.newest_record,
          tableSize: row.table_size,
          estimatedDeletions: await this.estimateDeletions(policy)
        });
      } catch (error) {
        console.error(`Error getting stats for ${policy.tableName}:`, error);
      }
    }

    return stats;
  }

  private async estimateDeletions(policy: RetentionPolicy): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const query = `
      SELECT COUNT(*) as count
      FROM ${policy.tableName}
      WHERE ${policy.dateColumn} < $1
    `;

    try {
      const result = await this.pool.query(query, [cutoffDate]);
      return parseInt(result.rows[0].count);
    } catch (_error) {
      return 0;
    }
  }

  // Manual trigger for cleanup
  async triggerCleanup(tableName?: string) {
    if (tableName) {
      const policy = this.policies.find(p => p.tableName === tableName);
      if (policy) {
        return await this.cleanupTable(policy);
      }
      throw new Error(`No retention policy found for table: ${tableName}`);
    }

    return await this.runCleanup();
  }

  // Stop all cron jobs
  stop() {
    this.cronJobs.forEach(job => job.stop());
  }
}