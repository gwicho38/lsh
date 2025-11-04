import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { JobTracker, PipelineJob, JobStatus, JobPriority } from './job-tracker.js';

export interface WorkflowNode {
  id: string;
  name: string;
  type: 'job' | 'condition' | 'parallel' | 'wait';
  config: Record<string, unknown>;
  dependencies: string[]; // Node IDs this node depends on
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  timeout?: number; // in milliseconds
  condition?: string; // JavaScript expression for conditional nodes
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
  jobId?: string; // For job nodes
  result?: unknown;
  error?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum NodeStatus {
  PENDING = 'pending',
  WAITING = 'waiting', // Waiting for dependencies
  READY = 'ready', // Dependencies satisfied, ready to run
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

export class WorkflowEngine extends EventEmitter {
  private pool: Pool;
  private jobTracker: JobTracker;
  private runningExecutions: Map<string, WorkflowExecution> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool, jobTracker: JobTracker) {
    super();
    this.pool = pool;
    this.jobTracker = jobTracker;

    // Listen to job completion events
    this.setupJobEventListeners();
  }

  private setupJobEventListeners() {
    this.jobTracker.on('execution:completed', async (event) => {
      await this.handleJobCompletion(event.jobId, event.executionId, 'completed', event.data);
    });

    this.jobTracker.on('execution:failed', async (event) => {
      await this.handleJobCompletion(event.jobId, event.executionId, 'failed', event.data);
    });
  }

  // Workflow Definition Management
  async createWorkflow(definition: WorkflowDefinition): Promise<WorkflowDefinition> {
    const id = definition.id || uuidv4();

    // Validate workflow
    this.validateWorkflow(definition);

    const query = `
      INSERT INTO pipeline_workflows (
        id, name, description, version, definition, schedule_cron,
        config, default_parameters, tags, owner, team
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      id,
      definition.name,
      definition.description,
      definition.version,
      JSON.stringify(definition),
      definition.schedule?.cron,
      JSON.stringify({ timeout: definition.timeout, maxConcurrentRuns: definition.maxConcurrentRuns }),
      JSON.stringify(definition.parameters || {}),
      definition.tags,
      definition.owner,
      definition.team
    ];

    const _result = await this.pool.query(query, values);

    this.emit('workflow:created', {
      type: 'workflow:created',
      workflowId: id,
      data: definition,
      timestamp: new Date()
    });

    return { ...definition, id };
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    const query = 'SELECT * FROM pipeline_workflows WHERE id = $1';
    const result = await this.pool.query(query, [workflowId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return JSON.parse(row.definition);
  }

  async updateWorkflow(workflowId: string, definition: WorkflowDefinition): Promise<void> {
    this.validateWorkflow(definition);

    const query = `
      UPDATE pipeline_workflows
      SET definition = $2, version = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [workflowId, JSON.stringify(definition), definition.version]);

    this.emit('workflow:updated', {
      type: 'workflow:updated',
      workflowId,
      data: definition,
      timestamp: new Date()
    });
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    // Check for running executions
    const runningCount = await this.getRunningExecutionsCount(workflowId);
    if (runningCount > 0) {
      throw new Error(`Cannot delete workflow with ${runningCount} running executions`);
    }

    const query = 'UPDATE pipeline_workflows SET is_active = false WHERE id = $1';
    await this.pool.query(query, [workflowId]);

    this.emit('workflow:deleted', {
      type: 'workflow:deleted',
      workflowId,
      timestamp: new Date()
    });
  }

