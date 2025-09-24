-- Data Pipeline Management Schema
-- For tracking jobs, workflows, and data lineage between LSH and MCLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Job status enum
CREATE TYPE job_status AS ENUM (
    'pending',
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled',
    'retrying'
);

-- Job priority enum
CREATE TYPE job_priority AS ENUM (
    'low',
    'normal',
    'high',
    'critical'
);

-- Pipeline jobs table
CREATE TABLE pipeline_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    source_system VARCHAR(50) NOT NULL DEFAULT 'lsh',
    target_system VARCHAR(50) NOT NULL DEFAULT 'mcli',
    status job_status NOT NULL DEFAULT 'pending',
    priority job_priority NOT NULL DEFAULT 'normal',

    -- Job configuration
    config JSONB NOT NULL DEFAULT '{}',
    parameters JSONB DEFAULT '{}',

    -- Resource requirements
    cpu_request DECIMAL(5,2),
    memory_request INTEGER, -- in MB
    gpu_request INTEGER DEFAULT 0,

    -- Scheduling
    scheduled_at TIMESTAMP,

    -- Metadata
    tags TEXT[],
    labels JSONB DEFAULT '{}',
    owner VARCHAR(255),
    team VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job executions table
CREATE TABLE job_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    execution_number INTEGER NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',

    -- Execution details
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,

    -- Resource usage
    cpu_used DECIMAL(5,2),
    memory_used INTEGER, -- in MB
    gpu_used INTEGER,

    -- Execution context
    executor VARCHAR(255),
    worker_node VARCHAR(255),
    container_id VARCHAR(255),

    -- Input/Output
    input_datasets JSONB DEFAULT '[]',
    output_datasets JSONB DEFAULT '[]',
    artifacts JSONB DEFAULT '[]',

    -- Results
    result JSONB,
    error_message TEXT,
    error_details JSONB,

    -- Retry information
    retry_count INTEGER DEFAULT 0,
    retry_after TIMESTAMP,

    -- Logs
    log_url TEXT,
    metrics JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, execution_number)
);

-- Pipeline workflows table
CREATE TABLE pipeline_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',

    -- Workflow definition
    definition JSONB NOT NULL, -- DAG structure
    schedule_cron VARCHAR(100), -- Cron expression

    -- Configuration
    config JSONB DEFAULT '{}',
    default_parameters JSONB DEFAULT '{}',

    -- State
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false,

    -- Metadata
    tags TEXT[],
    owner VARCHAR(255),
    team VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP
);

-- Workflow executions table
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES pipeline_workflows(id) ON DELETE CASCADE,
    run_id VARCHAR(255) UNIQUE NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',

    -- Execution details
    triggered_by VARCHAR(255),
    trigger_type VARCHAR(50), -- manual, schedule, webhook, dependency

    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,

    -- Parameters
    parameters JSONB DEFAULT '{}',

    -- State
    current_stage VARCHAR(255),
    completed_stages JSONB DEFAULT '[]',
    failed_stages JSONB DEFAULT '[]',

    -- Results
    result JSONB,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job dependencies table
CREATE TABLE job_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    depends_on_job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'completion', -- completion, success, data

    -- Conditions
    condition JSONB, -- Additional conditions for dependency

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, depends_on_job_id)
);

-- Pipeline metrics table (for time-series data)
CREATE TABLE pipeline_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES job_executions(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL,
    metric_unit VARCHAR(50),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data lineage table
CREATE TABLE data_lineage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_execution_id UUID REFERENCES job_executions(id) ON DELETE CASCADE,

    -- Source information
    source_dataset VARCHAR(500),
    source_location TEXT,
    source_version VARCHAR(50),
    source_schema JSONB,

    -- Target information
    target_dataset VARCHAR(500),
    target_location TEXT,
    target_version VARCHAR(50),
    target_schema JSONB,

    -- Transformation details
    transformation_type VARCHAR(100),
    transformation_details JSONB,

    -- Quality metrics
    records_read BIGINT,
    records_written BIGINT,
    records_failed BIGINT,
    data_quality_score DECIMAL(3,2),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline events table (for audit and streaming)
CREATE TABLE pipeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100) NOT NULL,

    -- Related entities
    job_id UUID REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES job_executions(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES pipeline_workflows(id) ON DELETE CASCADE,

    -- Event data
    event_data JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical

    -- Context
    user_id VARCHAR(255),
    session_id VARCHAR(255),

    -- Timestamps
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_pipeline_jobs_status ON pipeline_jobs(status);
CREATE INDEX idx_pipeline_jobs_source_target ON pipeline_jobs(source_system, target_system);
CREATE INDEX idx_pipeline_jobs_created_at ON pipeline_jobs(created_at DESC);
CREATE INDEX idx_pipeline_jobs_owner ON pipeline_jobs(owner);
CREATE INDEX idx_pipeline_jobs_tags ON pipeline_jobs USING GIN(tags);

CREATE INDEX idx_job_executions_job_id ON job_executions(job_id);
CREATE INDEX idx_job_executions_status ON job_executions(status);
CREATE INDEX idx_job_executions_started_at ON job_executions(started_at DESC);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_run_id ON workflow_executions(run_id);

CREATE INDEX idx_pipeline_metrics_job_id ON pipeline_metrics(job_id);
CREATE INDEX idx_pipeline_metrics_recorded_at ON pipeline_metrics(recorded_at DESC);
CREATE INDEX idx_pipeline_metrics_name ON pipeline_metrics(metric_name);

CREATE INDEX idx_data_lineage_job_execution ON data_lineage(job_execution_id);
CREATE INDEX idx_data_lineage_source ON data_lineage(source_dataset);
CREATE INDEX idx_data_lineage_target ON data_lineage(target_dataset);

CREATE INDEX idx_pipeline_events_job_id ON pipeline_events(job_id);
CREATE INDEX idx_pipeline_events_type ON pipeline_events(event_type);
CREATE INDEX idx_pipeline_events_occurred_at ON pipeline_events(occurred_at DESC);

-- Views for common queries
CREATE VIEW active_jobs AS
SELECT
    j.*,
    e.status as execution_status,
    e.started_at,
    e.executor,
    e.retry_count
FROM pipeline_jobs j
LEFT JOIN LATERAL (
    SELECT * FROM job_executions
    WHERE job_id = j.id
    ORDER BY execution_number DESC
    LIMIT 1
) e ON true
WHERE j.status IN ('pending', 'queued', 'running', 'retrying');

CREATE VIEW job_success_rates AS
SELECT
    j.type,
    j.owner,
    j.team,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE e.status = 'completed') as successful,
    COUNT(*) FILTER (WHERE e.status = 'failed') as failed,
    ROUND(100.0 * COUNT(*) FILTER (WHERE e.status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate
FROM pipeline_jobs j
JOIN job_executions e ON j.id = e.job_id
WHERE e.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY j.type, j.owner, j.team;

-- Functions for job management
CREATE OR REPLACE FUNCTION update_job_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pipeline_jobs
    SET status = NEW.status, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.job_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_status_trigger
AFTER INSERT OR UPDATE ON job_executions
FOR EACH ROW
EXECUTE FUNCTION update_job_status();

-- Function to calculate next execution number
CREATE OR REPLACE FUNCTION get_next_execution_number(p_job_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(
        (SELECT MAX(execution_number) + 1
         FROM job_executions
         WHERE job_id = p_job_id),
        1
    );
END;
$$ LANGUAGE plpgsql;