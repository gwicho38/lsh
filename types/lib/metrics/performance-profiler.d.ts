/**
 * Performance Profiler
 *
 * High-resolution performance profiling with checkpoints and memory tracking.
 * Designed for profiling individual operations with detailed timing breakdown.
 */
import { EventEmitter } from 'events';
import { Profile, ProfileResult, MetricsConfig } from './types.js';
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
export declare class PerformanceProfiler extends EventEmitter {
    private activeProfiles;
    private completedProfiles;
    private config;
    private profileCount;
    constructor(config?: Pick<MetricsConfig, 'profilingEnabled' | 'profilingSampleRate' | 'maxMetricsInMemory'>);
    /**
     * Check if profiling is enabled
     */
    isEnabled(): boolean;
    /**
     * Check if this operation should be profiled (based on sample rate)
     */
    private shouldProfile;
    /**
     * Start a new profiling session
     *
     * @param name - Unique identifier for this profile
     * @param context - Optional context data to associate with this profile
     * @returns The profile object, or undefined if not sampled
     */
    startProfile(name: string, context?: Record<string, unknown>): Profile | undefined;
    /**
     * Add a checkpoint to an active profile
     *
     * @param name - Profile name
     * @param label - Human-readable label for this checkpoint
     */
    checkpoint(name: string, label: string): void;
    /**
     * End a profiling session and get results
     *
     * @param name - Profile name
     * @returns Profile results, or undefined if profile doesn't exist
     */
    endProfile(name: string): ProfileResult | undefined;
    /**
     * Get an active profile (for inspection)
     */
    getActiveProfile(name: string): Profile | undefined;
    /**
     * Get all active profile names
     */
    getActiveProfileNames(): string[];
    /**
     * Get completed profile results
     *
     * @param limit - Maximum number of results to return
     * @returns Most recent completed profiles
     */
    getCompletedProfiles(limit?: number): ProfileResult[];
    /**
     * Get profile by name from completed profiles
     */
    getProfileByName(name: string): ProfileResult[];
    /**
     * Get profiling statistics
     */
    getStats(): {
        totalProfilesStarted: number;
        activeProfiles: number;
        completedProfiles: number;
        averageDuration?: number;
        longestProfile?: ProfileResult;
    };
    /**
     * Clear all stored profiles
     */
    reset(): void;
    /**
     * Abort an active profile without recording results
     */
    abortProfile(name: string): boolean;
}
/**
 * Get the default profiler instance
 */
export declare function getPerformanceProfiler(): PerformanceProfiler;
/**
 * Create a new profiler with specific configuration
 */
export declare function createPerformanceProfiler(config?: Pick<MetricsConfig, 'profilingEnabled' | 'profilingSampleRate' | 'maxMetricsInMemory'>): PerformanceProfiler;
/**
 * Convenience function to profile an async operation
 *
 * @param name - Profile name
 * @param operation - Async function to profile
 * @param context - Optional context
 * @returns The operation result
 */
export declare function profileAsync<T>(name: string, operation: () => Promise<T>, context?: Record<string, unknown>): Promise<{
    result: T;
    profile?: ProfileResult;
}>;
/**
 * Convenience function to profile a sync operation
 *
 * @param name - Profile name
 * @param operation - Function to profile
 * @param context - Optional context
 * @returns The operation result
 */
export declare function profileSync<T>(name: string, operation: () => T, context?: Record<string, unknown>): {
    result: T;
    profile?: ProfileResult;
};
export default PerformanceProfiler;
