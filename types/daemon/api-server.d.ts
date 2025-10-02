/**
 * LSH API Server - RESTful API for daemon control and job management
 */
import express from 'express';
import { EventEmitter } from 'events';
import type { LSHJobDaemon } from './lshd.js';
export interface ApiConfig {
    port: number;
    apiKey?: string;
    jwtSecret?: string;
    corsOrigins?: string[];
    enableWebhooks?: boolean;
    webhookEndpoints?: string[];
}
export declare class LSHApiServer extends EventEmitter {
    private app;
    private daemon;
    private config;
    private server;
    private clients;
    constructor(daemon: LSHJobDaemon, config?: Partial<ApiConfig>);
    private setupMiddleware;
    private authenticateRequest;
    private setupRoutes;
    private setupEventHandlers;
    private broadcastToClients;
    private triggerWebhook;
    private convertToCSV;
    start(): Promise<void>;
    stop(): Promise<void>;
    getApiKey(): string;
    getPort(): number;
    getApp(): express.Application;
}
