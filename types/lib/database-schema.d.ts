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
export declare const CREATE_TABLES_SQL = "\n-- Shell History Table\nCREATE TABLE IF NOT EXISTS shell_history (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  session_id TEXT NOT NULL,\n  command TEXT NOT NULL,\n  working_directory TEXT NOT NULL,\n  exit_code INTEGER,\n  timestamp TIMESTAMPTZ NOT NULL,\n  duration_ms INTEGER,\n  hostname TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Shell Jobs Table\nCREATE TABLE IF NOT EXISTS shell_jobs (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  session_id TEXT NOT NULL,\n  job_id TEXT NOT NULL,\n  command TEXT NOT NULL,\n  status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'completed', 'failed')),\n  pid INTEGER,\n  working_directory TEXT NOT NULL,\n  started_at TIMESTAMPTZ NOT NULL,\n  completed_at TIMESTAMPTZ,\n  exit_code INTEGER,\n  output TEXT,\n  error TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Shell Configuration Table\nCREATE TABLE IF NOT EXISTS shell_configuration (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  config_key TEXT NOT NULL,\n  config_value TEXT NOT NULL,\n  config_type TEXT NOT NULL CHECK (config_type IN ('string', 'number', 'boolean', 'array', 'object')),\n  description TEXT,\n  is_default BOOLEAN DEFAULT FALSE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, config_key)\n);\n\n-- Shell Sessions Table\nCREATE TABLE IF NOT EXISTS shell_sessions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  session_id TEXT NOT NULL UNIQUE,\n  hostname TEXT NOT NULL,\n  working_directory TEXT NOT NULL,\n  environment_variables JSONB,\n  started_at TIMESTAMPTZ NOT NULL,\n  ended_at TIMESTAMPTZ,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Shell Aliases Table\nCREATE TABLE IF NOT EXISTS shell_aliases (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  alias_name TEXT NOT NULL,\n  alias_value TEXT NOT NULL,\n  description TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, alias_name)\n);\n\n-- Shell Functions Table\nCREATE TABLE IF NOT EXISTS shell_functions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  function_name TEXT NOT NULL,\n  function_body TEXT NOT NULL,\n  description TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, function_name)\n);\n\n-- Shell Completions Table\nCREATE TABLE IF NOT EXISTS shell_completions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  command TEXT NOT NULL,\n  completion_type TEXT NOT NULL CHECK (completion_type IN ('file', 'directory', 'command', 'variable', 'function', 'option')),\n  completion_pattern TEXT NOT NULL,\n  description TEXT,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(user_id, command, completion_pattern)\n);\n\n-- Indexes for performance\nCREATE INDEX IF NOT EXISTS idx_shell_history_session_id ON shell_history(session_id);\nCREATE INDEX IF NOT EXISTS idx_shell_history_timestamp ON shell_history(timestamp);\nCREATE INDEX IF NOT EXISTS idx_shell_history_user_id ON shell_history(user_id);\n\nCREATE INDEX IF NOT EXISTS idx_shell_jobs_session_id ON shell_jobs(session_id);\nCREATE INDEX IF NOT EXISTS idx_shell_jobs_status ON shell_jobs(status);\nCREATE INDEX IF NOT EXISTS idx_shell_jobs_user_id ON shell_jobs(user_id);\n\nCREATE INDEX IF NOT EXISTS idx_shell_configuration_user_id ON shell_configuration(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_configuration_key ON shell_configuration(config_key);\n\nCREATE INDEX IF NOT EXISTS idx_shell_sessions_user_id ON shell_sessions(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_sessions_active ON shell_sessions(is_active);\n\nCREATE INDEX IF NOT EXISTS idx_shell_aliases_user_id ON shell_aliases(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_aliases_name ON shell_aliases(alias_name);\n\nCREATE INDEX IF NOT EXISTS idx_shell_functions_user_id ON shell_functions(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_functions_name ON shell_functions(function_name);\n\nCREATE INDEX IF NOT EXISTS idx_shell_completions_user_id ON shell_completions(user_id);\nCREATE INDEX IF NOT EXISTS idx_shell_completions_command ON shell_completions(command);\n\n-- ML Training Jobs Table\nCREATE TABLE IF NOT EXISTS ml_training_jobs (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  job_name TEXT NOT NULL,\n  model_type TEXT NOT NULL,\n  dataset_name TEXT NOT NULL,\n  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),\n  hyperparameters JSONB NOT NULL,\n  feature_names TEXT[] NOT NULL,\n  target_variable TEXT NOT NULL,\n  train_rmse FLOAT,\n  train_mae FLOAT,\n  train_r2 FLOAT,\n  test_rmse FLOAT,\n  test_mae FLOAT,\n  test_r2 FLOAT,\n  mape FLOAT,\n  cv_scores FLOAT[],\n  cv_mean FLOAT,\n  cv_std FLOAT,\n  model_path TEXT,\n  scaler_path TEXT,\n  started_at TIMESTAMPTZ,\n  completed_at TIMESTAMPTZ,\n  duration_ms INTEGER,\n  error_message TEXT,\n  notes TEXT,\n  metadata_json JSONB,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- ML Model Versions Table\nCREATE TABLE IF NOT EXISTS ml_model_versions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  training_job_id UUID REFERENCES ml_training_jobs(id) ON DELETE CASCADE,\n  model_name TEXT NOT NULL,\n  version TEXT NOT NULL,\n  model_type TEXT NOT NULL,\n  test_rmse FLOAT NOT NULL,\n  test_mae FLOAT NOT NULL,\n  test_r2 FLOAT NOT NULL,\n  test_mape FLOAT,\n  feature_importance JSONB,\n  rank_by_rmse INTEGER,\n  rank_by_r2 INTEGER,\n  is_deployed BOOLEAN DEFAULT FALSE,\n  deployed_at TIMESTAMPTZ,\n  model_path TEXT NOT NULL,\n  predictions_file TEXT,\n  residuals_file TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(model_name, version)\n);\n\n-- ML Feature Sets Table\nCREATE TABLE IF NOT EXISTS ml_feature_sets (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  feature_set_name TEXT NOT NULL,\n  version TEXT NOT NULL,\n  features JSONB NOT NULL,\n  feature_count INTEGER NOT NULL,\n  correlation_with_target JSONB,\n  used_in_models TEXT[],\n  description TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE(feature_set_name, version)\n);\n\n-- ML Predictions Table\nCREATE TABLE IF NOT EXISTS ml_predictions (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  model_version_id UUID REFERENCES ml_model_versions(id) ON DELETE CASCADE,\n  prediction_date TIMESTAMPTZ NOT NULL,\n  target_date TIMESTAMPTZ,\n  predicted_value FLOAT NOT NULL,\n  actual_value FLOAT,\n  confidence_score FLOAT,\n  features_json JSONB NOT NULL,\n  residual FLOAT,\n  absolute_error FLOAT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- ML Model Comparisons Table\nCREATE TABLE IF NOT EXISTS ml_model_comparisons (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID,\n  comparison_name TEXT NOT NULL,\n  model_ids UUID[] NOT NULL,\n  comparison_results JSONB NOT NULL,\n  best_model_id UUID NOT NULL,\n  best_model_metric TEXT NOT NULL CHECK (best_model_metric IN ('rmse', 'mae', 'r2')),\n  notes TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Indexes for ML tables\nCREATE INDEX IF NOT EXISTS idx_ml_training_jobs_user_id ON ml_training_jobs(user_id);\nCREATE INDEX IF NOT EXISTS idx_ml_training_jobs_status ON ml_training_jobs(status);\nCREATE INDEX IF NOT EXISTS idx_ml_training_jobs_created ON ml_training_jobs(created_at);\n\nCREATE INDEX IF NOT EXISTS idx_ml_model_versions_user_id ON ml_model_versions(user_id);\nCREATE INDEX IF NOT EXISTS idx_ml_model_versions_training_job ON ml_model_versions(training_job_id);\nCREATE INDEX IF NOT EXISTS idx_ml_model_versions_deployed ON ml_model_versions(is_deployed);\nCREATE INDEX IF NOT EXISTS idx_ml_model_versions_performance ON ml_model_versions(test_r2 DESC, test_rmse ASC);\n\nCREATE INDEX IF NOT EXISTS idx_ml_feature_sets_user_id ON ml_feature_sets(user_id);\nCREATE INDEX IF NOT EXISTS idx_ml_feature_sets_name ON ml_feature_sets(feature_set_name);\n\nCREATE INDEX IF NOT EXISTS idx_ml_predictions_user_id ON ml_predictions(user_id);\nCREATE INDEX IF NOT EXISTS idx_ml_predictions_model ON ml_predictions(model_version_id);\nCREATE INDEX IF NOT EXISTS idx_ml_predictions_date ON ml_predictions(prediction_date);\n\nCREATE INDEX IF NOT EXISTS idx_ml_model_comparisons_user_id ON ml_model_comparisons(user_id);\nCREATE INDEX IF NOT EXISTS idx_ml_model_comparisons_created ON ml_model_comparisons(created_at);\n";
declare const _default: {
    CREATE_TABLES_SQL: string;
};
export default _default;
