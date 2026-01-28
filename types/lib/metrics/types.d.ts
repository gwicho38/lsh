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
export declare const DEFAULT_TIMING_BUCKETS: number[];
/**
 * Default histogram buckets for size metrics (in bytes)
 */
export declare const DEFAULT_SIZE_BUCKETS: number[];
/**
 * Metric name prefixes for consistency
 */
export declare const METRIC_PREFIXES: {
    readonly JOB: "lsh_job";
    readonly API: "lsh_api";
    readonly SYSTEM: "lsh_system";
    readonly SECRETS: "lsh_secrets";
    readonly DATABASE: "lsh_db";
    readonly CACHE: "lsh_cache";
};
/**
 * Standard metric names
 */
export declare const METRIC_NAMES: {
    readonly JOB_EXECUTION_TOTAL: "lsh_job_executions_total";
    readonly JOB_EXECUTION_DURATION: "lsh_job_execution_duration_ms";
    readonly JOB_EXECUTION_SUCCESS: "lsh_job_executions_success_total";
    readonly JOB_EXECUTION_FAILURE: "lsh_job_executions_failure_total";
    readonly JOB_ACTIVE: "lsh_job_active";
    readonly JOB_QUEUED: "lsh_job_queued";
    readonly API_REQUEST_TOTAL: "lsh_api_requests_total";
    readonly API_REQUEST_DURATION: "lsh_api_request_duration_ms";
    readonly API_REQUEST_SIZE: "lsh_api_request_size_bytes";
    readonly API_RESPONSE_SIZE: "lsh_api_response_size_bytes";
    readonly API_ERRORS_TOTAL: "lsh_api_errors_total";
    readonly SYSTEM_MEMORY_RSS: "lsh_system_memory_rss_bytes";
    readonly SYSTEM_MEMORY_HEAP_USED: "lsh_system_memory_heap_used_bytes";
    readonly SYSTEM_MEMORY_HEAP_TOTAL: "lsh_system_memory_heap_total_bytes";
    readonly SYSTEM_CPU_USAGE: "lsh_system_cpu_usage_percent";
    readonly SYSTEM_EVENT_LOOP_LAG: "lsh_system_event_loop_lag_ms";
    readonly SYSTEM_UPTIME: "lsh_system_uptime_seconds";
    readonly SECRETS_ENCRYPT_TOTAL: "lsh_secrets_encrypt_operations_total";
    readonly SECRETS_DECRYPT_TOTAL: "lsh_secrets_decrypt_operations_total";
    readonly SECRETS_PUSH_TOTAL: "lsh_secrets_push_operations_total";
    readonly SECRETS_PULL_TOTAL: "lsh_secrets_pull_operations_total";
    readonly SECRETS_ROTATION_TOTAL: "lsh_secrets_rotation_operations_total";
    readonly DB_QUERY_TOTAL: "lsh_db_queries_total";
    readonly DB_QUERY_DURATION: "lsh_db_query_duration_ms";
    readonly DB_CONNECTIONS_ACTIVE: "lsh_db_connections_active";
    readonly DB_ERRORS_TOTAL: "lsh_db_errors_total";
    readonly CACHE_HITS_TOTAL: "lsh_cache_hits_total";
    readonly CACHE_MISSES_TOTAL: "lsh_cache_misses_total";
    readonly CACHE_EVICTIONS_TOTAL: "lsh_cache_evictions_total";
    readonly CACHE_SIZE: "lsh_cache_size_items";
};
