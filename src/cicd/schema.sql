-- CI/CD Dashboard Database Schema

-- Pipeline events table
CREATE TABLE IF NOT EXISTS pipeline_events (
    id VARCHAR(255) PRIMARY KEY,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('github', 'gitlab', 'jenkins')),
    repository VARCHAR(255) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    conclusion VARCHAR(20) CHECK (conclusion IN ('success', 'failure', 'cancelled', 'skipped')),
    workflow_name VARCHAR(255) NOT NULL,
    job_name VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    actor VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    workflow_url TEXT NOT NULL,
    logs_url TEXT,
    artifacts JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_events_platform ON pipeline_events(platform);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_repository ON pipeline_events(repository);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_status ON pipeline_events(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_started_at ON pipeline_events(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_actor ON pipeline_events(actor);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_branch ON pipeline_events(branch);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pipeline_events_repo_branch ON pipeline_events(repository, branch);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_platform_status ON pipeline_events(platform, status);

-- Pipeline metrics aggregation table
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    platform VARCHAR(20) NOT NULL,
    repository VARCHAR(255),
    total_builds INTEGER DEFAULT 0,
    successful_builds INTEGER DEFAULT 0,
    failed_builds INTEGER DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    max_duration_ms INTEGER DEFAULT 0,
    min_duration_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, platform, repository)
);

-- Indexes for metrics table
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_date ON pipeline_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_platform ON pipeline_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_repository ON pipeline_metrics(repository);

-- Pipeline stages table (for detailed stage analysis)
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id SERIAL PRIMARY KEY,
    pipeline_event_id VARCHAR(255) NOT NULL REFERENCES pipeline_events(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'skipped')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    logs_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stages table
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_event_id ON pipeline_stages(pipeline_event_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_status ON pipeline_stages(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_name ON pipeline_stages(stage_name);

-- Webhook events log table (for debugging)
CREATE TABLE IF NOT EXISTS webhook_events (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    repository VARCHAR(255),
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_platform ON webhook_events(platform);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Alerts table
CREATE TABLE IF NOT EXISTS pipeline_alerts (
    id SERIAL PRIMARY KEY,
    pipeline_event_id VARCHAR(255) REFERENCES pipeline_events(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    threshold_value DECIMAL,
    actual_value DECIMAL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_event_id ON pipeline_alerts(pipeline_event_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_type ON pipeline_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_severity ON pipeline_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_pipeline_alerts_resolved ON pipeline_alerts(resolved);

-- Update trigger for pipeline_events
CREATE OR REPLACE FUNCTION update_pipeline_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pipeline_events_update_timestamp
    BEFORE UPDATE ON pipeline_events
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_events_timestamp();

-- Update trigger for pipeline_metrics
CREATE TRIGGER pipeline_metrics_update_timestamp
    BEFORE UPDATE ON pipeline_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_events_timestamp();

-- View for pipeline summary
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
    pe.id,
    pe.platform,
    pe.repository,
    pe.branch,
    pe.workflow_name,
    pe.status,
    pe.conclusion,
    pe.started_at,
    pe.completed_at,
    pe.duration_ms,
    pe.actor,
    COUNT(ps.id) as stage_count,
    COUNT(CASE WHEN ps.status = 'failed' THEN 1 END) as failed_stages,
    COUNT(pa.id) as alert_count
FROM pipeline_events pe
LEFT JOIN pipeline_stages ps ON pe.id = ps.pipeline_event_id
LEFT JOIN pipeline_alerts pa ON pe.id = pa.pipeline_event_id AND pa.resolved = FALSE
GROUP BY pe.id, pe.platform, pe.repository, pe.branch, pe.workflow_name,
         pe.status, pe.conclusion, pe.started_at, pe.completed_at,
         pe.duration_ms, pe.actor;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO pipeline_metrics (
        date, platform, repository, total_builds, successful_builds,
        failed_builds, avg_duration_ms, max_duration_ms, min_duration_ms, success_rate
    )
    SELECT
        target_date,
        platform,
        repository,
        COUNT(*) as total_builds,
        COUNT(CASE WHEN conclusion = 'success' THEN 1 END) as successful_builds,
        COUNT(CASE WHEN conclusion = 'failure' THEN 1 END) as failed_builds,
        ROUND(AVG(duration_ms))::INTEGER as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MIN(duration_ms) as min_duration_ms,
        ROUND(
            COUNT(CASE WHEN conclusion = 'success' THEN 1 END) * 100.0 / COUNT(*), 2
        ) as success_rate
    FROM pipeline_events
    WHERE DATE(started_at) = target_date
      AND status = 'completed'
      AND duration_ms IS NOT NULL
    GROUP BY platform, repository
    ON CONFLICT (date, platform, repository)
    DO UPDATE SET
        total_builds = EXCLUDED.total_builds,
        successful_builds = EXCLUDED.successful_builds,
        failed_builds = EXCLUDED.failed_builds,
        avg_duration_ms = EXCLUDED.avg_duration_ms,
        max_duration_ms = EXCLUDED.max_duration_ms,
        min_duration_ms = EXCLUDED.min_duration_ms,
        success_rate = EXCLUDED.success_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;