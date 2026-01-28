/**
 * Metrics Exporter
 *
 * Export metrics in various formats including Prometheus, JSON, and OpenMetrics.
 * Designed to be used with the MetricsCollector for exposing metrics via HTTP endpoints.
 */

import { createLogger } from '../logger.js';
import type {
  AggregatedMetric,
  ExportFormat,
  SystemMetrics,
  MetricsConfig,
} from './types.js';
import { MetricsCollector } from './metrics-collector.js';

const logger = createLogger('MetricsExporter');

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
 * Sanitize metric name for Prometheus compatibility
 * - Replace invalid characters with underscores
 * - Ensure name doesn't start with a digit
 */
function sanitizePrometheusName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9_:]/g, '_');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized;
}

/**
 * Format tags as Prometheus label string
 */
function formatPrometheusLabels(tags?: Record<string, string>): string {
  if (!tags || Object.keys(tags).length === 0) {
    return '';
  }

  const labels = Object.entries(tags)
    .map(([key, value]) => {
      const sanitizedKey = sanitizePrometheusName(key);
      // Escape backslashes, double quotes, and newlines in values
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `${sanitizedKey}="${escapedValue}"`;
    })
    .join(',');

  return `{${labels}}`;
}

/**
 * PrometheusExporter - Export metrics in Prometheus text format
 */
export class PrometheusExporter {
  private collector: MetricsCollector;
  private defaultLabels: Record<string, string>;

  constructor(collector: MetricsCollector, defaultLabels?: Record<string, string>) {
    this.collector = collector;
    this.defaultLabels = defaultLabels || {};
  }

  /**
   * Export all metrics in Prometheus text format
   */
  export(): ExportResult {
    const lines: string[] = [];
    let count = 0;

    // Add header comment
    lines.push('# LSH Metrics - Prometheus Format');
    lines.push(`# Exported at: ${new Date().toISOString()}`);
    lines.push('');

    // Export counters
    const counters = this.collector.getAllCounters();
    for (const [key, value] of counters) {
      const { name, tags } = this.parseMetricKey(key);
      const sanitizedName = sanitizePrometheusName(name);
      const labels = formatPrometheusLabels({ ...this.defaultLabels, ...tags });

      // Add HELP and TYPE comments for first occurrence of each metric
      lines.push(`# HELP ${sanitizedName} Counter metric`);
      lines.push(`# TYPE ${sanitizedName} counter`);
      lines.push(`${sanitizedName}${labels} ${value}`);
      count++;
    }

    // Export gauges
    const gauges = this.collector.getAllGauges();
    for (const [key, { value }] of gauges) {
      const { name, tags } = this.parseMetricKey(key);
      const sanitizedName = sanitizePrometheusName(name);
      const labels = formatPrometheusLabels({ ...this.defaultLabels, ...tags });

      lines.push(`# HELP ${sanitizedName} Gauge metric`);
      lines.push(`# TYPE ${sanitizedName} gauge`);
      lines.push(`${sanitizedName}${labels} ${value}`);
      count++;
    }

    // Export summary statistics from histograms
    const histogramMetrics = this.collector.getMetricsByName(/.*/).filter((m) => m.type === 'histogram' || m.type === 'timing');
    const histogramNames = new Set(histogramMetrics.map((m) => m.name));

    for (const name of histogramNames) {
      const stats = this.collector.getHistogramStats(name);
      if (stats) {
        const sanitizedName = sanitizePrometheusName(name);
        const labels = formatPrometheusLabels(this.defaultLabels);

        lines.push(`# HELP ${sanitizedName} Histogram/timing metric`);
        lines.push(`# TYPE ${sanitizedName} summary`);
        lines.push(`${sanitizedName}_sum${labels} ${stats.sum}`);
        lines.push(`${sanitizedName}_count${labels} ${stats.count}`);

        if (stats.percentiles) {
          lines.push(`${sanitizedName}{quantile="0.5"} ${stats.percentiles.p50}`);
          lines.push(`${sanitizedName}{quantile="0.75"} ${stats.percentiles.p75}`);
          lines.push(`${sanitizedName}{quantile="0.9"} ${stats.percentiles.p90}`);
          lines.push(`${sanitizedName}{quantile="0.95"} ${stats.percentiles.p95}`);
          lines.push(`${sanitizedName}{quantile="0.99"} ${stats.percentiles.p99}`);
        }

        count++;
      }
    }

    lines.push('');
    lines.push(`# Metrics count: ${count}`);

    logger.debug('Prometheus export completed', { count });

    return {
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      content: lines.join('\n'),
      count,
      timestamp: new Date(),
    };
  }

