/**
 * LSH Metrics Module
 *
 * Comprehensive performance monitoring and metrics collection for LSH.
 * Provides counters, gauges, histograms, timing metrics, and profiling.
 *
 * @example
 * ```typescript
 * import { getMetricsCollector, getPerformanceProfiler, exportMetrics } from './metrics/index.js';
 *
 * // Record metrics
 * const metrics = getMetricsCollector();
 * metrics.incrementCounter('jobs.started', 1, { type: 'shell' });
 * metrics.recordTiming('job.duration', 1234);
 *
 * // Profile operations
 * const profiler = getPerformanceProfiler();
 * profiler.startProfile('db-query', { query: 'SELECT...' });
 * // ... do work ...
 * const result = profiler.endProfile('db-query');
 *
 * // Export metrics
 * const exported = exportMetrics(metrics, 'prometheus');
 * console.log(exported.content);
 * ```
 */

// Core types
export type {
  MetricType,
  Metric,
  PerformanceMetric,
  MemorySnapshot,
  ProfileCheckpoint,
  Profile,
  ProfileResult,
  HistogramBucket,
  AggregatedMetric,
  SystemMetrics,
  ExportFormat,
  MetricsConfig,
} from './types.js';

// Type constants
export {
  DEFAULT_TIMING_BUCKETS,
  DEFAULT_SIZE_BUCKETS,
  METRIC_PREFIXES,
  METRIC_NAMES,
} from './types.js';

// MetricsCollector
export {
  MetricsCollector,
  getMetricsCollector,
  createMetricsCollector,
} from './metrics-collector.js';

// PerformanceProfiler
export {
  PerformanceProfiler,
  getPerformanceProfiler,
  createPerformanceProfiler,
  profileAsync,
  profileSync,
} from './performance-profiler.js';

// Exporters
export {
  PrometheusExporter,
  JSONExporter,
  createExporter,
  exportMetrics,
} from './metrics-exporter.js';
export type { ExportResult } from './metrics-exporter.js';
