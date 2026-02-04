/**
 * Optimized Job Scheduler
 *
 * A priority queue-based job scheduler that efficiently manages scheduled jobs.
 * Instead of linearly scanning all jobs every 2 seconds, this scheduler uses
 * a min-heap to only check jobs that are actually due.
 *
 * Performance Improvements:
 * - O(log n) job insertion/removal vs O(n) linear scan
 * - O(1) to check if any jobs are due
 * - Only processes jobs that are actually due
 * - Smart sleep intervals based on next job time
 *
 * @see Issue #108: PERFORMANCE: Optimize daemon job scheduling algorithm
 */

import { MinHeap } from './min-heap.js';
import { BaseJobSpec } from './base-job-manager.js';
import { createLogger } from './logger.js';
import { EventEmitter } from 'events';

/**
 * Entry in the scheduler's priority queue
 */
export interface SchedulerEntry {
  /** Job ID for lookup */
  jobId: string;
  /** Job name for logging */
  jobName: string;
  /** Next scheduled run time (epoch ms) */
  nextRun: number;
  /** Original job specification */
  job: BaseJobSpec;
}

/**
 * Scheduler metrics for monitoring
 */
export interface SchedulerMetrics {
  /** Total jobs in scheduler */
  totalJobs: number;
  /** Jobs currently due */
  dueJobs: number;
  /** Timestamp of next scheduled check */
  nextCheckTime: number;
  /** Average check duration in ms */
  averageCheckTime: number;
  /** Memory usage estimate in bytes */
  memoryUsage: number;
  /** Total checks performed */
  totalChecks: number;
  /** Total jobs executed */
  totalExecuted: number;
}

/**
 * Configuration for the optimized scheduler
 */
export interface SchedulerConfig {
  /** Minimum check interval in ms (default: 100) */
  minCheckInterval: number;
  /** Maximum check interval in ms (default: 60000) */
  maxCheckInterval: number;
  /** Buffer time before job is due in ms (default: 50) */
  dueBuffer: number;
  /** Enable debug logging (default: false) */
  debug: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  minCheckInterval: 100,
  maxCheckInterval: 60000,
  dueBuffer: 50,
  debug: false,
};

export class OptimizedJobScheduler extends EventEmitter {
  private heap: MinHeap<SchedulerEntry>;
  private jobMap: Map<string, SchedulerEntry> = new Map();
  private config: SchedulerConfig;
  private logger = createLogger('OptimizedJobScheduler');
  private checkTimer?: NodeJS.Timeout;
  private isRunning = false;
  private lastRunTimes: Map<string, number> = new Map();

  // Metrics tracking
  private metrics: SchedulerMetrics = {
    totalJobs: 0,
    dueJobs: 0,
    nextCheckTime: 0,
    averageCheckTime: 0,
    memoryUsage: 0,
    totalChecks: 0,
    totalExecuted: 0,
  };
  private checkTimings: number[] = [];
  private readonly MAX_TIMING_SAMPLES = 100;