  // Workflow Execution
  async executeWorkflow(
    workflowId: string,
    triggeredBy: string,
    triggerType: 'manual' | 'schedule' | 'webhook' | 'dependency',
    parameters: Record<string, unknown> = {}
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Check concurrency limits
    const runningCount = await this.getRunningExecutionsCount(workflowId);
    const maxConcurrent = workflow.maxConcurrentRuns || 1;

    if (runningCount >= maxConcurrent) {
      throw new Error(`Workflow ${workflowId} has reached max concurrent runs (${maxConcurrent})`);
    }

    // Create execution
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      runId: this.generateRunId(workflow.name),
      status: WorkflowStatus.PENDING,
      triggeredBy,
      triggerType,
      parameters: { ...workflow.parameters, ...parameters },
      startedAt: new Date(),
      completedStages: [],
      failedStages: [],
      nodeStates: {}
    };

    // Initialize node states
    for (const node of workflow.nodes) {
      execution.nodeStates[node.id] = {
        nodeId: node.id,
        status: NodeStatus.PENDING,
        retryCount: 0
      };
    }

    // Store execution
    await this.storeExecution(execution);

    // Add to running executions
    this.runningExecutions.set(execution.id, execution);

    // Start execution
    await this.startExecution(execution);

    this.emit('workflow:started', {
      type: 'workflow:started',
      workflowId,
      executionId: execution.id,
      data: execution,
      timestamp: new Date()
    });

