/**
 * Monitoring API Server - Real-time system metrics and monitoring dashboard API
 */
import { BaseAPIServer, BaseAPIServerConfig } from '../lib/base-api-server.js';
export interface MonitoringAPIConfig extends BaseAPIServerConfig {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    monitoringDir?: string;
}
export declare class MonitoringAPIServer extends BaseAPIServer {
    private supabase;
    private monitoringDir;
    constructor(config?: Partial<MonitoringAPIConfig>);
    protected setupRoutes(): void;
    private getLatestMetrics;
    private getJobMetrics;
    private getPoliticianTrades;
    private getAlerts;
}
export declare function startMonitoringAPI(config?: Partial<MonitoringAPIConfig>): Promise<MonitoringAPIServer>;
