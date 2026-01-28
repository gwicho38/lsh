/**
 * Metrics Collector
 *
 * Core metrics collection class following the Logger pattern.
 * Provides methods to record counters, gauges, histograms, and timing metrics.
 * Thread-safe and optimized for low overhead.
 */

import { EventEmitter } from 'events';
import { createLogger } from '../logger.js';
import { ENV_VARS, DEFAULTS } from '../../constants/index.js';
import {
  type PerformanceMetric,
  type AggregatedMetric,
  type MetricsConfig,
  type HistogramBucket,
  DEFAULT_TIMING_BUCKETS,
  METRIC_NAMES,
} from './types.js';

const logger = createLogger('MetricsCollector');

/**
 * Get metrics configuration from environment variables
 */
function getConfigFromEnv(): Partial<MetricsConfig> {
  return {
    enabled: process.env[ENV_VARS.LSH_METRICS_ENABLED] !== 'false',
    collectionIntervalMs: parseInt(
      process.env[ENV_VARS.LSH_METRICS_INTERVAL] || String(DEFAULTS.METRICS_COLLECTION_INTERVAL_MS),
      10
    ),
    exportFormat:
      (process.env[ENV_VARS.LSH_METRICS_EXPORT_FORMAT] as MetricsConfig['exportFormat']) ||
      DEFAULTS.METRICS_EXPORT_FORMAT,
    retentionSeconds: parseInt(
      process.env[ENV_VARS.LSH_METRICS_RETENTION] || String(DEFAULTS.METRICS_RETENTION_SECONDS),
      10
    ),
    profilingEnabled: process.env[ENV_VARS.LSH_PROFILING_ENABLED] === 'true',
    profilingSampleRate: parseFloat(
      process.env[ENV_VARS.LSH_PROFILING_SAMPLE_RATE] || String(DEFAULTS.PROFILING_SAMPLE_RATE)
    ),
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MetricsConfig = {
  enabled: true,
  collectionIntervalMs: 60000,
  exportFormat: 'prometheus',
  retentionSeconds: 30 * 24 * 60 * 60, // 30 days
  profilingEnabled: false,
  profilingSampleRate: 0.1,
  maxMetricsInMemory: 10000,
  systemMetricsEnabled: true,
  systemMetricsIntervalMs: 60000,
  defaultHistogramBuckets: DEFAULT_TIMING_BUCKETS,
  applicationName: 'lsh',
  defaultLabels: {},
};

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
export class MetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private aggregations: Map<string, AggregatedMetric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, { value: number; timestamp: Date }> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<MetricsConfig>) {
    super();
    const envConfig = getConfigFromEnv();
    this.config = {
      ...DEFAULT_CONFIG,
      ...envConfig,
      ...config,
    };

    if (this.config.enabled) {
      this.startCleanupInterval();
      logger.debug('MetricsCollector initialized', {
        enabled: this.config.enabled,
        exportFormat: this.config.exportFormat,
        profilingEnabled: this.config.profilingEnabled,
      });
    }
  }

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<MetricsConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.debug('MetricsCollector configuration updated', updates);
  }

  // ============================================================================
  // Counter Methods - For monotonically increasing values
  // ============================================================================

  /**
   * Increment a counter metric
   *
   * @param name - Metric name (e.g., 'jobs.started')
   * @param value - Amount to increment (default: 1)
   * @param tags - Optional tags for filtering/grouping
   */
  incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.buildMetricKey(name, tags);
    const currentValue = this.counters.get(key) || 0;
    this.counters.set(key, currentValue + value);

    this.addMetric({
      name,
      value: currentValue + value,
      unit: 'count',
      type: 'counter',
      tags,
      timestamp: new Date(),
    });

    this.emit('counter', name, value, tags);
  }

  /**
   * Get current counter value
   */
  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.buildMetricKey(name, tags);
    return this.counters.get(key) || 0;
  }

  // ============================================================================
  // Gauge Methods - For values that can go up or down
  // ============================================================================

  /**
   * Set a gauge metric to a specific value
   *
   * @param name - Metric name (e.g., 'jobs.active')
   * @param value - Current value
   * @param tags - Optional tags for filtering/grouping
   */
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

    const key = this.buildMetricKey(name, tags);
    const timestamp = new Date();
    this.gauges.set(key, { value, timestamp });

    this.addMetric({
      name,
      value,
      unit: 'value',
      type: 'gauge',
      tags,
      timestamp,
    });

    this.emit('gauge', name, value, tags);
  }

  /**
   * Increment a gauge value
   */
  incrementGauge(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildMetricKey(name, tags);
    const current = this.gauges.get(key)?.value || 0;
    this.setGauge(name, current + value, tags);
  }

  /**
   * Decrement a gauge value
   */
  decrementGauge(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildMetricKey(name, tags);
    const current = this.gauges.get(key)?.value || 0;
    this.setGauge(name, Math.max(0, current - value), tags);
  }

  /**
   * Get current gauge value
   */
  getGauge(name: string, tags?: Record<string, string>): number | undefined {
    const key = this.buildMetricKey(name, tags);
    return this.gauges.get(key)?.value;
  }

  // ============================================================================
  // Timing Methods - For duration measurements
  // ============================================================================

  /**
   * Record a timing metric
   *
   * @param name - Metric name (e.g., 'api.request.duration')
   * @param durationMs - Duration in milliseconds
   * @param tags - Optional tags for filtering/grouping
   */
  recordTiming(name: string, durationMs: number, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

    this.addMetric({
      name,
      value: durationMs,
      unit: 'ms',
      type: 'timing',
      tags,
      timestamp: new Date(),
    });

    // Also record in histogram for distribution analysis
    this.recordHistogram(name, durationMs, tags);

    this.emit('timing', name, durationMs, tags);
  }

  /**
   * Create a timer that records duration when stopped
   *
   * @param name - Metric name
   * @param tags - Optional tags
   * @returns Timer object with stop() method
   */
  startTimer(
    name: string,
    tags?: Record<string, string>
  ): { stop: () => number; elapsed: () => number } {
    const start = process.hrtime.bigint();

    return {
      stop: () => {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // Convert to ms
        this.recordTiming(name, duration, tags);
        return duration;
      },
      elapsed: () => {
        return Number(process.hrtime.bigint() - start) / 1_000_000;
      },
    };
  }

  // ============================================================================
  // Histogram Methods - For distribution tracking
  // ============================================================================

  /**
   * Record a value in a histogram
   *
   * @param name - Metric name
   * @param value - Value to record
   * @param tags - Optional tags
   * @param buckets - Custom bucket boundaries (defaults to timing buckets)
   */
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
    _buckets?: number[]
  ): void {
    if (!this.config.enabled) return;

    const key = this.buildMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);

    // Limit stored values to prevent memory issues
    if (values.length > this.config.maxMetricsInMemory) {
      values.shift();
    }

    this.histograms.set(key, values);

    this.emit('histogram', name, value, tags);
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(
    name: string,
    tags?: Record<string, string>,
    buckets?: number[]
  ): AggregatedMetric | undefined {
    const key = this.buildMetricKey(name, tags);
    const values = this.histograms.get(key);

    if (!values || values.length === 0) {
      return undefined;
    }

    return this.calculateAggregation(name, values, buckets || this.config.defaultHistogramBuckets);
  }

  // ============================================================================
  // Aggregation Methods
  // ============================================================================

  /**
   * Calculate aggregation statistics for a set of values
   */
  private calculateAggregation(
    name: string,
    values: number[],
    buckets: number[]
  ): AggregatedMetric {
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    // Calculate standard deviation
    const squaredDiffs = sorted.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, v) => acc + v, 0) / count;
    const stddev = Math.sqrt(avgSquaredDiff);

    // Calculate percentiles
    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, Math.min(index, count - 1))];
    };

    // Calculate histogram buckets
    const histogramBuckets: HistogramBucket[] = buckets.map((le) => ({
      le,
      count: sorted.filter((v) => v <= le).length,
    }));

    return {
      name,
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      stddev,
      percentiles: {
        p50: percentile(50),
        p75: percentile(75),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
      },
      buckets: histogramBuckets,
      windowStart: new Date(Date.now() - this.config.collectionIntervalMs),
      windowEnd: new Date(),
    };
  }

  // ============================================================================
  // Retrieval Methods
  // ============================================================================

  /**
   * Get all collected metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  /**
   * Get metrics by name pattern
   */
  getMetricsByName(pattern: string | RegExp): PerformanceMetric[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const result: PerformanceMetric[] = [];

    for (const [key, metrics] of this.metrics) {
      if (regex.test(key)) {
        result.push(...metrics);
      }
    }

    return result;
  }

  /**
   * Get all current counter values
   */
  getAllCounters(): Map<string, number> {
    return new Map(this.counters);
  }

  /**
   * Get all current gauge values
   */
  getAllGauges(): Map<string, { value: number; timestamp: Date }> {
    return new Map(this.gauges);
  }

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
  } {
    let oldestMetric: Date | undefined;
    let newestMetric: Date | undefined;

    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (!oldestMetric || metric.timestamp < oldestMetric) {
          oldestMetric = metric.timestamp;
        }
        if (!newestMetric || metric.timestamp > newestMetric) {
          newestMetric = metric.timestamp;
        }
      }
    }

    let totalMetrics = 0;
    for (const metrics of this.metrics.values()) {
      totalMetrics += metrics.length;
    }

    return {
      totalMetrics,
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      oldestMetric,
      newestMetric,
    };
  }

  // ============================================================================
  // Cleanup and Reset
  // ============================================================================

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.aggregations.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    logger.debug('MetricsCollector reset');
    this.emit('reset');
  }

  /**
   * Remove metrics older than retention period
   */
  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.config.retentionSeconds * 1000);

    for (const [key, metrics] of this.metrics) {
      const filtered = metrics.filter((m) => m.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }

    logger.debug('Metrics cleanup completed', {
      cutoff: cutoff.toISOString(),
      metricsRemaining: this.getSummary().totalMetrics,
    });
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      60 * 60 * 1000
    );

    // Don't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop the collector and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    logger.debug('MetricsCollector shutdown');
    this.emit('shutdown');
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Build a unique key for a metric with tags
   */
  private buildMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const sortedTags = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}{${sortedTags}}`;
  }

  /**
   * Add a metric to storage
   */
  private addMetric(metric: PerformanceMetric): void {
    const key = this.buildMetricKey(metric.name, metric.tags);
    const existing = this.metrics.get(key) || [];

    existing.push(metric);

    // Enforce max metrics limit
    if (existing.length > this.config.maxMetricsInMemory) {
      existing.shift();
    }

    this.metrics.set(key, existing);
  }
}

/**
 * Default metrics collector instance
 */
let defaultCollector: MetricsCollector | undefined;

/**
 * Get the default metrics collector instance
 */
export function getMetricsCollector(): MetricsCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricsCollector();
  }
  return defaultCollector;
}

/**
 * Create a new metrics collector with specific configuration
 */
export function createMetricsCollector(config?: Partial<MetricsConfig>): MetricsCollector {
  return new MetricsCollector(config);
}

/**
 * Export metric names for convenience
 */
export { METRIC_NAMES };

export default MetricsCollector;
