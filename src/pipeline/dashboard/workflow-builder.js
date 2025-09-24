// Enhanced Workflow Builder with Graphical Interface
class WorkflowBuilder {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
        this.canvas = null;
        this.ctx = null;
        this.selectedNode = null;
        this.draggedNode = null;
        this.offset = { x: 0, y: 0 };
        this.scale = 1.0;
        this.connecting = false;
        this.connectionStart = null;

        this.nodeTypes = {
            job: {
                color: '#007bff',
                icon: '⚙️',
                defaultConfig: { type: 'data_processing', targetSystem: 'mcli' }
            },
            condition: {
                color: '#ffc107',
                icon: '❓',
                defaultConfig: { condition: 'true' }
            },
            parallel: {
                color: '#28a745',
                icon: '⚡',
                defaultConfig: {}
            },
            wait: {
                color: '#6c757d',
                icon: '⏱️',
                defaultConfig: { waitMs: 5000 }
            }
        };

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupNodePalette();
        this.render();
    }

    setupCanvas() {
        const canvasContainer = document.getElementById('workflowCanvas');
        if (!canvasContainer) return;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.border = '1px solid #ddd';
        this.canvas.style.borderRadius = '8px';
        this.canvas.style.cursor = 'grab';

        this.ctx = this.canvas.getContext('2d');
        canvasContainer.appendChild(this.canvas);
    }

    setupEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));

        // Prevent default context menu
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    setupNodePalette() {
        const palette = document.getElementById('nodePalette');
        if (!palette) return;

        Object.entries(this.nodeTypes).forEach(([type, config]) => {
            const nodeElement = document.createElement('div');
            nodeElement.className = 'palette-node';
            nodeElement.draggable = true;
            nodeElement.innerHTML = `
                <div class="node-icon" style="background-color: ${config.color}">
                    ${config.icon}
                </div>
                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            `;
            nodeElement.dataset.nodeType = type;

            nodeElement.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', type);
            });

            palette.appendChild(nodeElement);
        });

        // Canvas drop handling
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('text/plain');
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.scale;
            const y = (e.clientY - rect.top) / this.scale;
            this.addNode(nodeType, x, y);
        });
    }

    addNode(type, x, y) {
        const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const node = {
            id: nodeId,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
            type: type,
            x: x,
            y: y,
            width: 120,
            height: 60,
            dependencies: [],
            config: { ...this.nodeTypes[type].defaultConfig }
        };

        this.nodes.set(nodeId, node);
        this.render();
        return node;
    }

    deleteNode(nodeId) {
        this.nodes.delete(nodeId);
        // Remove connections involving this node
        this.connections = this.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );
        this.render();
    }

    addConnection(fromId, toId) {
        // Prevent duplicate connections and self-connections
        if (fromId === toId) return;

        const existingConnection = this.connections.find(
            conn => conn.from === fromId && conn.to === toId
        );
        if (existingConnection) return;

        // Check for cycles
        if (this.wouldCreateCycle(fromId, toId)) {
            alert('Cannot create connection: would create a cycle');
            return;
        }

        this.connections.push({ from: fromId, to: toId });

        // Update dependencies
        const toNode = this.nodes.get(toId);
        if (toNode && !toNode.dependencies.includes(fromId)) {
            toNode.dependencies.push(fromId);
        }

        this.render();
    }

    wouldCreateCycle(fromId, toId) {
        // Simple cycle detection using DFS
        const visited = new Set();

        const dfs = (nodeId) => {
            if (nodeId === fromId) return true;
            if (visited.has(nodeId)) return false;

            visited.add(nodeId);

            const connections = this.connections.filter(conn => conn.from === nodeId);
            for (const conn of connections) {
                if (dfs(conn.to)) return true;
            }

            return false;
        };

        return dfs(toId);
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        const clickedNode = this.getNodeAt(x, y);

        if (e.button === 0) { // Left click
            if (e.ctrlKey || e.metaKey) {
                // Connection mode
                if (clickedNode) {
                    this.connecting = true;
                    this.connectionStart = clickedNode;
                    this.canvas.style.cursor = 'crosshair';
                }
            } else {
                // Selection/drag mode
                this.selectedNode = clickedNode;
                if (clickedNode) {
                    this.draggedNode = clickedNode;
                    this.offset = {
                        x: x - clickedNode.x,
                        y: y - clickedNode.y
                    };
                    this.canvas.style.cursor = 'grabbing';
                }
            }
        }

        this.render();
    }

    handleMouseMove(e) {
        if (!this.draggedNode && !this.connecting) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        if (this.draggedNode) {
            this.draggedNode.x = x - this.offset.x;
            this.draggedNode.y = y - this.offset.y;
            this.render();
        }

        if (this.connecting) {
            this.render();
            // Draw temporary connection line
            const startNode = this.connectionStart;
            this.ctx.strokeStyle = '#007bff';
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(
                startNode.x + startNode.width / 2,
                startNode.y + startNode.height / 2
            );
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    handleMouseUp(e) {
        if (this.connecting) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.scale;
            const y = (e.clientY - rect.top) / this.scale;

            const targetNode = this.getNodeAt(x, y);
            if (targetNode && targetNode !== this.connectionStart) {
                this.addConnection(this.connectionStart.id, targetNode.id);
            }

            this.connecting = false;
            this.connectionStart = null;
            this.canvas.style.cursor = 'grab';
        }

        this.draggedNode = null;
        this.canvas.style.cursor = 'grab';
        this.render();
    }

    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            this.showNodeEditor(clickedNode);
        }
    }

    handleRightClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.scale;
        const y = (e.clientY - rect.top) / this.scale;

        const clickedNode = this.getNodeAt(x, y);
        if (clickedNode) {
            this.showContextMenu(e, clickedNode);
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Delete' && this.selectedNode) {
            this.deleteNode(this.selectedNode.id);
            this.selectedNode = null;
        }
    }

    getNodeAt(x, y) {
        for (const node of this.nodes.values()) {
            if (x >= node.x && x <= node.x + node.width &&
                y >= node.y && y <= node.y + node.height) {
                return node;
            }
        }
        return null;
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw connections
        this.drawConnections();

        // Draw nodes
        this.drawNodes();

        // Draw selection
        if (this.selectedNode) {
            this.drawSelection(this.selectedNode);
        }
    }

    drawGrid() {
        const gridSize = 20;
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawNodes() {
        for (const node of this.nodes.values()) {
            const config = this.nodeTypes[node.type];

            // Node background
            this.ctx.fillStyle = '#ffffff';
            this.ctx.strokeStyle = config.color;
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(node.x, node.y, node.width, node.height);
            this.ctx.strokeRect(node.x, node.y, node.width, node.height);

            // Node icon
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = config.color;
            this.ctx.fillText(
                config.icon,
                node.x + 20,
                node.y + 35
            );

            // Node name
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#333';
            this.ctx.fillText(
                node.name.length > 12 ? node.name.substr(0, 12) + '...' : node.name,
                node.x + node.width / 2 + 10,
                node.y + 20
            );

            // Node type
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(
                node.type,
                node.x + node.width / 2 + 10,
                node.y + 45
            );
        }
    }

    drawConnections() {
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 2;

        for (const connection of this.connections) {
            const fromNode = this.nodes.get(connection.from);
            const toNode = this.nodes.get(connection.to);

            if (!fromNode || !toNode) continue;

            const fromX = fromNode.x + fromNode.width;
            const fromY = fromNode.y + fromNode.height / 2;
            const toX = toNode.x;
            const toY = toNode.y + toNode.height / 2;

            // Draw curved connection
            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);

            const controlPoint1X = fromX + 50;
            const controlPoint1Y = fromY;
            const controlPoint2X = toX - 50;
            const controlPoint2Y = toY;

            this.ctx.bezierCurveTo(
                controlPoint1X, controlPoint1Y,
                controlPoint2X, controlPoint2Y,
                toX, toY
            );
            this.ctx.stroke();

            // Draw arrowhead
            this.drawArrowhead(toX, toY, Math.atan2(toY - controlPoint2Y, toX - controlPoint2X));
        }
    }

    drawArrowhead(x, y, angle) {
        const size = 10;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-size, -size/2);
        this.ctx.lineTo(-size, size/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    drawSelection(node) {
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            node.x - 2,
            node.y - 2,
            node.width + 4,
            node.height + 4
        );
        this.ctx.setLineDash([]);
    }

    showNodeEditor(node) {
        // Populate and show the node editor modal
        const modal = document.getElementById('nodeEditorModal');
        const form = document.getElementById('nodeEditorForm');

        document.getElementById('nodeEditorTitle').textContent = `Edit ${node.type} Node`;
        document.getElementById('editNodeName').value = node.name;
        document.getElementById('editNodeType').value = node.type;
        document.getElementById('editNodeConfig').value = JSON.stringify(node.config, null, 2);

        // Store reference to editing node
        form.dataset.editingNodeId = node.id;

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (node) {
            Object.assign(node, updates);
            this.render();
        }
    }

    exportWorkflow() {
        const workflow = {
            name: document.getElementById('workflowBuilderName').value || 'Untitled Workflow',
            description: document.getElementById('workflowBuilderDescription').value || '',
            version: '1.0.0',
            nodes: Array.from(this.nodes.values()).map(node => ({
                id: node.id,
                name: node.name,
                type: node.type,
                dependencies: node.dependencies,
                config: node.config,
                retryPolicy: {
                    maxRetries: 3,
                    backoffMs: 1000,
                    backoffMultiplier: 2
                }
            })),
            parameters: {},
            maxConcurrentRuns: 1
        };

        return workflow;
    }

    importWorkflow(workflowData) {
        this.nodes.clear();
        this.connections = [];

        if (workflowData.nodes) {
            // Position nodes in a grid layout
            const cols = Math.ceil(Math.sqrt(workflowData.nodes.length));

            workflowData.nodes.forEach((nodeData, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;

                const node = {
                    ...nodeData,
                    x: 50 + col * 150,
                    y: 50 + row * 100,
                    width: 120,
                    height: 60
                };

                this.nodes.set(node.id, node);

                // Create connections based on dependencies
                if (node.dependencies) {
                    node.dependencies.forEach(depId => {
                        this.connections.push({ from: depId, to: node.id });
                    });
                }
            });
        }

        this.render();
    }

    clear() {
        this.nodes.clear();
        this.connections = [];
        this.selectedNode = null;
        this.render();
    }
}

