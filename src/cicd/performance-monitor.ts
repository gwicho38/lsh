import { performance } from 'perf_hooks';
import * as os from 'os';

interface PerformanceMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    percentUsed: number;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
  requests: {
    total: number;
    avgResponseTime: number;
    errors: number;
    errorRate: number;
  };
  database: {
    activeConnections: number;
    avgQueryTime: number;
    slowQueries: number;
  };
}

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private requestMetrics: RequestMetrics[] = [];
  private dbQueryTimes: number[] = [];
  private eventLoopDelay: number = 0;
  private startTime: number;
  private alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
  };

  constructor() {
    this.startTime = Date.now();
    this.alertThresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      responseTime: 1000,
      errorRate: 5
    };

    this.setupEventLoopMonitoring();
    this.setupMemoryMonitoring();
  }

  private setupEventLoopMonitoring() {
    let lastCheck = process.hrtime.bigint();

    setInterval(() => {
      const now = process.hrtime.bigint();
      const delay = Number(now - lastCheck) / 1e6 - 100; // Convert to ms and subtract interval
      this.eventLoopDelay = Math.max(0, delay);
      lastCheck = now;
    }, 100);
  }

  private setupMemoryMonitoring() {
    // Monitor heap usage periodically
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const percentUsed = (memUsage.rss / totalMem) * 100;

      if (percentUsed > this.alertThresholds.memoryUsage) {
        this.triggerAlert('memory', `Memory usage at ${percentUsed.toFixed(2)}%`);
      }
    }, 30000); // Check every 30 seconds
  }

  recordRequest(metrics: RequestMetrics) {
    this.requestMetrics.push(metrics);

    // Keep only last 1000 requests in memory
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000);
    }

    // Check for high response time
    if (metrics.responseTime > this.alertThresholds.responseTime) {
      this.triggerAlert('response_time',
        `Slow request: ${metrics.method} ${metrics.path} took ${metrics.responseTime}ms`);
    }
  }

  recordDatabaseQuery(queryTime: number, query?: string) {
    this.dbQueryTimes.push(queryTime);

    if (this.dbQueryTimes.length > 1000) {
      this.dbQueryTimes = this.dbQueryTimes.slice(-1000);
    }

    // Alert for slow queries (> 100ms)
    if (queryTime > 100) {
      this.triggerAlert('slow_query',
        `Slow database query: ${queryTime}ms${query ? ` - ${query.substring(0, 100)}` : ''}`);
    }
  }

  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    // Calculate request metrics
    const recentRequests = this.requestMetrics.filter(r =>
      r.timestamp > now - 60000 // Last minute
    );

    const totalRequests = recentRequests.length;
    const errors = recentRequests.filter(r => r.statusCode >= 500).length;
    const avgResponseTime = totalRequests > 0
      ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests
      : 0;

    // Calculate database metrics
    const avgQueryTime = this.dbQueryTimes.length > 0
      ? this.dbQueryTimes.reduce((a, b) => a + b, 0) / this.dbQueryTimes.length
      : 0;

    const slowQueries = this.dbQueryTimes.filter(t => t > 100).length;

    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 * 100;
    const memPercent = (memUsage.rss / os.totalmem()) * 100;

    // Check alert thresholds
    if (cpuPercent > this.alertThresholds.cpuUsage) {
      this.triggerAlert('cpu', `CPU usage at ${cpuPercent.toFixed(2)}%`);
    }

    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
    if (errorRate > this.alertThresholds.errorRate) {
      this.triggerAlert('error_rate', `Error rate at ${errorRate.toFixed(2)}%`);
    }

    return {
      timestamp: now,
      cpu: {
        usage: cpuPercent,
        loadAverage: os.loadavg()
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        percentUsed: memPercent
      },
      eventLoop: {
        delay: this.eventLoopDelay,
        utilization: this.eventLoopDelay / 16.67 * 100 // Percentage of 60fps frame time
      },
      requests: {
        total: totalRequests,
        avgResponseTime,
        errors,
        errorRate
      },
      database: {
        activeConnections: 0, // To be updated by connection pool
        avgQueryTime,
        slowQueries
      }
    };
  }

  getHealthStatus(): { status: string; details: { uptime: number; issues: string[]; metrics: Record<string, string | number> } } {
    const metrics = this.getMetrics();
    let status = 'healthy';
    const issues: string[] = [];

    if (metrics.cpu.usage > this.alertThresholds.cpuUsage) {
      status = 'degraded';
      issues.push(`High CPU usage: ${metrics.cpu.usage.toFixed(2)}%`);
    }

    if (metrics.memory.percentUsed > this.alertThresholds.memoryUsage) {
      status = 'degraded';
      issues.push(`High memory usage: ${metrics.memory.percentUsed.toFixed(2)}%`);
    }

    if (metrics.requests.errorRate > this.alertThresholds.errorRate) {
      status = 'unhealthy';
      issues.push(`High error rate: ${metrics.requests.errorRate.toFixed(2)}%`);
    }

    if (metrics.eventLoop.delay > 50) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`Event loop delay: ${metrics.eventLoop.delay.toFixed(2)}ms`);
    }

    return {
      status,
      details: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        issues,
        metrics: {
          cpu: `${metrics.cpu.usage.toFixed(2)}%`,
          memory: `${metrics.memory.percentUsed.toFixed(2)}%`,
          requests: metrics.requests.total,
          errors: metrics.requests.errors,
          avgResponseTime: `${metrics.requests.avgResponseTime.toFixed(2)}ms`
        }
      }
    };
  }

  private triggerAlert(type: string, message: string) {
    console.warn(`[PERFORMANCE ALERT] ${type}: ${message}`);
    // Here you could send to monitoring service, trigger notifications, etc.
  }

  // Middleware for Express
  middleware() {
    return (req: { method: string; path: string }, res: { statusCode: number; end: (...args: unknown[]) => void }, next: () => void) => {
      const start = Date.now();

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = (...args: unknown[]) => {
        const responseTime = Date.now() - start;

        this.recordRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          timestamp: Date.now()
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Graceful shutdown
  async shutdown() {
    const finalMetrics = this.getMetrics();
    console.log('Final performance metrics:', finalMetrics);

    // Could save to database or send to monitoring service
    return finalMetrics;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper to measure function execution time
export function measurePerformance(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args: unknown[]) {
    const start = performance.now();

    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - start;

      console.log(`[PERF] ${propertyKey} took ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[PERF] ${propertyKey} failed after ${duration.toFixed(2)}ms`);
      throw error;
    }
  };

  return descriptor;
}

// Helper to profile memory usage
export function profileMemory(label: string) {
  const before = process.memoryUsage();

  return () => {
    const after = process.memoryUsage();
    const diff = {
      rss: (after.rss - before.rss) / 1024 / 1024,
      heapTotal: (after.heapTotal - before.heapTotal) / 1024 / 1024,
      heapUsed: (after.heapUsed - before.heapUsed) / 1024 / 1024,
      external: (after.external - before.external) / 1024 / 1024
    };

    console.log(`[MEMORY] ${label}:`, {
      rss: `${diff.rss.toFixed(2)} MB`,
      heapTotal: `${diff.heapTotal.toFixed(2)} MB`,
      heapUsed: `${diff.heapUsed.toFixed(2)} MB`,
      external: `${diff.external.toFixed(2)} MB`
    });
  };
}