    return execution;
  }

  private async startExecution(execution: WorkflowExecution): Promise<void> {
    execution.status = WorkflowStatus.RUNNING;
    await this.updateExecution(execution);

    // Find ready nodes (no dependencies)
    const readyNodes = await this.findReadyNodes(execution);

    // Start ready nodes
    for (const nodeId of readyNodes) {
      await this.executeNode(execution, nodeId);
    }
  }

  private async executeNode(execution: WorkflowExecution, nodeId: string): Promise<void> {
    const workflow = await this.getWorkflow(execution.workflowId);
    if (!workflow) return;

    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const nodeState = execution.nodeStates[nodeId];
    nodeState.status = NodeStatus.RUNNING;
    nodeState.startedAt = new Date();

    await this.updateExecution(execution);

    try {
      switch (node.type) {
        case 'job':
          await this.executeJobNode(execution, node);
          break;
        case 'condition':
          await this.executeConditionNode(execution, node);
          break;
        case 'parallel':
          await this.executeParallelNode(execution, node);
          break;
        case 'wait':
          await this.executeWaitNode(execution, node);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
    } catch (error) {
      console.error('Error executing node:', error);
      await this.handleNodeFailure(execution, node, error as Error);
    }
  }

  private async executeJobNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    // Create job from node configuration
    const config = node.config as Record<string, unknown>;
    const jobConfig: PipelineJob = {
      name: `${execution.runId}-${node.name}`,
      type: (config.type as string) || 'workflow_job',
      sourceSystem: 'workflow',
      targetSystem: (config.targetSystem as string) || 'mcli',
      status: JobStatus.PENDING,
      priority: (config.priority as JobPriority) || JobPriority.NORMAL,
      config: {
        ...config,
        workflowExecutionId: execution.id,
        workflowNodeId: node.id,
        workflowRunId: execution.runId
      },
      parameters: {
        ...execution.parameters,
        ...(config.parameters as Record<string, unknown> || {})
      },
      owner: execution.triggeredBy,
      tags: [`workflow:${execution.workflowId}`, `run:${execution.runId}`]
    };

    // Submit job
    const job = await this.jobTracker.createJob(jobConfig);

    // Update node state
    const nodeState = execution.nodeStates[node.id];
    nodeState.jobId = job.id;

    await this.updateExecution(execution);

    // Job completion will be handled by event listeners
  }

  private async executeConditionNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    // Evaluate condition
    const result = this.evaluateCondition(node.condition || 'true', execution.parameters);

    const nodeState = execution.nodeStates[node.id];
    nodeState.status = result ? NodeStatus.COMPLETED : NodeStatus.SKIPPED;
    nodeState.completedAt = new Date();
    nodeState.result = { conditionResult: result };

    if (nodeState.startedAt) {
      nodeState.durationMs = nodeState.completedAt.getTime() - nodeState.startedAt.getTime();
    }

    await this.updateExecution(execution);

    // Continue with downstream nodes
    await this.checkAndContinueExecution(execution);
  }

  private async executeParallelNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    // Parallel nodes are just markers - their completion is determined by their dependencies
    const nodeState = execution.nodeStates[node.id];
    nodeState.status = NodeStatus.COMPLETED;
    nodeState.completedAt = new Date();

    if (nodeState.startedAt) {
      nodeState.durationMs = nodeState.completedAt.getTime() - nodeState.startedAt.getTime();
    }

    await this.updateExecution(execution);
    await this.checkAndContinueExecution(execution);
  }

  private async executeWaitNode(execution: WorkflowExecution, node: WorkflowNode): Promise<void> {
    const config = node.config as Record<string, unknown>;
    const waitMs = (config.waitMs as number) || 1000;

    setTimeout(async () => {
      const nodeState = execution.nodeStates[node.id];
      nodeState.status = NodeStatus.COMPLETED;
      nodeState.completedAt = new Date();

      if (nodeState.startedAt) {
        nodeState.durationMs = nodeState.completedAt.getTime() - nodeState.startedAt.getTime();
      }

      await this.updateExecution(execution);
      await this.checkAndContinueExecution(execution);
    }, waitMs);
  }

  private async handleJobCompletion(
    jobId: string,
    executionId: string,
    status: 'completed' | 'failed',
    data: unknown
  ): Promise<void> {
    // Find workflow execution by job ID
    let targetExecution: WorkflowExecution | null = null;
    let targetNodeId: string | null = null;

    for (const [_execId, execution] of this.runningExecutions) {
      for (const [nodeId, nodeState] of Object.entries(execution.nodeStates)) {
        if (nodeState.jobId === jobId) {
          targetExecution = execution;
          targetNodeId = nodeId;
          break;
        }
      }
      if (targetExecution) break;
    }

    if (!targetExecution || !targetNodeId) {
      return; // Job not part of workflow
    }

    const nodeState = targetExecution.nodeStates[targetNodeId];
    nodeState.status = status === 'completed' ? NodeStatus.COMPLETED : NodeStatus.FAILED;
    nodeState.completedAt = new Date();
    nodeState.result = data;

    if (nodeState.startedAt) {
      nodeState.durationMs = nodeState.completedAt.getTime() - nodeState.startedAt.getTime();
    }

    if (status === 'failed') {
      const errorData = data as { errorMessage?: string };
      nodeState.error = errorData.errorMessage || 'Job failed';

      // Check retry policy
      const workflow = await this.getWorkflow(targetExecution.workflowId);
      const node = workflow?.nodes.find(n => n.id === targetNodeId);

      if (node?.retryPolicy && nodeState.retryCount < node.retryPolicy.maxRetries) {
        await this.scheduleNodeRetry(targetExecution, targetNodeId, node.retryPolicy);
        return;
      }

      targetExecution.failedStages.push(targetNodeId);
      await this.handleWorkflowFailure(targetExecution, `Node ${targetNodeId} failed: ${nodeState.error}`);
    } else {
      targetExecution.completedStages.push(targetNodeId);
      await this.checkAndContinueExecution(targetExecution);
    }

    await this.updateExecution(targetExecution);
  }

  private async scheduleNodeRetry(
    execution: WorkflowExecution,
    nodeId: string,
    retryPolicy: { maxRetries: number; backoffMs: number; backoffMultiplier: number }
  ): Promise<void> {
    const nodeState = execution.nodeStates[nodeId];
    nodeState.retryCount++;

    const backoffMs = retryPolicy.backoffMs * Math.pow(retryPolicy.backoffMultiplier, nodeState.retryCount - 1);
    nodeState.nextRetryAt = new Date(Date.now() + backoffMs);
    nodeState.status = NodeStatus.WAITING;

    await this.updateExecution(execution);

    // Schedule retry
    setTimeout(async () => {
      if (execution.status === WorkflowStatus.RUNNING) {
        await this.executeNode(execution, nodeId);
      }
    }, backoffMs);
  }

  private async checkAndContinueExecution(execution: WorkflowExecution): Promise<void> {
    const workflow = await this.getWorkflow(execution.workflowId);
    if (!workflow) return;

    // Check if workflow is complete
    const allNodes = workflow.nodes.map(n => n.id);
    const completedNodes = allNodes.filter(id =>
      execution.nodeStates[id].status === NodeStatus.COMPLETED ||
      execution.nodeStates[id].status === NodeStatus.SKIPPED
    );

    if (completedNodes.length === allNodes.length) {
      await this.completeWorkflow(execution);
      return;
    }

    // Find newly ready nodes
    const readyNodes = await this.findReadyNodes(execution);

    // Start ready nodes
    for (const nodeId of readyNodes) {
      if (execution.nodeStates[nodeId].status === NodeStatus.PENDING) {
        await this.executeNode(execution, nodeId);
      }
    }
  }

  private async findReadyNodes(execution: WorkflowExecution): Promise<string[]> {
    const workflow = await this.getWorkflow(execution.workflowId);
    if (!workflow) return [];

    const readyNodes: string[] = [];

    for (const node of workflow.nodes) {
      const nodeState = execution.nodeStates[node.id];

      // Skip if not pending
      if (nodeState.status !== NodeStatus.PENDING) {
        continue;
      }

      // Check dependencies
      const dependenciesSatisfied = node.dependencies.every(depId => {
        const depState = execution.nodeStates[depId];
        return depState?.status === NodeStatus.COMPLETED || depState?.status === NodeStatus.SKIPPED;
      });

      if (dependenciesSatisfied) {
        readyNodes.push(node.id);
      }
    }

    return readyNodes;
  }

  private async completeWorkflow(execution: WorkflowExecution): Promise<void> {
    execution.status = WorkflowStatus.COMPLETED;
    execution.completedAt = new Date();
    execution.durationMs = execution.completedAt.getTime() - execution.startedAt.getTime();

    await this.updateExecution(execution);
    this.runningExecutions.delete(execution.id);

    this.emit('workflow:completed', {
      type: 'workflow:completed',
      workflowId: execution.workflowId,
      executionId: execution.id,
      data: execution,
      timestamp: new Date()
    });
  }

  private async handleWorkflowFailure(execution: WorkflowExecution, errorMessage: string): Promise<void> {
    execution.status = WorkflowStatus.FAILED;
    execution.completedAt = new Date();
    execution.durationMs = execution.completedAt.getTime() - execution.startedAt.getTime();
    execution.errorMessage = errorMessage;

    // Cancel running nodes
    for (const [_nodeId, nodeState] of Object.entries(execution.nodeStates)) {
      if (nodeState.status === NodeStatus.RUNNING || nodeState.status === NodeStatus.WAITING) {
        nodeState.status = NodeStatus.CANCELLED;

        // Cancel job if exists
        if (nodeState.jobId) {
          try {
            await this.jobTracker.updateJobStatus(nodeState.jobId, JobStatus.CANCELLED);
          } catch (error) {
            console.warn(`Failed to cancel job ${nodeState.jobId}:`, error);
          }
        }
      }
    }

    await this.updateExecution(execution);
    this.runningExecutions.delete(execution.id);

    this.emit('workflow:failed', {
      type: 'workflow:failed',
      workflowId: execution.workflowId,
      executionId: execution.id,
      data: execution,
      timestamp: new Date()
    });
  }

  async cancelWorkflow(executionId: string): Promise<void> {
    const execution = this.runningExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Workflow execution ${executionId} not found or not running`);
    }

    execution.status = WorkflowStatus.CANCELLED;
    execution.completedAt = new Date();
    execution.durationMs = execution.completedAt.getTime() - execution.startedAt.getTime();

    // Cancel all running and waiting nodes
    for (const [_nodeId, nodeState] of Object.entries(execution.nodeStates)) {
      if (nodeState.status === NodeStatus.RUNNING || nodeState.status === NodeStatus.WAITING) {
        nodeState.status = NodeStatus.CANCELLED;

        if (nodeState.jobId) {
          try {
            await this.jobTracker.updateJobStatus(nodeState.jobId, JobStatus.CANCELLED);
          } catch (error) {
            console.warn(`Failed to cancel job ${nodeState.jobId}:`, error);
          }
        }
      }
    }

    await this.updateExecution(execution);
    this.runningExecutions.delete(executionId);

    this.emit('workflow:cancelled', {
      type: 'workflow:cancelled',
      workflowId: execution.workflowId,
      executionId: execution.id,
      data: execution,
      timestamp: new Date()
    });
  }

  // Helper methods
  private validateWorkflow(definition: WorkflowDefinition): void {
    if (!definition.name || !definition.version) {
      throw new Error('Workflow name and version are required');
    }

    if (!definition.nodes || definition.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Check for cycles in dependencies
    this.detectCycles(definition.nodes);

    // Validate nodes
    for (const node of definition.nodes) {
      if (!node.id || !node.name || !node.type) {
        throw new Error('Node must have id, name, and type');
      }

      // Validate dependencies exist
      for (const depId of node.dependencies) {
        if (!definition.nodes.find(n => n.id === depId)) {
          throw new Error(`Node ${node.id} depends on non-existent node ${depId}`);
        }
      }
    }
  }

  private detectCycles(nodes: WorkflowNode[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        return true; // Found cycle
      }

      if (visited.has(nodeId)) {
        return false; // Already processed
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (hasCycle(node.id)) {
        throw new Error('Workflow contains cycles in dependencies');
      }
    }
  }

  private evaluateCondition(condition: string, parameters: Record<string, unknown>): boolean {
    try {
      // Simple condition evaluation - in production, use a safer evaluator
      const func = new Function('params', `return ${condition}`);
      return !!func(parameters);
    } catch (error) {
      console.warn('Condition evaluation failed, defaulting to false:', error);
      return false;
    }
  }

  private generateRunId(workflowName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortId = Math.random().toString(36).substr(2, 4);
    return `${workflowName}-${timestamp}-${shortId}`;
  }

  private async getRunningExecutionsCount(workflowId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM workflow_executions
      WHERE workflow_id = $1 AND status = 'running'
    `;

    const result = await this.pool.query(query, [workflowId]);
    return parseInt(result.rows[0].count);
  }

  private async storeExecution(execution: WorkflowExecution): Promise<void> {
    const query = `
      INSERT INTO workflow_executions (
        id, workflow_id, run_id, status, triggered_by, trigger_type,
        parameters, started_at, current_stage, completed_stages, failed_stages
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      execution.id,
      execution.workflowId,
      execution.runId,
      execution.status,
      execution.triggeredBy,
      execution.triggerType,
      JSON.stringify(execution.parameters),
      execution.startedAt,
      execution.currentStage,
      JSON.stringify(execution.completedStages),
      JSON.stringify(execution.failedStages)
    ];

    await this.pool.query(query, values);
  }

  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    const query = `
      UPDATE workflow_executions
      SET
        status = $2,
        completed_at = $3,
        duration_ms = $4,
        current_stage = $5,
        completed_stages = $6,
        failed_stages = $7,
        result = $8,
        error_message = $9
      WHERE id = $1
    `;

    const values = [
      execution.id,
      execution.status,
      execution.completedAt,
      execution.durationMs,
      execution.currentStage,
      JSON.stringify(execution.completedStages),
      JSON.stringify(execution.failedStages),
      execution.result ? JSON.stringify(execution.result) : null,
      execution.errorMessage
    ];

    await this.pool.query(query, values);

    // Also store node states (this would need a separate table in production)
    // For now, we'll store them in the result field or create a separate storage
  }

  // Public query methods
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    // First check running executions
    const running = this.runningExecutions.get(executionId);
    if (running) {
      return running;
    }

    // Then check database
    const query = 'SELECT * FROM workflow_executions WHERE id = $1';
    const result = await this.pool.query(query, [executionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseExecutionRow(result.rows[0]);
  }

  async listExecutions(workflowId?: string, limit: number = 50): Promise<WorkflowExecution[]> {
    let query = 'SELECT * FROM workflow_executions';
    const values: unknown[] = [];

    if (workflowId) {
      query += ' WHERE workflow_id = $1';
      values.push(workflowId);
    }

    query += ` ORDER BY started_at DESC LIMIT ${limit}`;

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.parseExecutionRow(row));
  }

  private parseExecutionRow(row: Record<string, unknown>): WorkflowExecution {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      runId: row.run_id as string,
      status: row.status as WorkflowStatus,
      triggeredBy: row.triggered_by as string,
      triggerType: row.trigger_type as 'manual' | 'schedule' | 'webhook' | 'dependency',
      parameters: (row.parameters as Record<string, unknown>) || {},
      startedAt: row.started_at as Date,
      completedAt: row.completed_at as Date | undefined,
      durationMs: row.duration_ms as number | undefined,
      currentStage: row.current_stage as string | undefined,
      completedStages: (row.completed_stages as string[]) || [],
      failedStages: (row.failed_stages as string[]) || [],
      result: row.result,
      errorMessage: row.error_message as string | undefined,
      nodeStates: {} // Would need to be loaded from separate storage
    };
  }

  private async handleNodeFailure(execution: WorkflowExecution, node: WorkflowNode, error: Error): Promise<void> {
    const nodeState = execution.nodeStates[node.id];
    nodeState.status = NodeStatus.FAILED;
    nodeState.completedAt = new Date();
    nodeState.error = error.message;

    execution.status = WorkflowStatus.FAILED;
    execution.completedAt = new Date();
    execution.errorMessage = `Node ${node.id} failed: ${error.message}`;

    await this.updateExecution(execution);
    this.runningExecutions.delete(execution.id!);

    this.emit('node:failed', {
      executionId: execution.id,
      workflowId: execution.workflowId,
      nodeId: node.id,
      error: error.message,
      timestamp: new Date()
    });

    this.emit('execution:failed', {
      executionId: execution.id,
      workflowId: execution.workflowId,
      error: error.message,
      timestamp: new Date()
    });
  }

  async listWorkflows(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<WorkflowDefinition[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramCount = 1;

    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT * FROM workflow_definitions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows.map(this.parseWorkflowRow.bind(this));
  }

  async getWorkflowExecutions(workflowId: string, filters: {
    limit?: number;
    offset?: number;
  } = {}): Promise<WorkflowExecution[]> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const query = `
      SELECT * FROM workflow_executions
      WHERE workflow_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [workflowId, limit, offset]);
    return result.rows.map(this.parseExecutionRow.bind(this));
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.runningExecutions.get(executionId);
    if (execution) {
      execution.status = WorkflowStatus.CANCELLED;
      execution.completedAt = new Date();

      // Cancel any running jobs
      for (const nodeId of Object.keys(execution.nodeStates)) {
        const nodeState = execution.nodeStates[nodeId];
        if (nodeState.status === NodeStatus.RUNNING && nodeState.jobId) {
          try {
            await this.jobTracker.updateJobStatus(nodeState.jobId, JobStatus.CANCELLED);
          } catch (error) {
            console.warn(`Failed to cancel job ${nodeState.jobId}:`, error);
          }
        }
      }

      this.runningExecutions.delete(executionId);
      await this.updateExecution(execution);

      this.emit('execution:cancelled', {
        executionId: execution.id,
        workflowId: execution.workflowId,
        timestamp: new Date()
      });
    }
  }

  async validateWorkflowById(workflowId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        return {
          isValid: false,
          errors: ['Workflow not found'],
          warnings: []
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate basic structure
      if (!workflow.name) {
        errors.push('Workflow name is required');
      }

      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }

      if (workflow.nodes) {
        // Check for duplicate node IDs
        const nodeIds = workflow.nodes.map(n => n.id);
        const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
          errors.push(`Duplicate node IDs found: ${duplicates.join(', ')}`);
        }

        // Check for invalid dependencies
        for (const node of workflow.nodes) {
          if (node.dependencies) {
            for (const depId of node.dependencies) {
              if (!nodeIds.includes(depId)) {
                errors.push(`Node ${node.id} depends on non-existent node ${depId}`);
              }
            }
          }
        }

        // Check for cycles
        try {
          this.detectCycles(workflow.nodes);
        } catch (error) {
          errors.push((error as Error).message);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  async getWorkflowDependencies(workflowId: string): Promise<{
    nodes: Array<{
      id: string;
      dependencies: string[];
      dependents: string[];
    }>;
    graph: Record<string, string[]>;
  }> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const nodes = workflow.nodes.map(node => {
      const dependencies = node.dependencies || [];
      const dependents = workflow.nodes
        .filter(n => n.dependencies?.includes(node.id))
        .map(n => n.id);

      return {
        id: node.id,
        dependencies,
        dependents
      };
    });

    const graph: Record<string, string[]> = {};
    workflow.nodes.forEach(node => {
      graph[node.id] = node.dependencies || [];
    });

    return { nodes, graph };
  }

  async start(): Promise<void> {
    // Start periodic execution polling
    this.pollInterval = setInterval(async () => {
      try {
        await this.checkScheduledExecutions();
        await this.cleanupCompletedExecutions();
      } catch (error) {
        console.error('Error in workflow engine polling:', error);
      }
    }, 10000); // Poll every 10 seconds

    console.log('WorkflowEngine started');
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Cancel all running executions
    const runningExecutions = Array.from(this.runningExecutions.keys());
    await Promise.all(
      runningExecutions.map(id => this.cancelExecution(id))
    );

    console.log('WorkflowEngine stopped');
  }

  private async checkScheduledExecutions(): Promise<void> {
    // Check for workflows scheduled to run
    const query = `
      SELECT * FROM workflow_executions
      WHERE status = 'scheduled' AND started_at <= NOW()
      ORDER BY started_at ASC
      LIMIT 10
    `;

    const result = await this.pool.query(query);
    for (const row of result.rows) {
      const execution = this.parseExecutionRow(row);
      if (!this.runningExecutions.has(execution.id!)) {
        await this.checkAndContinueExecution(execution);
      }
    }
  }

  private async cleanupCompletedExecutions(): Promise<void> {
    // Remove completed executions from memory after 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [id, execution] of this.runningExecutions) {
      if ([WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.CANCELLED].includes(execution.status as WorkflowStatus) &&
          execution.completedAt && execution.completedAt < oneHourAgo) {
        this.runningExecutions.delete(id);
      }
    }
  }

  private parseWorkflowRow(row: Record<string, unknown>): WorkflowDefinition {
    return {
      id: row.id as string | undefined,
      name: row.name as string,
      description: row.description as string | undefined,
      version: row.version as string,
      nodes: JSON.parse((row.nodes as string) || '[]') as WorkflowNode[],
      parameters: JSON.parse((row.parameters as string) || '{}') as Record<string, unknown>,
      schedule: row.schedule ? JSON.parse(row.schedule as string) as { cron: string; timezone?: string; enabled: boolean } : undefined,
      timeout: row.timeout as number | undefined,
      maxConcurrentRuns: row.max_concurrent_runs as number | undefined,
      tags: JSON.parse((row.tags as string) || '[]') as string[],
      owner: row.owner as string | undefined,
      team: row.team as string | undefined
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Cancel all running executions
    for (const execution of this.runningExecutions.values()) {
      await this.cancelWorkflow(execution.id);
    }

    this.removeAllListeners();
  }
}