// Initialize builder when DOM is loaded
let workflowBuilder = null;

function initializeWorkflowBuilder() {
    workflowBuilder = new WorkflowBuilder();
}

function saveNodeEdit() {
    const form = document.getElementById('nodeEditorForm');
    const nodeId = form.dataset.editingNodeId;

    if (!nodeId || !workflowBuilder) return;

    try {
        const updates = {
            name: document.getElementById('editNodeName').value,
            type: document.getElementById('editNodeType').value,
            config: JSON.parse(document.getElementById('editNodeConfig').value)
        };

        workflowBuilder.updateNode(nodeId, updates);

        const modal = bootstrap.Modal.getInstance(document.getElementById('nodeEditorModal'));
        modal.hide();

        showToast('Node updated successfully', 'success');
    } catch (error) {
        showToast('Invalid configuration JSON: ' + error.message, 'danger');
    }
}

function exportBuilderWorkflow() {
    if (!workflowBuilder) return;

    const workflow = workflowBuilder.exportWorkflow();

    // Update the main modal with the generated workflow
    document.getElementById('modalWorkflowDefinition').value = JSON.stringify({
        nodes: workflow.nodes,
        parameters: workflow.parameters,
        maxConcurrentRuns: workflow.maxConcurrentRuns
    }, null, 2);

    showToast('Workflow exported to form', 'success');
}

function clearBuilder() {
    if (!workflowBuilder) return;

    if (confirm('Are you sure you want to clear the workflow builder?')) {
        workflowBuilder.clear();
        showToast('Workflow builder cleared', 'info');
    }
}

function showToast(message, type) {
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
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Export for use in HTML
window.initializeWorkflowBuilder = initializeWorkflowBuilder;
window.saveNodeEdit = saveNodeEdit;
window.exportBuilderWorkflow = exportBuilderWorkflow;
window.clearBuilder = clearBuilder;