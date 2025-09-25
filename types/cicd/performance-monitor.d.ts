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
export declare class PerformanceMonitor {
    private requestMetrics;
    private dbQueryTimes;
    private eventLoopDelay;
    private startTime;
    private alertThresholds;
    constructor();
    private setupEventLoopMonitoring;
    private setupMemoryMonitoring;
    recordRequest(metrics: RequestMetrics): void;
    recordDatabaseQuery(queryTime: number, query?: string): void;
    getMetrics(): PerformanceMetrics;
    getHealthStatus(): {
        status: string;
        details: {
            uptime: number;
            issues: string[];
            metrics: Record<string, string | number>;
        };
    };
    private triggerAlert;
    middleware(): (req: {
        method: string;
        path: string;
    }, res: {
        statusCode: number;
        end: (...args: unknown[]) => void;
    }, next: () => void) => void;
    shutdown(): Promise<PerformanceMetrics>;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare function measurePerformance(target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
export declare function profileMemory(label: string): () => void;
export {};
