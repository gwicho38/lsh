/**
 * Metrics Collector
 *
 * Core metrics collection class following the Logger pattern.
 * Provides methods to record counters, gauges, histograms, and timing metrics.
 * Thread-safe and optimized for low overhead.
 */
import { EventEmitter } from 'events';
import { type PerformanceMetric, type AggregatedMetric, type MetricsConfig, METRIC_NAMES } from './types.js';
/**
 * MetricsCollector - Central metrics collection service
 *
 * Usage:
 * ```typescript
 * const metrics = new MetricsCollector();
 * metrics.incrementCounter('jobs.started', 1, { jobType: 'shell' });
 * metrics.recordTiming('job.duration', 1234, { jobId: 'abc123' });
 * metrics.setGauge('jobs.active', 5);
 * ```
 */
export declare class MetricsCollector extends EventEmitter {
    private config;
    private metrics;
    private aggregations;
    private counters;
    private gauges;
    private histograms;
    private cleanupInterval?;
    constructor(config?: Partial<MetricsConfig>);
    /**
     * Check if metrics collection is enabled
     */
    isEnabled(): boolean;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<MetricsConfig>;
    /**
     * Update configuration at runtime
     */
    updateConfig(updates: Partial<MetricsConfig>): void;
    /**
     * Increment a counter metric
     *
     * @param name - Metric name (e.g., 'jobs.started')
     * @param value - Amount to increment (default: 1)
     * @param tags - Optional tags for filtering/grouping
     */
    incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Get current counter value
     */
    getCounter(name: string, tags?: Record<string, string>): number;
    /**
     * Set a gauge metric to a specific value
     *
     * @param name - Metric name (e.g., 'jobs.active')
     * @param value - Current value
     * @param tags - Optional tags for filtering/grouping
     */
    setGauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Increment a gauge value
     */
    incrementGauge(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Decrement a gauge value
     */
    decrementGauge(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Get current gauge value
     */
    getGauge(name: string, tags?: Record<string, string>): number | undefined;
    /**
     * Record a timing metric
     *
     * @param name - Metric name (e.g., 'api.request.duration')
     * @param durationMs - Duration in milliseconds
     * @param tags - Optional tags for filtering/grouping
     */
    recordTiming(name: string, durationMs: number, tags?: Record<string, string>): void;
    /**
     * Create a timer that records duration when stopped
     *
     * @param name - Metric name
     * @param tags - Optional tags
     * @returns Timer object with stop() method
     */
    startTimer(name: string, tags?: Record<string, string>): {
        stop: () => number;
        elapsed: () => number;
    };
    /**
     * Record a value in a histogram
     *
     * @param name - Metric name
     * @param value - Value to record
     * @param tags - Optional tags
     * @param buckets - Custom bucket boundaries (defaults to timing buckets)
     */
    recordHistogram(name: string, value: number, tags?: Record<string, string>, _buckets?: number[]): void;
    /**
     * Get histogram statistics
     */
    getHistogramStats(name: string, tags?: Record<string, string>, buckets?: number[]): AggregatedMetric | undefined;
    /**
     * Calculate aggregation statistics for a set of values
     */
    private calculateAggregation;
    /**
     * Get all collected metrics
     */
    getAllMetrics(): PerformanceMetric[];
    /**
     * Get metrics by name pattern
     */
    getMetricsByName(pattern: string | RegExp): PerformanceMetric[];
    /**
     * Get all current counter values
     */
    getAllCounters(): Map<string, number>;
    /**
     * Get all current gauge values
     */
    getAllGauges(): Map<string, {
        value: number;
        timestamp: Date;
    }>;
    /**
     * Get summary statistics for all metrics
     */
    getSummary(): {
        totalMetrics: number;
        counters: number;
        gauges: number;
        histograms: number;
        oldestMetric?: Date;
        newestMetric?: Date;
    };
    /**
     * Reset all metrics (useful for testing)
     */
    reset(): void;
    /**
     * Remove metrics older than retention period
     */
    private cleanup;
    /**
     * Start periodic cleanup
     */
    private startCleanupInterval;
    /**
     * Stop the collector and cleanup resources
     */
    shutdown(): void;
    /**
     * Build a unique key for a metric with tags
     */
    private buildMetricKey;
    /**
     * Add a metric to storage
     */
    private addMetric;
}
/**
 * Get the default metrics collector instance
 */
export declare function getMetricsCollector(): MetricsCollector;
/**
 * Create a new metrics collector with specific configuration
 */
export declare function createMetricsCollector(config?: Partial<MetricsConfig>): MetricsCollector;
/**
 * Export metric names for convenience
 */
export { METRIC_NAMES };
export default MetricsCollector;
