/**
 * Performance Profiler
 *
 * High-resolution performance profiling with checkpoints and memory tracking.
 * Designed for profiling individual operations with detailed timing breakdown.
 */

import { EventEmitter } from 'events';
import { createLogger } from '../logger.js';
import {
  Profile,
  ProfileResult,
  ProfileCheckpoint,
  MemorySnapshot,
  MetricsConfig,
} from './types.js';
import { getMetricsCollector, METRIC_NAMES } from './metrics-collector.js';

const logger = createLogger('PerformanceProfiler');

/**
 * Get current memory snapshot
 */
function getMemorySnapshot(): MemorySnapshot {
  const mem = process.memoryUsage();
  return {
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    arrayBuffers: mem.arrayBuffers,
  };
}

/**
 * Calculate memory delta between two snapshots
 */
function calculateMemoryDelta(start: MemorySnapshot, end: MemorySnapshot): MemorySnapshot {
  return {
    rss: end.rss - start.rss,
    heapUsed: end.heapUsed - start.heapUsed,
    heapTotal: end.heapTotal - start.heapTotal,
    external: end.external - start.external,
    arrayBuffers:
      start.arrayBuffers !== undefined && end.arrayBuffers !== undefined
        ? end.arrayBuffers - start.arrayBuffers
        : undefined,
  };
}

/**
 * PerformanceProfiler - Detailed operation profiling
 *
 * Usage:
 * ```typescript
 * const profiler = new PerformanceProfiler();
 *
 * const profile = profiler.startProfile('db-query', { query: 'SELECT...' });
 * // ... do work ...
 * profiler.checkpoint('db-query', 'query-executed');
 * // ... do more work ...
 * const result = profiler.endProfile('db-query');
 *
 * console.log(`Duration: ${result.duration}ms`);
 * console.log(`Memory delta: ${result.memoryDelta.heapUsed} bytes`);
 * ```
 */
export class PerformanceProfiler extends EventEmitter {
  private activeProfiles: Map<string, Profile> = new Map();
  private completedProfiles: ProfileResult[] = [];
  private config: Pick<MetricsConfig, 'profilingEnabled' | 'profilingSampleRate' | 'maxMetricsInMemory'>;
  private profileCount = 0;

  constructor(
    config?: Pick<MetricsConfig, 'profilingEnabled' | 'profilingSampleRate' | 'maxMetricsInMemory'>
  ) {
    super();
    this.config = {
      profilingEnabled: config?.profilingEnabled ?? true,
      profilingSampleRate: config?.profilingSampleRate ?? 1.0, // Profile everything by default
      maxMetricsInMemory: config?.maxMetricsInMemory ?? 1000,
    };

    logger.debug('PerformanceProfiler initialized', {
      enabled: this.config.profilingEnabled,
      sampleRate: this.config.profilingSampleRate,
    });
  }

  /**
   * Check if profiling is enabled
   */
  isEnabled(): boolean {
    return this.config.profilingEnabled;
  }

  /**
   * Check if this operation should be profiled (based on sample rate)
   */
  private shouldProfile(): boolean {
    if (!this.config.profilingEnabled) {
      return false;
    }
    if (this.config.profilingSampleRate >= 1.0) {
      return true;
    }
    return Math.random() < this.config.profilingSampleRate;
  }

  /**
   * Start a new profiling session
   *
   * @param name - Unique identifier for this profile
   * @param context - Optional context data to associate with this profile
   * @returns The profile object, or undefined if not sampled
   */
  startProfile(name: string, context?: Record<string, unknown>): Profile | undefined {
    if (!this.shouldProfile()) {
      return undefined;
    }

    if (this.activeProfiles.has(name)) {
      logger.warn(`Profile "${name}" already exists, ending previous profile`);
      this.endProfile(name);
    }

    const profile: Profile = {
      name,
      startTime: process.hrtime.bigint(),
      startMemory: getMemorySnapshot(),
      context,
      checkpoints: [],
    };

    this.activeProfiles.set(name, profile);
    this.profileCount++;

    logger.debug(`Profile started: ${name}`, { context });
    this.emit('profileStarted', name, context);

    return profile;
  }

  /**
   * Add a checkpoint to an active profile
   *
   * @param name - Profile name
   * @param label - Human-readable label for this checkpoint
   */
  checkpoint(name: string, label: string): void {
    const profile = this.activeProfiles.get(name);
    if (!profile) {
      // Profile wasn't sampled or doesn't exist, silently ignore
      return;
    }

    const checkpoint: ProfileCheckpoint = {
      label,
      timestamp: process.hrtime.bigint(),
      memory: getMemorySnapshot(),
    };

    profile.checkpoints.push(checkpoint);

    logger.debug(`Checkpoint added to profile "${name}": ${label}`);
    this.emit('checkpoint', name, label);
  }

