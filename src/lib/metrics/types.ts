/**
 * Metrics Types
 *
 * Type definitions for the LSH metrics collection and performance monitoring system.
 * These types define the structure of metrics, profiles, and aggregations.
 */

/**
 * Supported metric types following standard observability patterns
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';

/**
 * Base metric interface for all metric types
 */
export interface Metric {
  /** Unique metric name (e.g., 'job.execution.duration') */
  name: string;
  /** Numeric value of the metric */
  value: number;
  /** Unit of measurement (e.g., 'ms', 'bytes', 'count') */
  unit: string;
  /** Optional key-value tags for filtering/grouping */
  tags?: Record<string, string>;
  /** When the metric was recorded */
  timestamp: Date;
}

/**
 * Performance metric with type classification
 */
export interface PerformanceMetric extends Metric {
  /** Type of metric for aggregation purposes */
  type: MetricType;
  /** Optional execution context (e.g., function name, job ID) */
  context?: string;
}

/**
 * Memory snapshot at a point in time
 */
export interface MemorySnapshot {
  /** Resident Set Size in bytes */
  rss: number;
  /** V8 heap used in bytes */
  heapUsed: number;
  /** V8 total heap size in bytes */
  heapTotal: number;
  /** Memory used by C++ objects bound to JavaScript */
  external: number;
  /** Memory used by ArrayBuffers and SharedArrayBuffers */
  arrayBuffers?: number;
}

/**
 * Profile checkpoint during execution
 */
export interface ProfileCheckpoint {
  /** Human-readable label for this checkpoint */
  label: string;
  /** High-resolution timestamp (nanoseconds) */
  timestamp: bigint;
  /** Memory snapshot at this checkpoint */
  memory: MemorySnapshot;
}

/**
 * Active profiling session
 */
export interface Profile {
  /** Profile name/identifier */
  name: string;
  /** High-resolution start time (nanoseconds) */
  startTime: bigint;
  /** Memory snapshot at profile start */
  startMemory: MemorySnapshot;
  /** Optional context data for this profile */
  context?: Record<string, unknown>;
  /** Checkpoints recorded during profiling */
  checkpoints: ProfileCheckpoint[];
}

/**
 * Result from a completed profile
 */
export interface ProfileResult {
  /** Profile name */
  name: string;
  /** Total duration in milliseconds */
  duration: number;
  /** Memory changes during the profiled operation */
  memoryDelta: MemorySnapshot;
  /** All checkpoints with relative timings */
  checkpoints: Array<{
    label: string;
    /** Time since profile start in milliseconds */
    relativeTime: number;
    /** Memory at this checkpoint */
    memory: MemorySnapshot;
  }>;
  /** Original context data */
  context?: Record<string, unknown>;
  /** End timestamp */
  endTime: Date;
}

/**
 * Histogram bucket for distribution tracking
 */
export interface HistogramBucket {
  /** Upper bound of this bucket (exclusive) */
  le: number;
  /** Count of values in this bucket */
  count: number;
}

/**
 * Aggregated metric statistics
 */
export interface AggregatedMetric {
  /** Metric name */
  name: string;
  /** Total count of observations */
  count: number;
  /** Sum of all values */
  sum: number;
  /** Minimum value observed */
  min: number;
  /** Maximum value observed */
  max: number;
  /** Average value */
  mean: number;
  /** Standard deviation */
  stddev?: number;
  /** Percentile values */
  percentiles?: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  /** For histograms: bucket distribution */
  buckets?: HistogramBucket[];
  /** Aggregation window start */
  windowStart: Date;
  /** Aggregation window end */
  windowEnd: Date;
  /** Tags associated with this aggregation */
  tags?: Record<string, string>;
}

/**
 * System resource metrics snapshot
 */
export interface SystemMetrics {
  /** Memory usage information */
  memory: MemorySnapshot;
  /** CPU usage percentage (0-100) */
  cpuUsage?: number;
  /** Event loop lag in milliseconds */
  eventLoopLag?: number;
  /** Number of open file descriptors */
  openFileDescriptors?: number;
  /** Active handles count */
  activeHandles?: number;
  /** Active requests count */
  activeRequests?: number;
  /** Uptime in seconds */
  uptime: number;
  /** Timestamp of snapshot */
  timestamp: Date;
}

/**
 * Metrics export format options
 */
export type ExportFormat = 'prometheus' | 'json' | 'openmetrics';

/**
 * Configuration for metrics collection
 */
