/**
 * Tests for MetricsCollector
 */

import { jest } from '@jest/globals';
import {
  MetricsCollector,
  getMetricsCollector,
  createMetricsCollector,
  METRIC_NAMES,
} from '../../lib/metrics/index.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    // Create a fresh collector for each test
    collector = createMetricsCollector({ enabled: true });
  });

  afterEach(() => {
    collector.shutdown();
    collector.reset();
  });

  describe('initialization', () => {
    it('should create a new collector with default config', () => {
      expect(collector).toBeInstanceOf(MetricsCollector);
      expect(collector.isEnabled()).toBe(true);
    });

    it('should respect enabled flag', () => {
      const disabled = createMetricsCollector({ enabled: false });
      expect(disabled.isEnabled()).toBe(false);
      disabled.shutdown();
    });

    it('should return configuration', () => {
      const config = collector.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.maxMetricsInMemory).toBeGreaterThan(0);
    });

    it('should allow config updates', () => {
      collector.updateConfig({ maxMetricsInMemory: 5000 });
      const config = collector.getConfig();
      expect(config.maxMetricsInMemory).toBe(5000);
    });
  });

  describe('counters', () => {
    it('should increment counter by default value of 1', () => {
      collector.incrementCounter('test.counter');
      expect(collector.getCounter('test.counter')).toBe(1);
    });

    it('should increment counter by specified value', () => {
      collector.incrementCounter('test.counter', 5);
      expect(collector.getCounter('test.counter')).toBe(5);
    });

    it('should accumulate counter values', () => {
      collector.incrementCounter('test.counter', 3);
      collector.incrementCounter('test.counter', 2);
      expect(collector.getCounter('test.counter')).toBe(5);
    });

    it('should support counters with tags', () => {
      collector.incrementCounter('test.counter', 1, { type: 'shell' });
      collector.incrementCounter('test.counter', 2, { type: 'system' });

      expect(collector.getCounter('test.counter', { type: 'shell' })).toBe(1);
      expect(collector.getCounter('test.counter', { type: 'system' })).toBe(2);
    });

    it('should return 0 for non-existent counter', () => {
      expect(collector.getCounter('non.existent')).toBe(0);
    });

    it('should emit counter event', () => {
      const handler = jest.fn();
      collector.on('counter', handler);

      collector.incrementCounter('test.counter', 5, { foo: 'bar' });

      expect(handler).toHaveBeenCalledWith('test.counter', 5, { foo: 'bar' });
    });
  });

  describe('gauges', () => {
    it('should set gauge value', () => {
      collector.setGauge('test.gauge', 42);
      expect(collector.getGauge('test.gauge')).toBe(42);
    });

    it('should overwrite gauge value', () => {
      collector.setGauge('test.gauge', 10);
      collector.setGauge('test.gauge', 20);
      expect(collector.getGauge('test.gauge')).toBe(20);
    });

    it('should increment gauge value', () => {
      collector.setGauge('test.gauge', 10);
      collector.incrementGauge('test.gauge', 5);
      expect(collector.getGauge('test.gauge')).toBe(15);
    });

    it('should decrement gauge value', () => {
      collector.setGauge('test.gauge', 10);
      collector.decrementGauge('test.gauge', 3);
      expect(collector.getGauge('test.gauge')).toBe(7);
    });

    it('should not go below 0 when decrementing', () => {
      collector.setGauge('test.gauge', 5);
      collector.decrementGauge('test.gauge', 10);
      expect(collector.getGauge('test.gauge')).toBe(0);
    });

    it('should support gauges with tags', () => {
      collector.setGauge('test.gauge', 10, { region: 'us' });
      collector.setGauge('test.gauge', 20, { region: 'eu' });

      expect(collector.getGauge('test.gauge', { region: 'us' })).toBe(10);
      expect(collector.getGauge('test.gauge', { region: 'eu' })).toBe(20);
    });

    it('should return undefined for non-existent gauge', () => {
      expect(collector.getGauge('non.existent')).toBeUndefined();
    });

    it('should emit gauge event', () => {
      const handler = jest.fn();
      collector.on('gauge', handler);

      collector.setGauge('test.gauge', 42, { foo: 'bar' });

      expect(handler).toHaveBeenCalledWith('test.gauge', 42, { foo: 'bar' });
    });
  });

  describe('timing', () => {
    it('should record timing metric', () => {
      collector.recordTiming('test.timing', 100);
      const metrics = collector.getAllMetrics();
      const timing = metrics.find((m) => m.name === 'test.timing');
      expect(timing).toBeDefined();
      expect(timing?.value).toBe(100);
      expect(timing?.unit).toBe('ms');
      expect(timing?.type).toBe('timing');
    });

    it('should emit timing event', () => {
      const handler = jest.fn();
      collector.on('timing', handler);

      collector.recordTiming('test.timing', 100, { operation: 'query' });

      expect(handler).toHaveBeenCalledWith('test.timing', 100, { operation: 'query' });
    });

    it('should create timer that records duration', async () => {
      const timer = collector.startTimer('test.timer');

      // Simulate some work - use 50ms to avoid timing flakiness in CI
      // setTimeout doesn't guarantee minimum time, just approximate scheduling
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      const duration = timer.stop();
      // Use a lower bound with margin for timer precision variance
      expect(duration).toBeGreaterThanOrEqual(40);

      const metrics = collector.getAllMetrics();
      const timing = metrics.find((m) => m.name === 'test.timer');
      expect(timing).toBeDefined();
    });

    it('should report elapsed time without stopping', async () => {
      const timer = collector.startTimer('test.timer');

      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
      const elapsed1 = timer.elapsed();

      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
      const elapsed2 = timer.elapsed();

      expect(elapsed2).toBeGreaterThan(elapsed1);
    });
  });

  describe('histograms', () => {
    it('should record histogram values', () => {
      collector.recordHistogram('test.histogram', 10);
      collector.recordHistogram('test.histogram', 20);
      collector.recordHistogram('test.histogram', 30);

      const stats = collector.getHistogramStats('test.histogram');
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(3);
      expect(stats?.sum).toBe(60);
      expect(stats?.mean).toBe(20);
      expect(stats?.min).toBe(10);
      expect(stats?.max).toBe(30);
    });

    it('should calculate percentiles', () => {
      // Add 100 values from 1 to 100
      for (let i = 1; i <= 100; i++) {
        collector.recordHistogram('test.histogram', i);
      }

      const stats = collector.getHistogramStats('test.histogram');
      expect(stats?.percentiles).toBeDefined();
      expect(stats?.percentiles?.p50).toBe(50);
      expect(stats?.percentiles?.p95).toBe(95);
      expect(stats?.percentiles?.p99).toBe(99);
    });

    it('should return undefined for non-existent histogram', () => {
      const stats = collector.getHistogramStats('non.existent');
      expect(stats).toBeUndefined();
    });

    it('should emit histogram event', () => {
      const handler = jest.fn();
      collector.on('histogram', handler);

      collector.recordHistogram('test.histogram', 42, { bucket: 'fast' });

      expect(handler).toHaveBeenCalledWith('test.histogram', 42, { bucket: 'fast' });
    });
  });

  describe('metric retrieval', () => {
    it('should get all metrics', () => {
      collector.incrementCounter('counter1');
      collector.incrementCounter('counter2');
      collector.setGauge('gauge1', 10);

      const metrics = collector.getAllMetrics();
      expect(metrics.length).toBeGreaterThanOrEqual(3);
    });

    it('should get metrics by name pattern (string)', () => {
      collector.incrementCounter('job.started');
      collector.incrementCounter('job.completed');
      collector.incrementCounter('api.request');

      const jobMetrics = collector.getMetricsByName('job');
      expect(jobMetrics.length).toBeGreaterThanOrEqual(2);
    });

    it('should get metrics by name pattern (regex)', () => {
      collector.incrementCounter('job.started');
      collector.incrementCounter('job.completed');
      collector.incrementCounter('api.request');

      const jobMetrics = collector.getMetricsByName(/^job\./);
      expect(jobMetrics.length).toBeGreaterThanOrEqual(2);
    });

    it('should get all counters', () => {
      collector.incrementCounter('counter1');
      collector.incrementCounter('counter2');

      const counters = collector.getAllCounters();
      expect(counters.size).toBeGreaterThanOrEqual(2);
    });

    it('should get all gauges', () => {
      collector.setGauge('gauge1', 10);
      collector.setGauge('gauge2', 20);

      const gauges = collector.getAllGauges();
      expect(gauges.size).toBeGreaterThanOrEqual(2);
    });

    it('should get summary statistics', () => {
      collector.incrementCounter('counter1');
      collector.setGauge('gauge1', 10);
      collector.recordHistogram('histogram1', 100);

      const summary = collector.getSummary();
      expect(summary.counters).toBeGreaterThanOrEqual(1);
      expect(summary.gauges).toBeGreaterThanOrEqual(1);
      expect(summary.histograms).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reset and cleanup', () => {
    it('should reset all metrics', () => {
      collector.incrementCounter('counter1');
      collector.setGauge('gauge1', 10);
      collector.recordHistogram('histogram1', 100);

      collector.reset();

      expect(collector.getCounter('counter1')).toBe(0);
      expect(collector.getGauge('gauge1')).toBeUndefined();
      expect(collector.getHistogramStats('histogram1')).toBeUndefined();
    });

    it('should emit reset event', () => {
      const handler = jest.fn();
      collector.on('reset', handler);

      collector.reset();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit shutdown event', () => {
      const handler = jest.fn();
      collector.on('shutdown', handler);

      collector.shutdown();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('disabled collector', () => {
    let disabled: MetricsCollector;

    beforeEach(() => {
      disabled = createMetricsCollector({ enabled: false });
    });

    afterEach(() => {
      disabled.shutdown();
    });

    it('should not record counters when disabled', () => {
      disabled.incrementCounter('test.counter');
      expect(disabled.getCounter('test.counter')).toBe(0);
    });

    it('should not record gauges when disabled', () => {
      disabled.setGauge('test.gauge', 42);
      expect(disabled.getGauge('test.gauge')).toBeUndefined();
    });

    it('should not record timings when disabled', () => {
      disabled.recordTiming('test.timing', 100);
      expect(disabled.getAllMetrics()).toHaveLength(0);
    });
  });

  describe('singleton access', () => {
    it('should return same instance from getMetricsCollector', () => {
      const collector1 = getMetricsCollector();
      const collector2 = getMetricsCollector();
      expect(collector1).toBe(collector2);
    });
  });

  describe('METRIC_NAMES constants', () => {
    it('should have job metrics defined', () => {
      expect(METRIC_NAMES.JOB_EXECUTION_TOTAL).toBeDefined();
      expect(METRIC_NAMES.JOB_EXECUTION_DURATION).toBeDefined();
      expect(METRIC_NAMES.JOB_EXECUTION_SUCCESS).toBeDefined();
      expect(METRIC_NAMES.JOB_EXECUTION_FAILURE).toBeDefined();
    });

    it('should have API metrics defined', () => {
      expect(METRIC_NAMES.API_REQUEST_TOTAL).toBeDefined();
      expect(METRIC_NAMES.API_REQUEST_DURATION).toBeDefined();
      expect(METRIC_NAMES.API_ERRORS_TOTAL).toBeDefined();
    });

    it('should have system metrics defined', () => {
      expect(METRIC_NAMES.SYSTEM_MEMORY_RSS).toBeDefined();
      expect(METRIC_NAMES.SYSTEM_CPU_USAGE).toBeDefined();
      expect(METRIC_NAMES.SYSTEM_UPTIME).toBeDefined();
    });
  });
});