  /**
   * End a profiling session and get results
   *
   * @param name - Profile name
   * @returns Profile results, or undefined if profile doesn't exist
   */
  endProfile(name: string): ProfileResult | undefined {
    const profile = this.activeProfiles.get(name);
    if (!profile) {
      // Profile wasn't sampled or doesn't exist
      return undefined;
    }

    const endTime = process.hrtime.bigint();
    const endMemory = getMemorySnapshot();

    // Calculate duration in milliseconds
    const durationNs = endTime - profile.startTime;
    const duration = Number(durationNs) / 1_000_000;

    // Calculate memory delta
    const memoryDelta = calculateMemoryDelta(profile.startMemory, endMemory);

    // Convert checkpoints to relative times
    const checkpoints = profile.checkpoints.map((cp) => ({
      label: cp.label,
      relativeTime: Number(cp.timestamp - profile.startTime) / 1_000_000,
      memory: cp.memory,
    }));

    const result: ProfileResult = {
      name: profile.name,
      duration,
      memoryDelta,
      checkpoints,
      context: profile.context,
      endTime: new Date(),
    };

    // Store completed profile
    this.completedProfiles.push(result);

    // Enforce max profiles limit
    if (this.completedProfiles.length > this.config.maxMetricsInMemory) {
      this.completedProfiles.shift();
    }

    // Remove from active profiles
    this.activeProfiles.delete(name);

    // Record timing metric if collector is available
    try {
      const collector = getMetricsCollector();
      if (collector.isEnabled()) {
        collector.recordTiming(METRIC_NAMES.JOB_EXECUTION_DURATION, duration, {
          profile: name,
        });
      }
    } catch {
      // Collector not available, that's fine
    }

    logger.debug(`Profile ended: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB heap`,
      checkpoints: checkpoints.length,
    });

    this.emit('profileEnded', result);

    return result;
  }

  /**
   * Get an active profile (for inspection)
   */
  getActiveProfile(name: string): Profile | undefined {
    return this.activeProfiles.get(name);
  }

  /**
   * Get all active profile names
   */
  getActiveProfileNames(): string[] {
    return Array.from(this.activeProfiles.keys());
  }

  /**
   * Get completed profile results
   *
   * @param limit - Maximum number of results to return
   * @returns Most recent completed profiles
   */
  getCompletedProfiles(limit?: number): ProfileResult[] {
    const profiles = [...this.completedProfiles].reverse();
    return limit ? profiles.slice(0, limit) : profiles;
  }

  /**
   * Get profile by name from completed profiles
   */
  getProfileByName(name: string): ProfileResult[] {
    return this.completedProfiles.filter((p) => p.name === name);
  }

  /**
   * Get profiling statistics
   */
  getStats(): {
    totalProfilesStarted: number;
    activeProfiles: number;
    completedProfiles: number;
    averageDuration?: number;
    longestProfile?: ProfileResult;
  } {
    const active = this.activeProfiles.size;
    const completed = this.completedProfiles.length;

    let averageDuration: number | undefined;
    let longestProfile: ProfileResult | undefined;

    if (completed > 0) {
      const totalDuration = this.completedProfiles.reduce((sum, p) => sum + p.duration, 0);
      averageDuration = totalDuration / completed;
      longestProfile = this.completedProfiles.reduce((longest, p) =>
        p.duration > (longest?.duration ?? 0) ? p : longest
      );
    }

    return {
      totalProfilesStarted: this.profileCount,
      activeProfiles: active,
      completedProfiles: completed,
      averageDuration,
      longestProfile,
    };
  }

  /**
   * Clear all stored profiles
   */
  reset(): void {
    this.activeProfiles.clear();
    this.completedProfiles.length = 0;
    this.profileCount = 0;
    logger.debug('PerformanceProfiler reset');
    this.emit('reset');
  }

  /**
   * Abort an active profile without recording results
   */
  abortProfile(name: string): boolean {
    if (this.activeProfiles.has(name)) {
      this.activeProfiles.delete(name);
      logger.debug(`Profile aborted: ${name}`);
      this.emit('profileAborted', name);
      return true;
    }
    return false;
  }
}

/**
 * Default profiler instance
 */
let defaultProfiler: PerformanceProfiler | undefined;

/**
 * Get the default profiler instance
 */
export function getPerformanceProfiler(): PerformanceProfiler {
  if (!defaultProfiler) {
    defaultProfiler = new PerformanceProfiler();
  }
  return defaultProfiler;
}

/**
 * Create a new profiler with specific configuration
 */
export function createPerformanceProfiler(
  config?: Pick<MetricsConfig, 'profilingEnabled' | 'profilingSampleRate' | 'maxMetricsInMemory'>
): PerformanceProfiler {
  return new PerformanceProfiler(config);
}

/**
 * Convenience function to profile an async operation
 *
 * @param name - Profile name
 * @param operation - Async function to profile
 * @param context - Optional context
 * @returns The operation result
 */
export async function profileAsync<T>(
  name: string,
  operation: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<{ result: T; profile?: ProfileResult }> {
  const profiler = getPerformanceProfiler();

  profiler.startProfile(name, context);
  try {
    const result = await operation();
    const profile = profiler.endProfile(name);
    return { result, profile };
  } catch (error) {
    profiler.abortProfile(name);
    throw error;
  }
}

/**
 * Convenience function to profile a sync operation
 *
 * @param name - Profile name
 * @param operation - Function to profile
 * @param context - Optional context
 * @returns The operation result
 */
export function profileSync<T>(
  name: string,
  operation: () => T,
  context?: Record<string, unknown>
): { result: T; profile?: ProfileResult } {
  const profiler = getPerformanceProfiler();

  profiler.startProfile(name, context);
  try {
    const result = operation();
    const profile = profiler.endProfile(name);
    return { result, profile };
  } catch (error) {
    profiler.abortProfile(name);
    throw error;
  }
}

export default PerformanceProfiler;
