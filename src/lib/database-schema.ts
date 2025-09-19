/**
 * Database Schema Definitions for LSH
 * Defines tables and types for shell data persistence
 */

export interface ShellHistoryEntry {
  id: string;
  user_id?: string;
  session_id: string;
  command: string;
  working_directory: string;
  exit_code?: number;
  timestamp: string;
  duration_ms?: number;
  hostname: string;
  created_at: string;
  updated_at: string;
}

export interface ShellJob {
  id: string;
  user_id?: string;
  session_id: string;
  job_id: string;
  command: string;
  status: 'running' | 'stopped' | 'completed' | 'failed';
  pid?: number;
  working_directory: string;
  started_at: string;
  completed_at?: string;
  exit_code?: number;
  output?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ShellConfiguration {
  id: string;
  user_id?: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShellSession {
  id: string;
  user_id?: string;
  session_id: string;
  hostname: string;
  working_directory: string;
  environment_variables: Record<string, string>;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShellAlias {
  id: string;
  user_id?: string;
  alias_name: string;
  alias_value: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShellFunction {
  id: string;
  user_id?: string;
  function_name: string;
  function_body: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShellCompletion {
  id: string;
  user_id?: string;
  command: string;
  completion_type: 'file' | 'directory' | 'command' | 'variable' | 'function' | 'option';
  completion_pattern: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// SQL schema for creating tables
export const CREATE_TABLES_SQL = `
-- Shell History Table
CREATE TABLE IF NOT EXISTS shell_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT NOT NULL,
  command TEXT NOT NULL,
  working_directory TEXT NOT NULL,
  exit_code INTEGER,
  timestamp TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER,
  hostname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shell Jobs Table
CREATE TABLE IF NOT EXISTS shell_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'completed', 'failed')),
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

-- Shell Configuration Table
CREATE TABLE IF NOT EXISTS shell_configuration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN ('string', 'number', 'boolean', 'array', 'object')),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, config_key)
);

-- Shell Sessions Table
CREATE TABLE IF NOT EXISTS shell_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT NOT NULL UNIQUE,
  hostname TEXT NOT NULL,
  working_directory TEXT NOT NULL,
  environment_variables JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shell Aliases Table
CREATE TABLE IF NOT EXISTS shell_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  alias_name TEXT NOT NULL,
  alias_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alias_name)
);

-- Shell Functions Table
CREATE TABLE IF NOT EXISTS shell_functions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  function_name TEXT NOT NULL,
  function_body TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, function_name)
);

-- Shell Completions Table
CREATE TABLE IF NOT EXISTS shell_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  command TEXT NOT NULL,
  completion_type TEXT NOT NULL CHECK (completion_type IN ('file', 'directory', 'command', 'variable', 'function', 'option')),
  completion_pattern TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, command, completion_pattern)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shell_history_session_id ON shell_history(session_id);
CREATE INDEX IF NOT EXISTS idx_shell_history_timestamp ON shell_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_shell_history_user_id ON shell_history(user_id);

CREATE INDEX IF NOT EXISTS idx_shell_jobs_session_id ON shell_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_shell_jobs_status ON shell_jobs(status);
CREATE INDEX IF NOT EXISTS idx_shell_jobs_user_id ON shell_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_shell_configuration_user_id ON shell_configuration(user_id);
CREATE INDEX IF NOT EXISTS idx_shell_configuration_key ON shell_configuration(config_key);

CREATE INDEX IF NOT EXISTS idx_shell_sessions_user_id ON shell_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_shell_sessions_active ON shell_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_shell_aliases_user_id ON shell_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_shell_aliases_name ON shell_aliases(alias_name);

CREATE INDEX IF NOT EXISTS idx_shell_functions_user_id ON shell_functions(user_id);
CREATE INDEX IF NOT EXISTS idx_shell_functions_name ON shell_functions(function_name);

CREATE INDEX IF NOT EXISTS idx_shell_completions_user_id ON shell_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_shell_completions_command ON shell_completions(command);
`;

export default {
  CREATE_TABLES_SQL,
};