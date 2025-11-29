/**
 * Database Schema Tests
 * Tests for the database schema definitions
 */

import { describe, it, expect } from '@jest/globals';

describe('Database Schema', () => {
  let CREATE_TABLES_SQL: string;
  let defaultExport: { CREATE_TABLES_SQL: string };

  beforeAll(async () => {
    const module = await import('../src/lib/database-schema.js');
    CREATE_TABLES_SQL = module.CREATE_TABLES_SQL;
    defaultExport = module.default;
  });

  describe('CREATE_TABLES_SQL', () => {
    it('should be defined', () => {
      expect(CREATE_TABLES_SQL).toBeDefined();
      expect(typeof CREATE_TABLES_SQL).toBe('string');
    });

    it('should contain shell_history table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_history');
    });

    it('should contain shell_jobs table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_jobs');
    });

    it('should contain shell_configuration table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_configuration');
    });

    it('should contain shell_sessions table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_sessions');
    });

    it('should contain shell_aliases table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_aliases');
    });

    it('should contain shell_functions table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_functions');
    });

    it('should contain shell_completions table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS shell_completions');
    });

    it('should contain ml_training_jobs table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS ml_training_jobs');
    });

    it('should contain ml_model_versions table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS ml_model_versions');
    });

    it('should contain ml_feature_sets table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS ml_feature_sets');
    });

    it('should contain ml_predictions table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS ml_predictions');
    });

    it('should contain ml_model_comparisons table', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE TABLE IF NOT EXISTS ml_model_comparisons');
    });

    it('should include indexes for performance', () => {
      expect(CREATE_TABLES_SQL).toContain('CREATE INDEX IF NOT EXISTS');
      expect(CREATE_TABLES_SQL).toContain('idx_shell_history_session_id');
      expect(CREATE_TABLES_SQL).toContain('idx_shell_jobs_status');
    });
  });

  describe('default export', () => {
    it('should export CREATE_TABLES_SQL', () => {
      expect(defaultExport).toBeDefined();
      expect(defaultExport.CREATE_TABLES_SQL).toBe(CREATE_TABLES_SQL);
    });
  });

  describe('Type exports', () => {
    it('should export ShellHistoryEntry type', async () => {
      // Type check - creates valid object
      const entry: import('../src/lib/database-schema.js').ShellHistoryEntry = {
        id: 'test-id',
        session_id: 'session-123',
        command: 'echo hello',
        working_directory: '/home/user',
        hostname: 'localhost',
        timestamp: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(entry.id).toBe('test-id');
    });

    it('should export ShellJob type', async () => {
      const job: import('../src/lib/database-schema.js').ShellJob = {
        id: 'job-id',
        session_id: 'session-123',
        job_id: 'job-456',
        command: 'sleep 10',
        status: 'running',
        working_directory: '/home/user',
        started_at: '2024-01-01T00:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(job.status).toBe('running');
    });

    it('should export ShellConfiguration type', async () => {
      const config: import('../src/lib/database-schema.js').ShellConfiguration = {
        id: 'config-id',
        config_key: 'test_key',
        config_value: 'test_value',
        config_type: 'string',
        is_default: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(config.config_type).toBe('string');
    });

    it('should export ShellSession type', async () => {
      const session: import('../src/lib/database-schema.js').ShellSession = {
        id: 'session-id',
        session_id: 'sess-123',
        hostname: 'localhost',
        working_directory: '/home/user',
        environment_variables: { PATH: '/usr/bin' },
        started_at: '2024-01-01T00:00:00.000Z',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(session.is_active).toBe(true);
    });

    it('should export ShellAlias type', async () => {
      const alias: import('../src/lib/database-schema.js').ShellAlias = {
        id: 'alias-id',
        alias_name: 'll',
        alias_value: 'ls -la',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(alias.alias_name).toBe('ll');
    });

    it('should export ShellFunction type', async () => {
      const func: import('../src/lib/database-schema.js').ShellFunction = {
        id: 'func-id',
        function_name: 'greet',
        function_body: 'echo "Hello, $1"',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(func.function_name).toBe('greet');
    });

    it('should export ShellCompletion type', async () => {
      const completion: import('../src/lib/database-schema.js').ShellCompletion = {
        id: 'comp-id',
        command: 'git',
        completion_type: 'command',
        completion_pattern: 'git*',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(completion.completion_type).toBe('command');
    });

    it('should export MLTrainingJob type', async () => {
      const job: import('../src/lib/database-schema.js').MLTrainingJob = {
        id: 'ml-job-id',
        job_name: 'test-model',
        model_type: 'random_forest',
        dataset_name: 'test_data',
        status: 'pending',
        hyperparameters: { n_estimators: 100 },
        feature_names: ['feature1', 'feature2'],
        target_variable: 'target',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(job.status).toBe('pending');
    });

    it('should export MLModelVersion type', async () => {
      const version: import('../src/lib/database-schema.js').MLModelVersion = {
        id: 'version-id',
        training_job_id: 'job-id',
        model_name: 'test-model',
        version: '1.0.0',
        model_type: 'random_forest',
        test_rmse: 0.1,
        test_mae: 0.05,
        test_r2: 0.95,
        is_deployed: false,
        model_path: '/models/test.pkl',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(version.test_r2).toBe(0.95);
    });

    it('should export MLFeatureSet type', async () => {
      const featureSet: import('../src/lib/database-schema.js').MLFeatureSet = {
        id: 'feature-set-id',
        feature_set_name: 'basic_features',
        version: '1.0.0',
        features: [
          { name: 'feature1', type: 'lag', params: { lag: 1 } },
        ],
        feature_count: 1,
        used_in_models: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      expect(featureSet.feature_count).toBe(1);
    });

    it('should export MLPrediction type', async () => {
      const prediction: import('../src/lib/database-schema.js').MLPrediction = {
        id: 'pred-id',
        model_version_id: 'version-id',
        prediction_date: '2024-01-01T00:00:00.000Z',
        predicted_value: 100.5,
        features_json: { feature1: 10 },
        created_at: '2024-01-01T00:00:00.000Z',
      };
      expect(prediction.predicted_value).toBe(100.5);
    });

    it('should export MLModelComparison type', async () => {
      const comparison: import('../src/lib/database-schema.js').MLModelComparison = {
        id: 'comp-id',
        comparison_name: 'Model A vs B',
        model_ids: ['model-a', 'model-b'],
        comparison_results: [
          { model_id: 'model-a', model_name: 'Model A', rmse: 0.1, mae: 0.05, r2: 0.95, rank: 1 },
        ],
        best_model_id: 'model-a',
        best_model_metric: 'r2',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      expect(comparison.best_model_metric).toBe('r2');
    });
  });
});
