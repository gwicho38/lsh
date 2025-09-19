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
export declare const CREATE_TABLES_SQL = "\n-- Shell History Table\nCREATE TABLE IF NOT EXISTS shell_history (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  session_id TEXT NOT NULL,\n  command TEXT NOT NULL,\n  working_directory TEXT NOT NULL,\n  exit_code INTEGER,\n  timestamp TIMESTAMPTZ NOT NULL,\n  duration_ms INTEGER,\n  hostname TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Shell Jobs Table\nCREATE TABLE IF NOT EXISTS shell_jobs (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  session_id TEXT NOT NULL,\n  job_id TEXT NOT NULL,\n  command TEXT NOT NULL,\n  status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'completed', 'failed')),\n  pid INTEGER,\n  working_directory TEXT NOT NULL,\n  started_at TIMESTAMPTZ NOT NULL,\n  completed_at TIMESTAMPTZ,\n  exit_code INTEGER,\n  output TEXT,\n  error TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Shell Configuration Table\nCREATE TABLE IF NOT EXISTS shell_configuration (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  config_key TEXT NOT NULL,\n  config_value TEXT NOT NULL,\n  config_type TEXT NOT NULL CHECK (config_type IN ('string', 'number', 'boolean', 'array', 'object')),\n  description TEXT,\n  is_default BOOLEAN DEFAULT FALSE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, config_key)\n);\n\n-- Shell Sessions Table\nCREATE TABLE IF NOT EXISTS shell_sessions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  session_id TEXT NOT NULL UNIQUE,\n  hostname TEXT NOT NULL,\n  working_directory TEXT NOT NULL,\n  environment_variables JSONB,\n  started_at TIMESTAMPTZ NOT NULL,\n  ended_at TIMESTAMPTZ,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Shell Aliases Table\nCREATE TABLE IF NOT EXISTS shell_aliases (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  alias_name TEXT NOT NULL,\n  alias_value TEXT NOT NULL,\n  description TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, alias_name)\n);\n\n-- Shell Functions Table\nCREATE TABLE IF NOT EXISTS shell_functions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  function_name TEXT NOT NULL,\n  function_body TEXT NOT NULL,\n  description TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, function_name)\n);\n\n-- Shell Completions Table\nCREATE TABLE IF NOT EXISTS shell_completions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  command TEXT NOT NULL,\n  completion_type TEXT NOT NULL CHECK (completion_type IN ('file', 'directory', 'command', 'variable', 'function', 'option')),\n  completion_pattern TEXT NOT NULL,\n  description TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, command, completion_pattern)\n);\n\n-- Indexes for performance\nCREATE INDEX IF NOT EXISTS idx_shell_history_session_id ON shell_history(session_id);\nCREATE INDEX IF NOT EXISTS idx_shell_history_timestamp ON shell_history(timestamp);\nCREATE INDEX IF NOT EXISTS idx_shell_history_user_id ON shell_history(user_id);\n\nCREATE INDEX IF NOT EXISTS idx_shell_jobs_session_id ON shell_jobs(session_id);\nCREATE INDEX IF NOT EXISTS idx_shell_jobs_status ON shell_jobs(status);\nCREATE INDEX IF NOT EXISTS idx_shell_jobs_user_id ON shell_jobs(user_id);\n\nCREATE INDEX IF NOT EXISTS idx_shell_configuration_user_id ON shell_configuration(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_configuration_key ON shell_configuration(config_key);\n\nCREATE INDEX IF NOT EXISTS idx_shell_sessions_user_id ON shell_sessions(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_sessions_active ON shell_sessions(is_active);\n\nCREATE INDEX IF NOT EXISTS idx_shell_aliases_user_id ON shell_aliases(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_aliases_name ON shell_aliases(alias_name);\n\nCREATE INDEX IF NOT EXISTS idx_shell_functions_user_id ON shell_functions(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_functions_name ON shell_functions(function_name);\n\nCREATE INDEX IF NOT EXISTS idx_shell_completions_user_id ON shell_completions(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_completions_command ON shell_completions(command);\n";
declare const _default: {
    CREATE_TABLES_SQL: string;
};
export default _default;
