import express from 'express';
export interface PipelineServiceConfig {
    port?: number;
    databaseUrl?: string;
    mcliUrl?: string;
    mcliApiKey?: string;
    webhookBaseUrl?: string;
}
export declare class PipelineService {
    private app;
    private server;
    private io;
    private pool;
    private jobTracker;
    private mcliBridge;
    private workflowEngine;
    private config;
    private isDemoMode;
    private streamlitProcess;
    private getSystemJobs;
    constructor(config?: PipelineServiceConfig);
    private startStreamlit;
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    private setupEventListeners;
    getApp(): express.Application;
    getServer(): any;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export declare function startPipelineService(config?: PipelineServiceConfig): Promise<PipelineService>;
