/**
 * Tests for Metrics Exporters
 */

import {
  MetricsCollector,
  createMetricsCollector,
  PrometheusExporter,
  JSONExporter,
  createExporter,
  exportMetrics,
} from '../../lib/metrics/index.js';

describe('MetricsExporter', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = createMetricsCollector({ enabled: true });

    // Add some test metrics
    collector.incrementCounter('test.counter', 5);
    collector.incrementCounter('test.counter', 3, { type: 'shell' });
    collector.setGauge('test.gauge', 42);
    collector.setGauge('test.gauge', 100, { region: 'us-east' });
    collector.recordTiming('test.timing', 100);
    collector.recordTiming('test.timing', 200);
    collector.recordTiming('test.timing', 300);
  });

  afterEach(() => {
    collector.shutdown();
    collector.reset();
  });

  describe('PrometheusExporter', () => {
    let exporter: PrometheusExporter;

    beforeEach(() => {
      exporter = new PrometheusExporter(collector);
    });

    it('should export metrics in Prometheus format', () => {
      const result = exporter.export();

      expect(result.contentType).toBe('text/plain; version=0.0.4; charset=utf-8');
      expect(result.content).toContain('# LSH Metrics - Prometheus Format');
      expect(result.count).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should export counters with correct format', () => {
      const result = exporter.export();

      expect(result.content).toContain('# TYPE test_counter counter');
      expect(result.content).toMatch(/test_counter(\{[^}]+\})?\s+\d+/);
    });

    it('should export gauges with correct format', () => {
      const result = exporter.export();

      expect(result.content).toContain('# TYPE test_gauge gauge');
      expect(result.content).toMatch(/test_gauge(\{[^}]+\})?\s+\d+/);
    });

    it('should include labels for tagged metrics', () => {
      const result = exporter.export();

      expect(result.content).toContain('type="shell"');
      expect(result.content).toContain('region="us-east"');
    });

    it('should sanitize metric names', () => {
      collector.incrementCounter('metric-with-dashes.and.dots');

      const result = exporter.export();

      expect(result.content).toContain('metric_with_dashes_and_dots');
    });

    it('should export metrics with tag values containing special chars', () => {
      collector.incrementCounter('test.escaped', 1, {
        path: '/api/users',
      });

      const result = exporter.export();

      // Tag key and value should be present
      expect(result.content).toContain('path=');
      expect(result.content).toContain('/api/users');
    });

    it('should export system metrics', () => {
      const systemMetrics = exporter.exportSystemMetrics();

      expect(systemMetrics).toContain('lsh_system_memory_rss_bytes');
      expect(systemMetrics).toContain('lsh_system_memory_heap_used_bytes');
      expect(systemMetrics).toContain('lsh_system_uptime_seconds');
    });

    it('should include default labels', () => {
      const exporterWithLabels = new PrometheusExporter(collector, {
        app: 'lsh',
        env: 'test',
      });

      const result = exporterWithLabels.export();

      expect(result.content).toContain('app="lsh"');
      expect(result.content).toContain('env="test"');
    });

    it('should export histogram summaries', () => {
      const result = exporter.export();

      // Should have summary-style metrics for timing histogram
      expect(result.content).toMatch(/test_timing_sum/);
      expect(result.content).toMatch(/test_timing_count/);
    });
  });

  describe('JSONExporter', () => {
    let exporter: JSONExporter;

    beforeEach(() => {
      exporter = new JSONExporter(collector, 'lsh-test');
    });

    it('should export metrics in JSON format', () => {
      const result = exporter.export();

      expect(result.contentType).toBe('application/json');
      expect(result.count).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);

      // Should be valid JSON
      const parsed = JSON.parse(result.content);
      expect(parsed).toBeDefined();
    });

    it('should include application name', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.application).toBe('lsh-test');
    });

    it('should include timestamp', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
    });

    it('should include summary statistics', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.counters).toBeGreaterThanOrEqual(1);
      expect(parsed.summary.gauges).toBeGreaterThanOrEqual(1);
    });

    it('should include counters', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.metrics.counters).toBeDefined();
      expect(Object.keys(parsed.metrics.counters).length).toBeGreaterThan(0);
    });

    it('should include gauges with timestamps', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.metrics.gauges).toBeDefined();

      const gaugeKeys = Object.keys(parsed.metrics.gauges);
      expect(gaugeKeys.length).toBeGreaterThan(0);

      // Each gauge should have value and timestamp
      for (const key of gaugeKeys) {
        expect(parsed.metrics.gauges[key].value).toBeDefined();
        expect(parsed.metrics.gauges[key].timestamp).toBeDefined();
      }
    });

    it('should include histogram statistics', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.metrics.histograms).toBeDefined();
      expect(parsed.metrics.histograms['test.timing']).toBeDefined();

      const histStats = parsed.metrics.histograms['test.timing'];
      expect(histStats.count).toBe(3);
      expect(histStats.sum).toBe(600);
      expect(histStats.mean).toBe(200);
      expect(histStats.min).toBe(100);
      expect(histStats.max).toBe(300);
    });

    it('should include system metrics', () => {
      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.system).toBeDefined();
      expect(parsed.system.memory).toBeDefined();
      expect(parsed.system.memory.rss).toBeGreaterThan(0);
      expect(parsed.system.uptime).toBeGreaterThan(0);
    });

    it('should format JSON with indentation', () => {
      const result = exporter.export();

      // Check for formatting (newlines and spaces)
      expect(result.content).toContain('\n');
      expect(result.content).toMatch(/^\s+"/m); // Lines starting with spaces
    });
  });

  describe('createExporter', () => {
    it('should create PrometheusExporter for prometheus format', () => {
      const exporter = createExporter(collector, 'prometheus');
      expect(exporter).toBeInstanceOf(PrometheusExporter);
    });

    it('should create PrometheusExporter for openmetrics format', () => {
      const exporter = createExporter(collector, 'openmetrics');
      expect(exporter).toBeInstanceOf(PrometheusExporter);
    });

    it('should create JSONExporter for json format', () => {
      const exporter = createExporter(collector, 'json');
      expect(exporter).toBeInstanceOf(JSONExporter);
    });

    it('should default to PrometheusExporter for unknown format', () => {
      // @ts-expect-error Testing invalid format
      const exporter = createExporter(collector, 'unknown');
      expect(exporter).toBeInstanceOf(PrometheusExporter);
    });

    it('should pass config to exporters', () => {
      const exporter = createExporter(collector, 'prometheus', {
        defaultLabels: { instance: 'test' },
      });

      const result = exporter.export();
      expect(result.content).toContain('instance="test"');
    });
  });

  describe('exportMetrics convenience function', () => {
    it('should export in prometheus format by default', () => {
      const result = exportMetrics(collector);

      expect(result.contentType).toBe('text/plain; version=0.0.4; charset=utf-8');
    });

    it('should export in json format when specified', () => {
      const result = exportMetrics(collector, 'json');

      expect(result.contentType).toBe('application/json');
    });

    it('should return valid export result', () => {
      const result = exportMetrics(collector);

      expect(result.content).toBeTruthy();
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('empty collector', () => {
    it('should handle empty Prometheus export', () => {
      const emptyCollector = createMetricsCollector({ enabled: true });
      const exporter = new PrometheusExporter(emptyCollector);

      const result = exporter.export();

      expect(result.content).toContain('# LSH Metrics');
      expect(result.count).toBe(0);

      emptyCollector.shutdown();
    });

    it('should handle empty JSON export', () => {
      const emptyCollector = createMetricsCollector({ enabled: true });
      const exporter = new JSONExporter(emptyCollector);

      const result = exporter.export();
      const parsed = JSON.parse(result.content);

      expect(parsed.metrics.counters).toEqual({});
      expect(parsed.metrics.gauges).toEqual({});

      emptyCollector.shutdown();
    });
  });

  describe('special characters handling', () => {
    it('should sanitize metric names with dashes and special chars', () => {
      collector.incrementCounter('test-metric.with-dashes', 1);

      const exporter = new PrometheusExporter(collector);
      const result = exporter.export();

      // Dashes and dots should be converted to underscores in Prometheus format
      expect(result.content).toContain('test_metric_with_dashes');
    });

    it('should handle tags in export', () => {
      collector.incrementCounter('tagged.metric', 1, { env: 'production' });

      const exporter = new PrometheusExporter(collector);
      const result = exporter.export();

      // Tag should be present in export
      expect(result.content).toContain('tagged_metric');
      expect(result.content).toContain('env');
    });

    it('should handle metrics starting with numbers', () => {
      collector.incrementCounter('123_metric', 1);

      const exporter = new PrometheusExporter(collector);
      const result = exporter.export();

      // Should prefix with underscore since Prometheus names can't start with digits
      expect(result.content).toContain('_123_metric');
    });
  });
});