  /**
   * Export system metrics in Prometheus format
   */
  exportSystemMetrics(): string {
    const mem = process.memoryUsage();
    const uptime = process.uptime();

    const lines: string[] = [
      '# HELP lsh_system_memory_rss_bytes Resident Set Size',
      '# TYPE lsh_system_memory_rss_bytes gauge',
      `lsh_system_memory_rss_bytes ${mem.rss}`,
      '',
      '# HELP lsh_system_memory_heap_used_bytes V8 heap used',
      '# TYPE lsh_system_memory_heap_used_bytes gauge',
      `lsh_system_memory_heap_used_bytes ${mem.heapUsed}`,
      '',
      '# HELP lsh_system_memory_heap_total_bytes V8 heap total',
      '# TYPE lsh_system_memory_heap_total_bytes gauge',
      `lsh_system_memory_heap_total_bytes ${mem.heapTotal}`,
      '',
      '# HELP lsh_system_uptime_seconds Process uptime',
      '# TYPE lsh_system_uptime_seconds counter',
      `lsh_system_uptime_seconds ${uptime}`,
    ];

    return lines.join('\n');
  }

  /**
   * Parse a metric key back into name and tags
   * Key format: "name{key1=value1,key2=value2}"
   */
  private parseMetricKey(key: string): { name: string; tags?: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) {
      return { name: key };
    }

    const name = match[1];
    const tagsStr = match[2];

    if (!tagsStr) {
      return { name };
    }

    const tags: Record<string, string> = {};
    // Split on comma, but only at the top level (not inside values)
    // Use a simple approach: split by comma and then by first equals sign
    const tagPairs = tagsStr.split(',');
    for (const pair of tagPairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > 0) {
        const tagKey = pair.substring(0, eqIndex);
        const tagValue = pair.substring(eqIndex + 1);
        if (tagKey && tagValue !== undefined) {
          tags[tagKey] = tagValue;
        }
      }
    }

    return { name, tags };
  }
}

/**
 * JSONExporter - Export metrics in JSON format
 */
export class JSONExporter {
  private collector: MetricsCollector;
  private applicationName: string;

  constructor(collector: MetricsCollector, applicationName = 'lsh') {
    this.collector = collector;
    this.applicationName = applicationName;
  }

  /**
   * Export all metrics in JSON format
   */
  export(): ExportResult {
    const counters: Record<string, number> = {};
    const gauges: Record<string, { value: number; timestamp: string }> = {};
    const histograms: Record<string, AggregatedMetric> = {};

    // Collect counters
    for (const [key, value] of this.collector.getAllCounters()) {
      counters[key] = value;
    }

    // Collect gauges
    for (const [key, data] of this.collector.getAllGauges()) {
      gauges[key] = {
        value: data.value,
        timestamp: data.timestamp.toISOString(),
      };
    }

    // Collect histogram stats
    const histogramMetrics = this.collector
      .getMetricsByName(/.*/)
      .filter((m) => m.type === 'histogram' || m.type === 'timing');
    const histogramNames = new Set(histogramMetrics.map((m) => m.name));

    for (const name of histogramNames) {
      const stats = this.collector.getHistogramStats(name);
      if (stats) {
        histograms[name] = stats;
      }
    }

    const summary = this.collector.getSummary();

    const exportData = {
      application: this.applicationName,
      timestamp: new Date().toISOString(),
      summary: {
        totalMetrics: summary.totalMetrics,
        counters: summary.counters,
        gauges: summary.gauges,
        histograms: summary.histograms,
      },
      metrics: {
        counters,
        gauges,
        histograms,
      },
      system: this.getSystemMetrics(),
    };

    const content = JSON.stringify(exportData, null, 2);
    const count = Object.keys(counters).length + Object.keys(gauges).length + Object.keys(histograms).length;

    logger.debug('JSON export completed', { count });

    return {
      contentType: 'application/json',
      content,
      count,
      timestamp: new Date(),
    };
  }

  /**
   * Get current system metrics
   */
  private getSystemMetrics(): SystemMetrics {
    const mem = process.memoryUsage();
    return {
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }
}

/**
 * Create an exporter based on format
 */
export function createExporter(
  collector: MetricsCollector,
  format: ExportFormat,
  config?: Partial<MetricsConfig>
): PrometheusExporter | JSONExporter {
  switch (format) {
    case 'prometheus':
    case 'openmetrics':
      return new PrometheusExporter(collector, config?.defaultLabels);
    case 'json':
      return new JSONExporter(collector, config?.applicationName);
    default:
      logger.warn(`Unknown export format: ${format}, defaulting to Prometheus`);
      return new PrometheusExporter(collector, config?.defaultLabels);
  }
}

/**
 * Quick export function for use in HTTP endpoints
 */
export function exportMetrics(collector: MetricsCollector, format: ExportFormat = 'prometheus'): ExportResult {
  const exporter = createExporter(collector, format);
  return exporter.export();
}

export default { PrometheusExporter, JSONExporter, createExporter, exportMetrics };