  constructor(config: Partial<SchedulerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.heap = new MinHeap<SchedulerEntry>(
      entry => entry.nextRun,
      entry => entry.jobId
    );
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info('Optimized job scheduler started');
    this.scheduleNextCheck();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = undefined;
    }
    this.logger.info('Optimized job scheduler stopped');
  }

  /**
   * Add a job to the scheduler
   * @param job The job specification
   */
  addJob(job: BaseJobSpec): void {
    if (!job.schedule) {
      return; // Only scheduled jobs go in the heap
    }

    const nextRun = this.calculateNextRun(job);
    if (nextRun === null) {
      return; // No valid schedule
    }

    const entry: SchedulerEntry = {
      jobId: job.id,
      jobName: job.name,
      nextRun,
      job,
    };

    // Remove existing entry if present
    if (this.jobMap.has(job.id)) {
      this.heap.removeById(job.id);
    }

    this.heap.push(entry);
    this.jobMap.set(job.id, entry);
    this.metrics.totalJobs = this.jobMap.size;

    if (this.config.debug) {
      this.logger.debug(`Added job ${job.id} (${job.name}), next run: ${new Date(nextRun).toISOString()}`);
    }

    // Reschedule check if this job is due sooner than the current next check
    if (this.isRunning && nextRun < this.metrics.nextCheckTime) {
      this.scheduleNextCheck();
    }
  }

  /**
   * Remove a job from the scheduler
   * @param jobId The job ID to remove
   * @returns true if removed, false if not found
   */
  removeJob(jobId: string): boolean {
    const removed = this.heap.removeById(jobId);
    const existed = this.jobMap.delete(jobId);
    this.lastRunTimes.delete(jobId);
    this.metrics.totalJobs = this.jobMap.size;
    return existed || removed !== undefined;
  }

  /**
   * Update a job in the scheduler
   * @param job Updated job specification
   */
  updateJob(job: BaseJobSpec): void {
    this.removeJob(job.id);
    this.addJob(job);
  }

  /**
   * Get jobs that are currently due
   * @returns Array of jobs ready to execute
   */
  getDueJobs(): BaseJobSpec[] {
    const startTime = Date.now();
    const now = startTime + this.config.dueBuffer;
    const dueJobs: BaseJobSpec[] = [];

    // Pop all jobs that are due
    while (!this.heap.isEmpty() && this.heap.peek()!.nextRun <= now) {
      const entry = this.heap.pop()!;
      const job = entry.job;

      // Check if we haven't run this job in the current minute (for cron jobs)
      if (job.schedule?.cron) {
        const currentMinute = Math.floor(now / 60000);
        const lastRun = this.lastRunTimes.get(job.id);
        if (lastRun === currentMinute) {
          // Already ran this minute, reschedule for next run (force recalculate)
          const nextRun = this.calculateNextRun(job, new Date(now + 60000), true);
          if (nextRun !== null) {
            entry.nextRun = nextRun;
            this.heap.push(entry);
          }
          continue;
        }
        this.lastRunTimes.set(job.id, currentMinute);
      }

      dueJobs.push(job);

      // Reschedule for next run if it's a recurring job (force recalculate)
      const nextRun = this.calculateNextRun(job, new Date(now), true);
      if (nextRun !== null) {
        entry.nextRun = nextRun;
        entry.job = job; // Keep updated job reference
        this.heap.push(entry);
        this.jobMap.set(job.id, entry);
      } else {
        this.jobMap.delete(job.id);
      }
    }

    // Update metrics
    const checkTime = Date.now() - startTime;
    this.recordCheckTiming(checkTime);
    this.metrics.dueJobs = dueJobs.length;
    this.metrics.totalExecuted += dueJobs.length;

    return dueJobs;
  }

  /**
   * Check and execute due jobs
   * Emits 'jobDue' event for each job that should be executed
   */
  checkScheduledJobs(): BaseJobSpec[] {
    this.metrics.totalChecks++;
    const dueJobs = this.getDueJobs();

    for (const job of dueJobs) {
      this.emit('jobDue', job);
    }

    // Schedule next check
    if (this.isRunning) {
      this.scheduleNextCheck();
    }

    return dueJobs;
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return {
      ...this.metrics,
      totalJobs: this.jobMap.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Calculate the next run time for a job
   * @param job The job specification
   * @param fromDate Optional date to calculate from (used for rescheduling after due)
   * @param forceRecalculate If true, ignore existing nextRun and calculate fresh
   */
  private calculateNextRun(job: BaseJobSpec, fromDate?: Date, forceRecalculate = false): number | null {
    const now = fromDate || new Date();

    if (job.schedule?.cron) {
      return this.getNextCronRun(job.schedule.cron, now);
    }

    if (job.schedule?.interval) {
      // When adding a new job, use the provided nextRun (even if in the past - job is due)
      if (job.schedule.nextRun && !forceRecalculate) {
        const nextRunTime = job.schedule.nextRun instanceof Date
          ? job.schedule.nextRun.getTime()
          : new Date(job.schedule.nextRun).getTime();
        return nextRunTime;
      }
      // Calculate next interval run (used when rescheduling after execution)
      return now.getTime() + job.schedule.interval;
    }

    return null;
  }

  /**
   * Calculate next cron run time
   */
  private getNextCronRun(cronExpr: string, from: Date): number | null {
    try {
      const [minute, hour, day, month, weekday] = cronExpr.split(' ');
      const now = new Date(from);

      // Try to find next matching time within the next 32 days
      // (covers monthly cron expressions like "0 0 1 * *")
      for (let i = 0; i < 32 * 24 * 60; i++) {
        const checkTime = new Date(now.getTime() + i * 60000);

        if (
          this.matchesCronField(minute, checkTime.getMinutes(), 0, 59) &&
          this.matchesCronField(hour, checkTime.getHours(), 0, 23) &&
          this.matchesCronField(day, checkTime.getDate(), 1, 31) &&
          this.matchesCronField(month, checkTime.getMonth() + 1, 1, 12) &&
          this.matchesCronField(weekday, checkTime.getDay(), 0, 6)
        ) {
          // Round to start of minute
          checkTime.setSeconds(0, 0);
          // Only return if it's in the future
          if (checkTime.getTime() > from.getTime()) {
            return checkTime.getTime();
          }
        }
      }

      return null;
    } catch (_error) {
      this.logger.error(`Invalid cron expression: ${cronExpr}`);
      return null;
    }
  }

  /**
   * Match a single cron field against a value
   */
  private matchesCronField(field: string, value: number, _min: number, _max: number): boolean {
    // Handle wildcard
    if (field === '*') {
      return true;
    }

    // Handle specific number
    if (/^\d+$/.test(field)) {
      return parseInt(field, 10) === value;
    }

    // Handle intervals (*/5)
    if (field.startsWith('*/')) {
      const interval = parseInt(field.substring(2), 10);
      return value % interval === 0;
    }

    // Handle ranges (1-5)
    if (field.includes('-') && !field.includes(',')) {
      const [start, end] = field.split('-').map(x => parseInt(x, 10));
      return value >= start && value <= end;
    }

    // Handle lists (1,3,5)
    if (field.includes(',')) {
      const values = field.split(',').map(x => parseInt(x.trim(), 10));
      return values.includes(value);
    }

    // Handle step values (1-10/2)
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = parseInt(step, 10);

      if (range === '*') {
        return value % stepNum === 0;
      }

      if (range.includes('-')) {
        const [start, end] = range.split('-').map(x => parseInt(x, 10));
        if (value < start || value > end) return false;
        return (value - start) % stepNum === 0;
      }
    }

    return false;
  }

  /**
   * Schedule the next check based on when jobs are due
   */
  private scheduleNextCheck(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
    }

    if (!this.isRunning) {
      return;
    }

    let delay: number;

    if (this.heap.isEmpty()) {
      // No jobs, wait for max interval
      delay = this.config.maxCheckInterval;
    } else {
      const nextJob = this.heap.peek()!;
      const timeUntilDue = nextJob.nextRun - Date.now();

      // Clamp delay between min and max
      delay = Math.max(
        this.config.minCheckInterval,
        Math.min(this.config.maxCheckInterval, timeUntilDue)
      );
    }

    this.metrics.nextCheckTime = Date.now() + delay;

    this.checkTimer = setTimeout(() => {
      this.checkScheduledJobs();
    }, delay);
  }

  /**
   * Record check timing for metrics
   */
  private recordCheckTiming(timing: number): void {
    this.checkTimings.push(timing);
    if (this.checkTimings.length > this.MAX_TIMING_SAMPLES) {
      this.checkTimings.shift();
    }
    this.metrics.averageCheckTime =
      this.checkTimings.reduce((sum, t) => sum + t, 0) / this.checkTimings.length;
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: ~500 bytes per entry
    return this.jobMap.size * 500;
  }

  /**
   * Get time until next job is due
   */
  getTimeUntilNextJob(): number | null {
    if (this.heap.isEmpty()) {
      return null;
    }
    return Math.max(0, this.heap.peek()!.nextRun - Date.now());
  }

  /**
   * Get all scheduled jobs (for debugging/status)
   */
  getAllJobs(): SchedulerEntry[] {
    return Array.from(this.jobMap.values());
  }
}

export default OptimizedJobScheduler;
