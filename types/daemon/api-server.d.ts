/**
 * LSH API Server - RESTful API for daemon control and job management
 */
import cors from 'cors';
import type { LSHJobDaemon } from './lshd.js';
import { BaseAPIServer, BaseAPIServerConfig } from '../lib/base-api-server.js';
export interface ApiConfig extends BaseAPIServerConfig {
    apiKey?: string;
    jwtSecret?: string;
    enableWebhooks?: boolean;
    webhookEndpoints?: string[];
}
export declare class LSHApiServer extends BaseAPIServer {
    private daemon;
    private apiConfig;
    private clients;
    constructor(daemon: LSHJobDaemon, config?: Partial<ApiConfig>);
    /**
     * Override CORS configuration to support wildcard patterns
     */
    protected configureCORS(): ReturnType<typeof cors>;
    /**
     * Helper method to handle API operations with automatic error handling and webhooks
     */
    private handleOperation;
    private authenticateRequest;
    protected setupRoutes(): void;
    private setupEventHandlers;
    private broadcastToClients;
    private triggerWebhook;
    private convertToCSV;
    /**
     * Override onStop to cleanup SSE connections
     */
    protected onStop(): void;
    /**
     * Override start to log API key
     */
    start(): Promise<void>;
    getApiKey(): string;
}
