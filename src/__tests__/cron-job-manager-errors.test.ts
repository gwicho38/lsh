/**
 * Tests for cron-job-manager.ts error handling
 * Verifies LSHError is used with correct error codes
 *
 * Note: CronJobManager integration tests require daemon running.
 * These tests verify LSHError behavior directly.
 */

import { describe, it, expect } from '@jest/globals';
import { LSHError, ErrorCodes } from '../lib/lsh-error.js';

describe('LSHError for Cron Job Manager', () => {
  describe('Template Not Found Errors', () => {
    it('should use RESOURCE_NOT_FOUND code with 404 status for missing template', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template custom-backup not found',
        { templateId: 'custom-backup', availableTemplates: ['database-backup', 'log-cleanup'] }
      );

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.context?.templateId).toBe('custom-backup');
      expect(error.context?.availableTemplates).toContain('database-backup');
    });

    it('should include available templates in context', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template non-existent not found',
        {
          templateId: 'non-existent',
          availableTemplates: ['database-backup', 'log-cleanup', 'disk-monitor', 'data-sync']
        }
      );

      expect(error.context?.availableTemplates).toHaveLength(4);
      expect(error.context?.availableTemplates).toContain('disk-monitor');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize template errors to JSON correctly', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template not found',
        { templateId: 'unknown-template' }
      );

      const json = error.toJSON();

      expect(json.code).toBe('RESOURCE_NOT_FOUND');
      expect(json.message).toBe('Template not found');
      expect(json.statusCode).toBe(404);
      expect(json.context?.templateId).toBe('unknown-template');
    });
  });

  describe('Error Instance Checks', () => {
    it('should be instanceof Error', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template not found',
        {}
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof LSHError).toBe(true);
    });

    it('should have name property set to LSHError', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template not found',
        {}
      );

      expect(error.name).toBe('LSHError');
    });
  });

  describe('Cron Job Template IDs', () => {
    it('should reference database-backup template', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template database-backup not found',
        { templateId: 'database-backup' }
      );

      expect(error.context?.templateId).toBe('database-backup');
    });

    it('should reference log-cleanup template', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template log-cleanup not found',
        { templateId: 'log-cleanup' }
      );

      expect(error.context?.templateId).toBe('log-cleanup');
    });

    it('should reference disk-monitor template', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template disk-monitor not found',
        { templateId: 'disk-monitor' }
      );

      expect(error.context?.templateId).toBe('disk-monitor');
    });

    it('should reference data-sync template', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template data-sync not found',
        { templateId: 'data-sync' }
      );

      expect(error.context?.templateId).toBe('data-sync');
    });
  });

  describe('Context Preservation', () => {
    it('should preserve templateId in context', () => {
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template not found',
        { templateId: 'my-custom-template' }
      );

      expect(error.context?.templateId).toBe('my-custom-template');
    });

    it('should preserve availableTemplates array in context', () => {
      const templates = ['backup-daily', 'cleanup-weekly', 'monitor-hourly'];
      const error = new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Template not found',
        { templateId: 'unknown', availableTemplates: templates }
      );

      expect(error.context?.availableTemplates).toEqual(templates);
    });
  });
});
