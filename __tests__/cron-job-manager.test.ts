/**
 * Cron Job Manager Tests
 * Tests for the cron job manager templates and utility functions
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('CronJobManager', () => {
  let CronJobManager: typeof import('../src/lib/cron-job-manager.js').CronJobManager;
  let CronJobTemplate: typeof import('../src/lib/cron-job-manager.js').CronJobTemplate;

  beforeAll(async () => {
    const module = await import('../src/lib/cron-job-manager.js');
    CronJobManager = module.CronJobManager;
  });

  describe('Constructor', () => {
    it('should create instance without userId', () => {
      const manager = new CronJobManager();
      expect(manager).toBeDefined();
    });

    it('should create instance with userId', () => {
      const manager = new CronJobManager('test-user-id');
      expect(manager).toBeDefined();
    });
  });

  describe('Templates', () => {
    it('should have predefined templates available', () => {
      const manager = new CronJobManager();
      const templates = manager.listTemplates();
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have database-backup template', () => {
      const manager = new CronJobManager();
      const template = manager.getTemplate('database-backup');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Database Backup');
      expect(template?.category).toBe('backup');
      expect(template?.schedule).toBe('0 2 * * *');
    });

    it('should have log-cleanup template', () => {
      const manager = new CronJobManager();
      const template = manager.getTemplate('log-cleanup');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Log Cleanup');
      expect(template?.category).toBe('maintenance');
      expect(template?.schedule).toBe('0 3 * * 0');
    });

    it('should have disk-monitor template', () => {
      const manager = new CronJobManager();
      const template = manager.getTemplate('disk-monitor');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Disk Space Monitor');
      expect(template?.category).toBe('monitoring');
      expect(template?.schedule).toBe('*/15 * * * *');
    });

    it('should have data-sync template', () => {
      const manager = new CronJobManager();
      const template = manager.getTemplate('data-sync');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Data Synchronization');
      expect(template?.category).toBe('data-processing');
      expect(template?.schedule).toBe('0 1 * * *');
    });

    it('should return undefined for unknown template', () => {
      const manager = new CronJobManager();
      const template = manager.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('Template Properties', () => {
    it('should have valid template structure', () => {
      const manager = new CronJobManager();
      const templates = manager.listTemplates();

      for (const template of templates) {
        expect(template.id).toBeDefined();
        expect(typeof template.id).toBe('string');
        expect(template.name).toBeDefined();
        expect(typeof template.name).toBe('string');
        expect(template.description).toBeDefined();
        expect(typeof template.description).toBe('string');
        expect(template.command).toBeDefined();
        expect(typeof template.command).toBe('string');
        expect(template.schedule).toBeDefined();
        expect(typeof template.schedule).toBe('string');
        expect(['maintenance', 'backup', 'monitoring', 'data-processing', 'custom']).toContain(template.category);
        expect(Array.isArray(template.tags)).toBe(true);
      }
    });

    it('should have valid priority values', () => {
      const manager = new CronJobManager();
      const templates = manager.listTemplates();

      for (const template of templates) {
        if (template.priority !== undefined) {
          expect(typeof template.priority).toBe('number');
          expect(template.priority).toBeGreaterThanOrEqual(0);
          expect(template.priority).toBeLessThanOrEqual(10);
        }
      }
    });

    it('should have valid timeout values', () => {
      const manager = new CronJobManager();
      const templates = manager.listTemplates();

      for (const template of templates) {
        if (template.timeout !== undefined) {
          expect(typeof template.timeout).toBe('number');
          expect(template.timeout).toBeGreaterThan(0);
        }
      }
    });

    it('should have valid maxRetries values', () => {
      const manager = new CronJobManager();
      const templates = manager.listTemplates();

      for (const template of templates) {
        if (template.maxRetries !== undefined) {
          expect(typeof template.maxRetries).toBe('number');
          expect(template.maxRetries).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Connect/Disconnect', () => {
    it('should have connect method', () => {
      const manager = new CronJobManager();
      expect(typeof manager.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      const manager = new CronJobManager();
      expect(typeof manager.disconnect).toBe('function');
    });

    it('should not throw on disconnect when not connected', () => {
      const manager = new CronJobManager();
      expect(() => manager.disconnect()).not.toThrow();
    });
  });
});
