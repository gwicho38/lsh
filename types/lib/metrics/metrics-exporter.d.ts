/**
 * Metrics Exporter
 *
 * Export metrics in various formats including Prometheus, JSON, and OpenMetrics.
 * Designed to be used with the MetricsCollector for exposing metrics via HTTP endpoints.
 */
import type { ExportFormat, MetricsConfig } from './types.js';
import { MetricsCollector } from './metrics-collector.js';
/**
 * Exported metrics result
 */
export interface ExportResult {
    /** Content type header for HTTP response */
    contentType: string;
    /** Formatted metrics content */
    content: string;
    /** Number of metrics exported */
    count: number;
    /** Export timestamp */
    timestamp: Date;
}
/**
 * PrometheusExporter - Export metrics in Prometheus text format
 */
export declare class PrometheusExporter {
    private collector;
    private defaultLabels;
    constructor(collector: MetricsCollector, defaultLabels?: Record<string, string>);
    /**
     * Export all metrics in Prometheus text format
     */
    export(): ExportResult;
    /**
     * Export system metrics in Prometheus format
     */
    exportSystemMetrics(): string;
    /**
     * Parse a metric key back into name and tags
     * Key format: "name{key1=value1,key2=value2}"
     */
    private parseMetricKey;
}
/**
 * JSONExporter - Export metrics in JSON format
 */
export declare class JSONExporter {
    private collector;
    private applicationName;
    constructor(collector: MetricsCollector, applicationName?: string);
    /**
     * Export all metrics in JSON format
     */
    export(): ExportResult;
    /**
     * Get current system metrics
     */
    private getSystemMetrics;
}
/**
 * Create an exporter based on format
 */
export declare function createExporter(collector: MetricsCollector, format: ExportFormat, config?: Partial<MetricsConfig>): PrometheusExporter | JSONExporter;
/**
 * Quick export function for use in HTTP endpoints
 */
export declare function exportMetrics(collector: MetricsCollector, format?: ExportFormat): ExportResult;
declare const _default: {
    PrometheusExporter: typeof PrometheusExporter;
    JSONExporter: typeof JSONExporter;
    createExporter: typeof createExporter;
    exportMetrics: typeof exportMetrics;
};
export default _default;
