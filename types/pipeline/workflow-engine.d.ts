import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { JobTracker } from './job-tracker.js';
export interface WorkflowNode {
    id: string;
    name: string;
    type: 'job' | 'condition' | 'parallel' | 'wait';
    config: Record<string, unknown>;
    dependencies: string[];
    retryPolicy?: {
        maxRetries: number;
        backoffMs: number;
        backoffMultiplier: number;
    };
    timeout?: number;
    condition?: string;
}
export interface WorkflowDefinition {
    id?: string;
    name: string;
    description?: string;
    version: string;
    nodes: WorkflowNode[];
    parameters?: Record<string, unknown>;
    schedule?: {
        cron: string;
        timezone?: string;
        enabled: boolean;
    };
    timeout?: number;
    maxConcurrentRuns?: number;
    tags?: string[];
    owner?: string;
    team?: string;
}
export interface WorkflowExecution {
    id: string;
    workflowId: string;
    runId: string;
    status: WorkflowStatus;
    triggeredBy: string;
    triggerType: 'manual' | 'schedule' | 'webhook' | 'dependency';
    parameters: Record<string, unknown>;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    currentStage?: string;
    completedStages: string[];
    failedStages: string[];
    result?: unknown;
    errorMessage?: string;
    nodeStates: Record<string, NodeState>;
}
export interface NodeState {
    nodeId: string;
    status: NodeStatus;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    jobId?: string;
    result?: unknown;
    error?: string;
    retryCount: number;
    nextRetryAt?: Date;
}
export declare enum WorkflowStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    PAUSED = "paused"
}
export declare enum NodeStatus {
    PENDING = "pending",
    WAITING = "waiting",// Waiting for dependencies
    READY = "ready",// Dependencies satisfied, ready to run
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    SKIPPED = "skipped",
    CANCELLED = "cancelled"
}
export declare class WorkflowEngine extends EventEmitter {
    private pool;
    private jobTracker;
    private runningExecutions;
    private pollInterval;
    constructor(pool: Pool, jobTracker: JobTracker);
    private setupJobEventListeners;
    createWorkflow(definition: WorkflowDefinition): Promise<WorkflowDefinition>;
    getWorkflow(workflowId: string): Promise<WorkflowDefinition | null>;
    updateWorkflow(workflowId: string, definition: WorkflowDefinition): Promise<void>;
    deleteWorkflow(workflowId: string): Promise<void>;
    executeWorkflow(workflowId: string, triggeredBy: string, triggerType: 'manual' | 'schedule' | 'webhook' | 'dependency', parameters?: Record<string, unknown>): Promise<WorkflowExecution>;
    private startExecution;
    private executeNode;
    private executeJobNode;
    private executeConditionNode;
    private executeParallelNode;
    private executeWaitNode;
    private handleJobCompletion;
    private scheduleNodeRetry;
    private checkAndContinueExecution;
    private findReadyNodes;
    private completeWorkflow;
    private handleWorkflowFailure;
    cancelWorkflow(executionId: string): Promise<void>;
    private validateWorkflow;
    private detectCycles;
    private evaluateCondition;
    private generateRunId;
    private getRunningExecutionsCount;
    private storeExecution;
    private updateExecution;
    getExecution(executionId: string): Promise<WorkflowExecution | null>;
    listExecutions(workflowId?: string, limit?: number): Promise<WorkflowExecution[]>;
    private parseExecutionRow;
    private handleNodeFailure;
    listWorkflows(filters?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<WorkflowDefinition[]>;
    getWorkflowExecutions(workflowId: string, filters?: {
        limit?: number;
        offset?: number;
    }): Promise<WorkflowExecution[]>;
    cancelExecution(executionId: string): Promise<void>;
    validateWorkflowById(workflowId: string): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
    getWorkflowDependencies(workflowId: string): Promise<{
        nodes: Array<{
            id: string;
            dependencies: string[];
            dependents: string[];
        }>;
        graph: Record<string, string[]>;
    }>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private checkScheduledExecutions;
    private cleanupCompletedExecutions;
    private parseWorkflowRow;
    cleanup(): Promise<void>;
}
