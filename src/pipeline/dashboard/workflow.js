// Workflow Management Dashboard
class WorkflowDashboard {
    constructor() {
        this.socket = null;
        this.currentWorkflow = null;
        this.workflows = new Map();
        this.executions = new Map();

        this.init();
    }

    async init() {
        // Initialize WebSocket connection
        this.initWebSocket();

        // Load initial data
        await this.loadWorkflows();

        // Set up event listeners
        this.setupEventListeners();

        // Start periodic updates
        this.startPeriodicUpdates();
    }

    initWebSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to pipeline service');
        });

        this.socket.on('workflow:created', (event) => {
            this.handleWorkflowCreated(event);
        });

        this.socket.on('workflow:execution:started', (event) => {
            this.handleExecutionStarted(event);
        });

        this.socket.on('workflow:execution:completed', (event) => {
            this.handleExecutionCompleted(event);
        });

        this.socket.on('workflow:execution:failed', (event) => {
            this.handleExecutionFailed(event);
        });

        this.socket.on('node:started', (event) => {
            this.handleNodeStarted(event);
        });

        this.socket.on('node:completed', (event) => {
            this.handleNodeCompleted(event);
        });

        this.socket.on('node:failed', (event) => {
            this.handleNodeFailed(event);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from pipeline service');
        });
    }

    async loadWorkflows() {
        try {
            const response = await fetch('/api/pipeline/workflows');
            if (response.ok) {
                const workflows = await response.json();
                workflows.forEach(workflow => {
                    this.workflows.set(workflow.id, workflow);
                });
                this.renderWorkflowList();
                this.updateStats();
            } else {
                console.warn('Failed to load workflows - running in demo mode');
                this.renderEmptyWorkflowList();
            }
        } catch (error) {
            console.error('Error loading workflows:', error);
            this.renderEmptyWorkflowList();
        }
    }

    renderWorkflowList() {
        const workflowList = document.getElementById('workflowList');
        workflowList.innerHTML = '';

        if (this.workflows.size === 0) {
            workflowList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>No workflows found</p>
                    <button class="btn btn-primary btn-sm" onclick="dashboard.showCreateWorkflowModal()">
                        Create First Workflow
                    </button>
                </div>
            `;
            return;
        }

        this.workflows.forEach(workflow => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action workflow-item';
            item.style.cursor = 'pointer';
            item.onclick = () => this.selectWorkflow(workflow.id);

            const statusClass = this.getStatusClass(workflow.status || 'active');

            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${workflow.name}</h6>
                        <p class="mb-1 text-muted small">${workflow.description || 'No description'}</p>
                        <small class="text-muted">v${workflow.version} • ${workflow.nodes?.length || 0} nodes</small>
                    </div>
                    <span class="badge ${statusClass} status-badge">${workflow.status || 'active'}</span>
                </div>
            `;

            workflowList.appendChild(item);
        });
    }

    renderEmptyWorkflowList() {
        const workflowList = document.getElementById('workflowList');
        workflowList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-database fa-2x mb-2"></i>
                <p>Demo Mode</p>
                <small>Database not connected</small>
            </div>
        `;
    }

    async selectWorkflow(workflowId) {
        try {
            // Remove active class from all workflow items
            document.querySelectorAll('.workflow-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add active class to selected item
            const selectedItem = Array.from(document.querySelectorAll('.workflow-item'))
                .find(item => item.onclick.toString().includes(workflowId));
            if (selectedItem) {
                selectedItem.classList.add('active');
            }

            // Load workflow details
            const workflow = this.workflows.get(workflowId) || await this.fetchWorkflow(workflowId);
            this.currentWorkflow = workflow;

            if (workflow) {
                // Subscribe to workflow updates
                this.socket.emit('subscribe:workflow', workflowId);

                // Load workflow executions
                await this.loadWorkflowExecutions(workflowId);

                // Render workflow details
                this.renderWorkflowDetail(workflow);

                // Show detail view
                document.getElementById('emptyState').style.display = 'none';
                document.getElementById('workflowDetail').style.display = 'block';
            }
        } catch (error) {
            console.error('Error selecting workflow:', error);
            this.showError('Failed to load workflow details');
        }
    }

    async fetchWorkflow(workflowId) {
        const response = await fetch(`/api/pipeline/workflows/${workflowId}`);
        if (response.ok) {
            const workflow = await response.json();
            this.workflows.set(workflowId, workflow);
            return workflow;
        }
        return null;
    }

    async loadWorkflowExecutions(workflowId) {
        try {
            const response = await fetch(`/api/pipeline/workflows/${workflowId}/executions?limit=10`);
            if (response.ok) {
                const executions = await response.json();
                this.renderExecutionTimeline(executions);
            }
        } catch (error) {
            console.error('Error loading executions:', error);
        }
    }

    renderWorkflowDetail(workflow) {
        // Update header
        document.getElementById('workflowName').textContent = workflow.name;
        document.getElementById('workflowDescription').textContent = workflow.description || 'No description';

        // Update info panel
        document.getElementById('workflowVersion').textContent = workflow.version;
        document.getElementById('workflowOwner').textContent = workflow.owner || 'Unknown';
        document.getElementById('workflowTeam').textContent = workflow.team || 'None';
        document.getElementById('workflowNodeCount').textContent = workflow.nodes?.length || 0;

        const statusElement = document.getElementById('workflowStatus');
        const status = workflow.status || 'active';
        statusElement.textContent = status;
        statusElement.className = `badge ${this.getStatusClass(status)}`;

        // Render workflow diagram
        this.renderWorkflowDiagram(workflow);
    }

    renderWorkflowDiagram(workflow) {
        const diagramContainer = document.getElementById('workflowDiagram');
        diagramContainer.innerHTML = '';

        if (!workflow.nodes || workflow.nodes.length === 0) {
            diagramContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-project-diagram fa-2x mb-2"></i>
                    <p>No nodes defined in this workflow</p>
                </div>
            `;
            return;
        }

        // Simple grid layout for nodes
        const gridCols = Math.ceil(Math.sqrt(workflow.nodes.length));
        const gridRows = Math.ceil(workflow.nodes.length / gridCols);

        const containerWidth = diagramContainer.offsetWidth - 40;
        const containerHeight = diagramContainer.offsetHeight - 40;

        const nodeWidth = Math.max(80, (containerWidth / gridCols) - 20);
        const nodeHeight = 40;

        workflow.nodes.forEach((node, index) => {
            const row = Math.floor(index / gridCols);
            const col = index % gridCols;

            const x = col * (containerWidth / gridCols) + 20;
            const y = row * (containerHeight / gridRows) + 20;

            const nodeElement = document.createElement('div');
            nodeElement.className = `node ${node.type}`;
            nodeElement.id = `node-${node.id}`;
            nodeElement.style.left = `${x}px`;
            nodeElement.style.top = `${y}px`;
            nodeElement.style.width = `${nodeWidth}px`;
            nodeElement.style.height = `${nodeHeight}px`;

            nodeElement.innerHTML = `
                <div class="fw-bold">${node.name}</div>
                <small class="text-muted">${node.type}</small>
            `;

            nodeElement.onclick = () => this.showNodeDetails(node);
            diagramContainer.appendChild(nodeElement);
        });

        // Draw connections (simplified)
        this.drawConnections(workflow.nodes, diagramContainer);
    }

    drawConnections(nodes, container) {
        nodes.forEach(node => {
            if (node.dependencies && node.dependencies.length > 0) {
                node.dependencies.forEach(depId => {
                    const sourceElement = container.querySelector(`#node-${depId}`);
                    const targetElement = container.querySelector(`#node-${node.id}`);

                    if (sourceElement && targetElement) {
                        this.drawConnection(sourceElement, targetElement, container);
                    }
                });
            }
        });
    }

    drawConnection(source, target, container) {
        const sourceRect = source.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const sourceX = sourceRect.right - containerRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const targetX = targetRect.left - containerRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - containerRect.top;

        const connection = document.createElement('div');
        connection.className = 'connection';

        const length = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));
        const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * 180 / Math.PI;

        connection.style.width = `${length}px`;
        connection.style.left = `${sourceX}px`;
        connection.style.top = `${sourceY}px`;
        connection.style.transform = `rotate(${angle}deg)`;
        connection.style.transformOrigin = '0 50%';

        container.appendChild(connection);
    }

    renderExecutionTimeline(executions) {
        const timeline = document.getElementById('recentExecutions');
        timeline.innerHTML = '';

        if (!executions || executions.length === 0) {
            timeline.innerHTML = `
                <div class="text-center text-muted py-3">
                    <p>No recent executions</p>
                </div>
            `;
            return;
        }

        executions.forEach(execution => {
            const item = document.createElement('div');
            item.className = `timeline-item ${execution.status}`;

            const duration = execution.durationMs ?
                `${Math.round(execution.durationMs / 1000)}s` :
                'Running';

            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${execution.runId}</strong>
                        <br>
                        <small class="text-muted">${execution.triggeredBy}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${this.getStatusClass(execution.status)}">${execution.status}</span>
                        <br>
                        <small class="text-muted">${duration}</small>
                    </div>
                </div>
                <small class="text-muted">
                    ${new Date(execution.startedAt).toLocaleString()}
                </small>
            `;

            item.onclick = () => this.showExecutionDetails(execution);
            item.style.cursor = 'pointer';
            timeline.appendChild(item);
        });
    }

    showCreateWorkflowModal() {
        const modal = new bootstrap.Modal(document.getElementById('workflowModal'));
        document.getElementById('workflowForm').reset();
        document.querySelector('.modal-title').textContent = 'Create Workflow';
        modal.show();
    }

    async saveWorkflow() {
        try {
            const formData = {
                name: document.getElementById('modalWorkflowName').value,
                version: document.getElementById('modalWorkflowVersion').value,
                description: document.getElementById('modalWorkflowDescription').value,
                owner: document.getElementById('modalWorkflowOwner').value,
                team: document.getElementById('modalWorkflowTeam').value,
                tags: document.getElementById('modalWorkflowTags').value.split(',').map(t => t.trim()).filter(t => t),
                ...JSON.parse(document.getElementById('modalWorkflowDefinition').value || '{}')
            };

            const response = await fetch('/api/pipeline/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const workflow = await response.json();
                this.workflows.set(workflow.id, workflow);
                this.renderWorkflowList();
                this.updateStats();

                const modal = bootstrap.Modal.getInstance(document.getElementById('workflowModal'));
                modal.hide();

                this.showSuccess('Workflow created successfully');
            } else {
                throw new Error('Failed to create workflow');
            }
        } catch (error) {
            console.error('Error saving workflow:', error);
            this.showError('Failed to save workflow: ' + error.message);
        }
    }

    executeWorkflow() {
        if (!this.currentWorkflow) return;

        const modal = new bootstrap.Modal(document.getElementById('executeModal'));
        document.getElementById('executeTriggeredBy').value = 'manual';
        document.getElementById('executeParameters').value = '{}';
        modal.show();
    }

    async confirmExecuteWorkflow() {
        try {
            const triggeredBy = document.getElementById('executeTriggeredBy').value;
            const parameters = JSON.parse(document.getElementById('executeParameters').value || '{}');

            const response = await fetch(`/api/pipeline/workflows/${this.currentWorkflow.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggeredBy, parameters, triggerType: 'manual' })
            });

            if (response.ok) {
                const execution = await response.json();
                this.showSuccess(`Workflow execution started: ${execution.runId}`);

                const modal = bootstrap.Modal.getInstance(document.getElementById('executeModal'));
                modal.hide();

                // Refresh executions
                await this.loadWorkflowExecutions(this.currentWorkflow.id);
            } else {
                throw new Error('Failed to execute workflow');
            }
        } catch (error) {
            console.error('Error executing workflow:', error);
            this.showError('Failed to execute workflow: ' + error.message);
        }
    }

    async validateWorkflow() {
        if (!this.currentWorkflow) return;

        try {
            const response = await fetch(`/api/pipeline/workflows/${this.currentWorkflow.id}/validate`, {
                method: 'POST'
            });

            if (response.ok) {
                const validation = await response.json();
                if (validation.isValid) {
                    this.showSuccess('Workflow validation passed');
                } else {
                    this.showError('Workflow validation failed:\\n' + validation.errors.join('\\n'));
                }
            } else {
                throw new Error('Validation request failed');
            }
        } catch (error) {
            console.error('Error validating workflow:', error);
            this.showError('Failed to validate workflow: ' + error.message);
        }
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('workflowSearch').addEventListener('input', (e) => {
            this.filterWorkflows(e.target.value);
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterWorkflows(null, e.target.value);
        });
    }

    filterWorkflows(search, status) {
        const items = document.querySelectorAll('.workflow-item');
        items.forEach(item => {
            const name = item.querySelector('h6').textContent.toLowerCase();
            const itemStatus = item.querySelector('.badge').textContent.toLowerCase();

            const matchesSearch = !search || name.includes(search.toLowerCase());
            const matchesStatus = !status || itemStatus === status;

            item.style.display = (matchesSearch && matchesStatus) ? 'block' : 'none';
        });
    }

    updateStats() {
        document.getElementById('totalWorkflows').textContent = this.workflows.size;

        // Calculate running workflows (would need execution data)
        document.getElementById('runningWorkflows').textContent = '0';
        document.getElementById('successRate').textContent = '0%';
    }

    startPeriodicUpdates() {
        // Refresh workflow list every 30 seconds
        setInterval(() => {
            this.loadWorkflows();
        }, 30000);
    }

    // Event handlers for WebSocket events
    handleWorkflowCreated(event) {
        console.log('Workflow created:', event);
        this.loadWorkflows();
    }

    handleExecutionStarted(event) {
        console.log('Execution started:', event);
        if (this.currentWorkflow && event.workflowId === this.currentWorkflow.id) {
            this.loadWorkflowExecutions(this.currentWorkflow.id);
        }
    }

    handleExecutionCompleted(event) {
        console.log('Execution completed:', event);
        if (this.currentWorkflow && event.workflowId === this.currentWorkflow.id) {
            this.loadWorkflowExecutions(this.currentWorkflow.id);
        }
    }

    handleExecutionFailed(event) {
        console.log('Execution failed:', event);
        if (this.currentWorkflow && event.workflowId === this.currentWorkflow.id) {
            this.loadWorkflowExecutions(this.currentWorkflow.id);
        }
    }

    handleNodeStarted(event) {
        const nodeElement = document.getElementById(`node-${event.nodeId}`);
        if (nodeElement) {
            nodeElement.classList.add('running');
        }
    }

    handleNodeCompleted(event) {
        const nodeElement = document.getElementById(`node-${event.nodeId}`);
        if (nodeElement) {
            nodeElement.classList.remove('running');
            nodeElement.classList.add('completed');
        }
    }

    handleNodeFailed(event) {
        const nodeElement = document.getElementById(`node-${event.nodeId}`);
        if (nodeElement) {
            nodeElement.classList.remove('running');
            nodeElement.classList.add('failed');
        }
    }

    // Utility methods
    getStatusClass(status) {
        const statusMap = {
            'active': 'bg-success',
            'inactive': 'bg-secondary',
            'draft': 'bg-warning text-dark',
            'running': 'bg-info',
            'completed': 'bg-success',
            'failed': 'bg-danger',
            'cancelled': 'bg-secondary',
            'success': 'bg-success',
            'failure': 'bg-danger'
        };
        return statusMap[status] || 'bg-secondary';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        toast.style.top = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showNodeDetails(node) {
        const message = `
            Node: ${node.name}
            Type: ${node.type}
            Dependencies: ${node.dependencies?.join(', ') || 'None'}
            Config: ${JSON.stringify(node.config, null, 2)}
        `;
        alert(message);
    }

    showExecutionDetails(execution) {
        const message = `
            Execution: ${execution.runId}
            Status: ${execution.status}
            Started: ${new Date(execution.startedAt).toLocaleString()}
            Duration: ${execution.durationMs ? Math.round(execution.durationMs / 1000) + 's' : 'N/A'}
            Triggered by: ${execution.triggeredBy}
        `;
        alert(message);
    }

    refreshDiagram() {
        if (this.currentWorkflow) {
            this.renderWorkflowDiagram(this.currentWorkflow);
        }
    }

    exportDiagram() {
        // Simple export functionality
        const data = {
            workflow: this.currentWorkflow,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflow-${this.currentWorkflow.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    editWorkflow() {
        if (!this.currentWorkflow) return;

        // Populate modal with current workflow data
        document.getElementById('modalWorkflowName').value = this.currentWorkflow.name;
        document.getElementById('modalWorkflowVersion').value = this.currentWorkflow.version;
        document.getElementById('modalWorkflowDescription').value = this.currentWorkflow.description || '';
        document.getElementById('modalWorkflowOwner').value = this.currentWorkflow.owner || '';
        document.getElementById('modalWorkflowTeam').value = this.currentWorkflow.team || '';
        document.getElementById('modalWorkflowTags').value = (this.currentWorkflow.tags || []).join(', ');

        const definition = {
            nodes: this.currentWorkflow.nodes,
            parameters: this.currentWorkflow.parameters,
            schedule: this.currentWorkflow.schedule,
            timeout: this.currentWorkflow.timeout,
            maxConcurrentRuns: this.currentWorkflow.maxConcurrentRuns
        };
        document.getElementById('modalWorkflowDefinition').value = JSON.stringify(definition, null, 2);

        document.querySelector('.modal-title').textContent = 'Edit Workflow';

        const modal = new bootstrap.Modal(document.getElementById('workflowModal'));
        modal.show();
    }

    showGraphicalBuilder() {
        document.getElementById('graphicalBuilder').style.display = 'block';
        document.getElementById('jsonEditor').style.display = 'none';

        // Initialize workflow builder if not already done
        if (!window.workflowBuilder) {
            setTimeout(() => {
                window.initializeWorkflowBuilder();

                // Pre-populate with form data if available
                const workflowName = document.getElementById('modalWorkflowName').value;
                const workflowDesc = document.getElementById('modalWorkflowDescription').value;

                if (workflowName) {
                    document.getElementById('workflowBuilderName').value = workflowName;
                }
                if (workflowDesc) {
                    document.getElementById('workflowBuilderDescription').value = workflowDesc;
                }

                // Import existing workflow if editing
                const existingDefinition = document.getElementById('modalWorkflowDefinition').value;
                if (existingDefinition.trim()) {
                    try {
                        const workflowData = JSON.parse(existingDefinition);
                        if (workflowData.nodes && window.workflowBuilder) {
                            window.workflowBuilder.importWorkflow(workflowData);
                        }
                    } catch (e) {
                        console.warn('Could not import existing workflow definition:', e);
                    }
                }
            }, 100);
        }
    }

    showJSONEditor() {
        document.getElementById('graphicalBuilder').style.display = 'none';
        document.getElementById('jsonEditor').style.display = 'block';
    }
}

// Global functions for HTML onclick handlers
let dashboard;

function showCreateWorkflowModal() {
    dashboard.showCreateWorkflowModal();
}

function saveWorkflow() {
    dashboard.saveWorkflow();
}

function executeWorkflow() {
    dashboard.executeWorkflow();
}

function confirmExecuteWorkflow() {
    dashboard.confirmExecuteWorkflow();
}

function validateWorkflow() {
    dashboard.validateWorkflow();
}

function editWorkflow() {
    dashboard.editWorkflow();
}

function refreshDiagram() {
    dashboard.refreshDiagram();
}

function exportDiagram() {
    dashboard.exportDiagram();
}

function showGraphicalBuilder() {
    dashboard.showGraphicalBuilder();
}

function showJSONEditor() {
    dashboard.showJSONEditor();
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new WorkflowDashboard();
});