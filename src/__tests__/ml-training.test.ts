/**
 * Unit tests for ML Training functionality
 */

import { describe, it, expect } from '@jest/globals';
import type {
  MLTrainingJob,
  MLModelVersion,
  MLFeatureSet,
  MLPrediction,
  MLModelComparison
} from '../lib/database-schema';


describe('ML Training Schema', () => {
  describe('MLTrainingJob', () => {
    it('should have required fields', () => {
      const job: Partial<MLTrainingJob> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        job_name: 'bitcoin-predictor-v1',
        model_type: 'random_forest',
        dataset_name: 'bitcoin_historical',
        status: 'running',
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10
        },
        feature_names: ['lag_1', 'lag_7', 'ma_7', 'volatility_7'],
        target_variable: 'btc_market_price',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(job.job_name).toBe('bitcoin-predictor-v1');
      expect(job.model_type).toBe('random_forest');
      expect(job.status).toBe('running');
      expect(job.feature_names).toHaveLength(4);
    });

    it('should track training metrics', () => {
      const job: Partial<MLTrainingJob> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        job_name: 'test-job',
        model_type: 'gradient_boosting',
        dataset_name: 'test_data',
        status: 'completed',
        hyperparameters: {},
        feature_names: [],
        target_variable: 'target',
        train_rmse: 150.5,
        train_mae: 120.3,
        train_r2: 0.85,
        test_rmse: 180.2,
        test_mae: 145.8,
        test_r2: 0.82,
        mape: 5.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(job.train_rmse).toBeLessThan(job.test_rmse!);
      expect(job.train_r2).toBeGreaterThan(job.test_r2!);
      expect(job.mape).toBeLessThan(10);
    });

    it('should track cross-validation scores', () => {
      const job: Partial<MLTrainingJob> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        job_name: 'cv-test',
        model_type: 'linear_regression',
        dataset_name: 'test',
        status: 'completed',
        hyperparameters: {},
        feature_names: [],
        target_variable: 'target',
        cv_scores: [0.80, 0.82, 0.78, 0.85, 0.79],
        cv_mean: 0.808,
        cv_std: 0.025,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(job.cv_scores).toHaveLength(5);
      expect(job.cv_mean).toBeCloseTo(0.808, 2);
      expect(job.cv_std).toBeLessThan(0.05);
    });
  });

  describe('MLModelVersion', () => {
    it('should track model versioning', () => {
      const model: Partial<MLModelVersion> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        training_job_id: '456e4567-e89b-12d3-a456-426614174000',
        model_name: 'bitcoin-rf',
        version: '1.0.0',
        model_type: 'random_forest',
        test_rmse: 175.5,
        test_mae: 140.2,
        test_r2: 0.83,
        test_mape: 6.2,
        is_deployed: false,
        model_path: '/models/bitcoin-rf-v1.pkl',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(model.version).toBe('1.0.0');
      expect(model.test_r2).toBeGreaterThan(0.8);
      expect(model.is_deployed).toBe(false);
    });

    it('should store feature importance', () => {
      const model: Partial<MLModelVersion> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        training_job_id: '456e4567-e89b-12d3-a456-426614174000',
        model_name: 'test-model',
        version: '1.0.0',
        model_type: 'random_forest',
        test_rmse: 100,
        test_mae: 80,
        test_r2: 0.90,
        feature_importance: {
          'lag_1': 0.35,
          'ma_7': 0.25,
          'volatility_7': 0.20,
          'lag_7': 0.15,
          'price_change_1': 0.05
        },
        is_deployed: false,
        model_path: '/models/test.pkl',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const totalImportance = Object.values(model.feature_importance!).reduce((a, b) => a + b, 0);
      expect(totalImportance).toBeCloseTo(1.0, 2);

      const topFeature = Object.entries(model.feature_importance!)
        .sort((a, b) => b[1] - a[1])[0];

      expect(topFeature[0]).toBe('lag_1');
    });
  });

  describe('MLFeatureSet', () => {
    it('should define feature engineering pipeline', () => {
      const featureSet: Partial<MLFeatureSet> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        feature_set_name: 'bitcoin-features-v1',
        version: '1.0.0',
        features: [
          {
            name: 'lag_1',
            type: 'lag',
            params: { periods: 1 },
            importance: 0.35
          },
          {
            name: 'ma_7',
            type: 'ma',
            params: { window: 7 },
            importance: 0.25
          },
          {
            name: 'volatility_7',
            type: 'volatility',
            params: { window: 7 },
            importance: 0.20
          }
        ],
        feature_count: 3,
        correlation_with_target: {
          'lag_1': 0.95,
          'ma_7': 0.88,
          'volatility_7': 0.45
        },
        used_in_models: ['bitcoin-rf-v1', 'bitcoin-gb-v1'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(featureSet.feature_count).toBe(3);
      expect(featureSet.features).toHaveLength(3);
      expect(featureSet.used_in_models).toContain('bitcoin-rf-v1');

      const lagFeature = featureSet.features!.find(f => f.name === 'lag_1');
      expect(lagFeature?.type).toBe('lag');
      expect(lagFeature?.params?.periods).toBe(1);
    });

    it('should track correlation with target', () => {
      const featureSet: Partial<MLFeatureSet> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        feature_set_name: 'test-features',
        version: '1.0.0',
        features: [],
        feature_count: 5,
        correlation_with_target: {
          'feature_a': 0.92,
          'feature_b': 0.78,
          'feature_c': 0.45,
          'feature_d': -0.15,
          'feature_e': 0.05
        },
        used_in_models: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const correlations = Object.entries(featureSet.correlation_with_target!)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

      expect(correlations[0][0]).toBe('feature_a');
      expect(correlations[0][1]).toBeGreaterThan(0.9);
    });
  });

  describe('MLPrediction', () => {
    it('should store prediction details', () => {
      const prediction: Partial<MLPrediction> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        model_version_id: '456e4567-e89b-12d3-a456-426614174000',
        prediction_date: new Date().toISOString(),
        predicted_value: 45000.50,
        actual_value: 45500.00,
        confidence_score: 0.85,
        features_json: {
          'lag_1': 44800,
          'ma_7': 44950,
          'volatility_7': 1200
        },
        residual: 499.50,
        absolute_error: 499.50,
        created_at: new Date().toISOString()
      };

      expect(prediction.residual).toBeCloseTo(499.50, 2);
      expect(prediction.confidence_score).toBeGreaterThan(0.8);
      expect(Math.abs(prediction.actual_value! - prediction.predicted_value)).toBeCloseTo(499.50, 2);
    });

    it('should calculate error metrics', () => {
      const predictions: Partial<MLPrediction>[] = [
        { predicted_value: 100, actual_value: 105, absolute_error: 5 },
        { predicted_value: 200, actual_value: 195, absolute_error: 5 },
        { predicted_value: 150, actual_value: 160, absolute_error: 10 },
      ];

      const mae = predictions.reduce((sum, p) => sum + p.absolute_error!, 0) / predictions.length;
      expect(mae).toBeCloseTo(6.67, 2);

      const rmse = Math.sqrt(
        predictions.reduce((sum, p) => sum + Math.pow(p.absolute_error!, 2), 0) / predictions.length
      );
      expect(rmse).toBeGreaterThan(mae);
    });
  });

  describe('MLModelComparison', () => {
    it('should compare multiple models', () => {
      const comparison: Partial<MLModelComparison> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        comparison_name: 'Bitcoin Models Comparison',
        model_ids: ['model1', 'model2', 'model3'],
        comparison_results: [
          {
            model_id: 'model1',
            model_name: 'Random Forest',
            rmse: 150.5,
            mae: 120.3,
            r2: 0.85,
            rank: 1
          },
          {
            model_id: 'model2',
            model_name: 'Gradient Boosting',
            rmse: 155.2,
            mae: 125.8,
            r2: 0.83,
            rank: 2
          },
          {
            model_id: 'model3',
            model_name: 'Linear Regression',
            rmse: 180.0,
            mae: 145.0,
            r2: 0.75,
            rank: 3
          }
        ],
        best_model_id: 'model1',
        best_model_metric: 'rmse',
        created_at: new Date().toISOString()
      };

      expect(comparison.comparison_results).toHaveLength(3);
      expect(comparison.best_model_id).toBe('model1');

      const bestModel = comparison.comparison_results!.find(r => r.rank === 1);
      expect(bestModel?.model_name).toBe('Random Forest');
      expect(bestModel?.rmse).toBeLessThan(160);
    });

    it('should rank models by different metrics', () => {
      const models = [
        { name: 'A', rmse: 100, mae: 80, r2: 0.90 },
        { name: 'B', rmse: 110, mae: 75, r2: 0.88 },
        { name: 'C', rmse: 95, mae: 85, r2: 0.92 }
      ];

      // Best by RMSE
      const bestRMSE = models.sort((a, b) => a.rmse - b.rmse)[0];
      expect(bestRMSE.name).toBe('C');

      // Best by MAE
      const bestMAE = [...models].sort((a, b) => a.mae - b.mae)[0];
      expect(bestMAE.name).toBe('B');

      // Best by R²
      const bestR2 = [...models].sort((a, b) => b.r2 - a.r2)[0];
      expect(bestR2.name).toBe('C');
    });
  });
});