export interface MetricsConfig {
  /** Enable metrics collection */
  enabled: boolean;
  /** Collection interval in milliseconds */
  collectionIntervalMs: number;
  /** Export format for metrics endpoint */
  exportFormat: ExportFormat;
  /** Retention period in seconds */
  retentionSeconds: number;
  /** Enable performance profiling */
  profilingEnabled: boolean;
  /** Sampling rate for profiling (0.0 - 1.0) */
  profilingSampleRate: number;
  /** Maximum number of metrics to store in memory */
  maxMetricsInMemory: number;
  /** Enable system metrics collection */
  systemMetricsEnabled: boolean;
  /** System metrics collection interval in milliseconds */
  systemMetricsIntervalMs: number;
  /** Default histogram buckets */
  defaultHistogramBuckets: number[];
  /** Application name for metric labels */
  applicationName: string;
  /** Additional default labels */
  defaultLabels?: Record<string, string>;
}

/**
 * Default histogram buckets for timing metrics (in milliseconds)
 */
export const DEFAULT_TIMING_BUCKETS = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

/**
 * Default histogram buckets for size metrics (in bytes)
 */
export const DEFAULT_SIZE_BUCKETS = [
  100, 1000, 10000, 100000, 1000000, 10000000, 100000000,
];

/**
 * Metric name prefixes for consistency
 */
export const METRIC_PREFIXES = {
  JOB: 'lsh_job',
  API: 'lsh_api',
  SYSTEM: 'lsh_system',
  SECRETS: 'lsh_secrets',
  DATABASE: 'lsh_db',
  CACHE: 'lsh_cache',
} as const;

/**
 * Standard metric names
 */
export const METRIC_NAMES = {
  // Job metrics
  JOB_EXECUTION_TOTAL: `${METRIC_PREFIXES.JOB}_executions_total`,
  JOB_EXECUTION_DURATION: `${METRIC_PREFIXES.JOB}_execution_duration_ms`,
  JOB_EXECUTION_SUCCESS: `${METRIC_PREFIXES.JOB}_executions_success_total`,
  JOB_EXECUTION_FAILURE: `${METRIC_PREFIXES.JOB}_executions_failure_total`,
  JOB_ACTIVE: `${METRIC_PREFIXES.JOB}_active`,
  JOB_QUEUED: `${METRIC_PREFIXES.JOB}_queued`,

  // API metrics
  API_REQUEST_TOTAL: `${METRIC_PREFIXES.API}_requests_total`,
  API_REQUEST_DURATION: `${METRIC_PREFIXES.API}_request_duration_ms`,
  API_REQUEST_SIZE: `${METRIC_PREFIXES.API}_request_size_bytes`,
  API_RESPONSE_SIZE: `${METRIC_PREFIXES.API}_response_size_bytes`,
  API_ERRORS_TOTAL: `${METRIC_PREFIXES.API}_errors_total`,

  // System metrics
  SYSTEM_MEMORY_RSS: `${METRIC_PREFIXES.SYSTEM}_memory_rss_bytes`,
  SYSTEM_MEMORY_HEAP_USED: `${METRIC_PREFIXES.SYSTEM}_memory_heap_used_bytes`,
  SYSTEM_MEMORY_HEAP_TOTAL: `${METRIC_PREFIXES.SYSTEM}_memory_heap_total_bytes`,
  SYSTEM_CPU_USAGE: `${METRIC_PREFIXES.SYSTEM}_cpu_usage_percent`,
  SYSTEM_EVENT_LOOP_LAG: `${METRIC_PREFIXES.SYSTEM}_event_loop_lag_ms`,
  SYSTEM_UPTIME: `${METRIC_PREFIXES.SYSTEM}_uptime_seconds`,

  // Secrets metrics
  SECRETS_ENCRYPT_TOTAL: `${METRIC_PREFIXES.SECRETS}_encrypt_operations_total`,
  SECRETS_DECRYPT_TOTAL: `${METRIC_PREFIXES.SECRETS}_decrypt_operations_total`,
  SECRETS_PUSH_TOTAL: `${METRIC_PREFIXES.SECRETS}_push_operations_total`,
  SECRETS_PULL_TOTAL: `${METRIC_PREFIXES.SECRETS}_pull_operations_total`,
  SECRETS_ROTATION_TOTAL: `${METRIC_PREFIXES.SECRETS}_rotation_operations_total`,

  // Database metrics
  DB_QUERY_TOTAL: `${METRIC_PREFIXES.DATABASE}_queries_total`,
  DB_QUERY_DURATION: `${METRIC_PREFIXES.DATABASE}_query_duration_ms`,
  DB_CONNECTIONS_ACTIVE: `${METRIC_PREFIXES.DATABASE}_connections_active`,
  DB_ERRORS_TOTAL: `${METRIC_PREFIXES.DATABASE}_errors_total`,

  // Cache metrics
  CACHE_HITS_TOTAL: `${METRIC_PREFIXES.CACHE}_hits_total`,
  CACHE_MISSES_TOTAL: `${METRIC_PREFIXES.CACHE}_misses_total`,
  CACHE_EVICTIONS_TOTAL: `${METRIC_PREFIXES.CACHE}_evictions_total`,
  CACHE_SIZE: `${METRIC_PREFIXES.CACHE}_size_items`,
} as const;
