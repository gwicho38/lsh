/**
 * Database Schema Definitions for LSH
 * Defines tables and types for shell data persistence
 */

/**
 * Valid types for ML hyperparameter values
 */
export type HyperparameterValue = string | number | boolean | string[] | number[];

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

export interface MLTrainingJob {
  id: string;
  user_id?: string;
  job_name: string;
  model_type: string;
  dataset_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  hyperparameters: Record<string, HyperparameterValue>;
  feature_names: string[];
  target_variable: string;
  train_rmse?: number;
  train_mae?: number;
  train_r2?: number;
  test_rmse?: number;
  test_mae?: number;
  test_r2?: number;
  mape?: number;
  cv_scores?: number[];
  cv_mean?: number;
  cv_std?: number;
  model_path?: string;
  scaler_path?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  notes?: string;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MLModelVersion {
  id: string;
  user_id?: string;
  training_job_id: string;
  model_name: string;
  version: string;
  model_type: string;
  test_rmse: number;
  test_mae: number;
  test_r2: number;
  test_mape?: number;
  feature_importance?: Record<string, number>;
  rank_by_rmse?: number;
  rank_by_r2?: number;
  is_deployed: boolean;
  deployed_at?: string;
  model_path: string;
  predictions_file?: string;
  residuals_file?: string;
  created_at: string;
  updated_at: string;
}

export interface MLFeatureSet {
  id: string;
  user_id?: string;
  feature_set_name: string;
  version: string;
  features: Array<{
    name: string;
    type: 'lag' | 'ma' | 'volatility' | 'pct_change' | 'technical' | 'custom';
    params?: Record<string, HyperparameterValue>;
    importance?: number;
  }>;
  feature_count: number;
  correlation_with_target?: Record<string, number>;
  used_in_models: string[];
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MLPrediction {
  id: string;
  user_id?: string;
  model_version_id: string;
  prediction_date: string;
  target_date?: string;
  predicted_value: number;
  actual_value?: number;
  confidence_score?: number;
  features_json: Record<string, HyperparameterValue>;
  residual?: number;
  absolute_error?: number;
  created_at: string;
}

export interface MLModelComparison {
  id: string;
  user_id?: string;
  comparison_name: string;
  model_ids: string[];
  comparison_results: Array<{
    model_id: string;
    model_name: string;
    rmse: number;
    mae: number;
    r2: number;
    rank: number;
  }>;
  best_model_id: string;
  best_model_metric: 'rmse' | 'mae' | 'r2';
  notes?: string;
  created_at: string;
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

-- ML Training Jobs Table
CREATE TABLE IF NOT EXISTS ml_training_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  job_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  hyperparameters JSONB NOT NULL,
  feature_names TEXT[] NOT NULL,
  target_variable TEXT NOT NULL,
  train_rmse FLOAT,
  train_mae FLOAT,
  train_r2 FLOAT,
  test_rmse FLOAT,
  test_mae FLOAT,
  test_r2 FLOAT,
  mape FLOAT,
  cv_scores FLOAT[],
  cv_mean FLOAT,
  cv_std FLOAT,
  model_path TEXT,
  scaler_path TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  notes TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Model Versions Table
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  training_job_id UUID REFERENCES ml_training_jobs(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  model_type TEXT NOT NULL,
  test_rmse FLOAT NOT NULL,
  test_mae FLOAT NOT NULL,
  test_r2 FLOAT NOT NULL,
  test_mape FLOAT,
  feature_importance JSONB,
  rank_by_rmse INTEGER,
  rank_by_r2 INTEGER,
  is_deployed BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  model_path TEXT NOT NULL,
  predictions_file TEXT,
  residuals_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, version)
);

-- ML Feature Sets Table
CREATE TABLE IF NOT EXISTS ml_feature_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  feature_set_name TEXT NOT NULL,
  version TEXT NOT NULL,
  features JSONB NOT NULL,
  feature_count INTEGER NOT NULL,
  correlation_with_target JSONB,
  used_in_models TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_set_name, version)
);

-- ML Predictions Table
CREATE TABLE IF NOT EXISTS ml_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  model_version_id UUID REFERENCES ml_model_versions(id) ON DELETE CASCADE,
  prediction_date TIMESTAMPTZ NOT NULL,
  target_date TIMESTAMPTZ,
  predicted_value FLOAT NOT NULL,
  actual_value FLOAT,
  confidence_score FLOAT,
  features_json JSONB NOT NULL,
  residual FLOAT,
  absolute_error FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Model Comparisons Table
CREATE TABLE IF NOT EXISTS ml_model_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  comparison_name TEXT NOT NULL,
  model_ids UUID[] NOT NULL,
  comparison_results JSONB NOT NULL,
  best_model_id UUID NOT NULL,
  best_model_metric TEXT NOT NULL CHECK (best_model_metric IN ('rmse', 'mae', 'r2')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ML tables
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_user_id ON ml_training_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_status ON ml_training_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ml_training_jobs_created ON ml_training_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_ml_model_versions_user_id ON ml_model_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_training_job ON ml_model_versions(training_job_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_deployed ON ml_model_versions(is_deployed);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_performance ON ml_model_versions(test_r2 DESC, test_rmse ASC);

CREATE INDEX IF NOT EXISTS idx_ml_feature_sets_user_id ON ml_feature_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_feature_sets_name ON ml_feature_sets(feature_set_name);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_version_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_date ON ml_predictions(prediction_date);

CREATE INDEX IF NOT EXISTS idx_ml_model_comparisons_user_id ON ml_model_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_model_comparisons_created ON ml_model_comparisons(created_at);
`;

export default {
  CREATE_TABLES_SQL,
};