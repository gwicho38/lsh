-- LSH Database Initialization Script
-- Creates tables for local PostgreSQL deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shell History Table
CREATE TABLE IF NOT EXISTS shell_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    command TEXT NOT NULL,
    working_directory TEXT NOT NULL,
    exit_code INTEGER,
    timestamp TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER,
    hostname VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shell_history_user_id ON shell_history(user_id);
CREATE INDEX idx_shell_history_session_id ON shell_history(session_id);
CREATE INDEX idx_shell_history_timestamp ON shell_history(timestamp DESC);

-- Shell Jobs Table
CREATE TABLE IF NOT EXISTS shell_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(255) NOT NULL UNIQUE,
    command TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('running', 'stopped', 'completed', 'failed')),
    pid INTEGER,
    working_directory TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    exit_code INTEGER,
    output TEXT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shell_jobs_user_id ON shell_jobs(user_id);
CREATE INDEX idx_shell_jobs_job_id ON shell_jobs(job_id);
CREATE INDEX idx_shell_jobs_status ON shell_jobs(status);

-- Shell Configuration Table
CREATE TABLE IF NOT EXISTS shell_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    config_key VARCHAR(255) NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(50) CHECK (config_type IN ('string', 'number', 'boolean', 'array', 'object')),
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, config_key)
);

CREATE INDEX idx_shell_configuration_user_id ON shell_configuration(user_id);
CREATE INDEX idx_shell_configuration_key ON shell_configuration(config_key);

-- Shell Sessions Table
CREATE TABLE IF NOT EXISTS shell_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    hostname VARCHAR(255) NOT NULL,
    working_directory TEXT NOT NULL,
    environment_variables JSONB,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shell_sessions_user_id ON shell_sessions(user_id);
CREATE INDEX idx_shell_sessions_session_id ON shell_sessions(session_id);
CREATE INDEX idx_shell_sessions_is_active ON shell_sessions(is_active);

-- Shell Aliases Table
CREATE TABLE IF NOT EXISTS shell_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    alias_name VARCHAR(255) NOT NULL,
    alias_value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, alias_name)
);

CREATE INDEX idx_shell_aliases_user_id ON shell_aliases(user_id);
CREATE INDEX idx_shell_aliases_name ON shell_aliases(alias_name);

-- Shell Functions Table
CREATE TABLE IF NOT EXISTS shell_functions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    function_name VARCHAR(255) NOT NULL,
    function_body TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, function_name)
);

CREATE INDEX idx_shell_functions_user_id ON shell_functions(user_id);
CREATE INDEX idx_shell_functions_name ON shell_functions(function_name);

-- Shell Completions Table
CREATE TABLE IF NOT EXISTS shell_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    command VARCHAR(255) NOT NULL,
    completions TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shell_completions_user_id ON shell_completions(user_id);
CREATE INDEX idx_shell_completions_command ON shell_completions(command);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lsh_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lsh_user;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_shell_history_updated_at BEFORE UPDATE ON shell_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shell_jobs_updated_at BEFORE UPDATE ON shell_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shell_configuration_updated_at BEFORE UPDATE ON shell_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shell_sessions_updated_at BEFORE UPDATE ON shell_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shell_aliases_updated_at BEFORE UPDATE ON shell_aliases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shell_functions_updated_at BEFORE UPDATE ON shell_functions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shell_completions_updated_at BEFORE UPDATE ON shell_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
