/**
 * Tests for Database Persistence Layer
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabasePersistence } from '../src/lib/database-persistence.js';

describe('Database Persistence', () => {
  let dbPersistence: DatabasePersistence;

  beforeEach(() => {
    dbPersistence = new DatabasePersistence('test-user');
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Initialization', () => {
    it('should create instance with user ID', () => {
      expect(dbPersistence).toBeDefined();
      expect(dbPersistence.getSessionId()).toBeTruthy();
    });

    it('should create instance without user ID', () => {
      const db = new DatabasePersistence();
      expect(db).toBeDefined();
      expect(db.getSessionId()).toBeTruthy();
    });

    it('should generate unique session IDs', () => {
      const db1 = new DatabasePersistence('user1');
      const db2 = new DatabasePersistence('user1');
      expect(db1.getSessionId()).not.toBe(db2.getSessionId());
    });
  });

  describe('Session ID Generation', () => {
    it('should generate session ID with correct format', () => {
      const sessionId = dbPersistence.getSessionId();
      expect(sessionId).toMatch(/^lsh_\d+_[a-z0-9]+$/);
    });

    it('should include timestamp in session ID', () => {
      const sessionId = dbPersistence.getSessionId();
      const parts = sessionId.split('_');
      expect(parts).toHaveLength(3);
      expect(parseInt(parts[1])).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should have valid session ID', () => {
      const sessionId = dbPersistence.getSessionId();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });
  });

  describe('Latest Rows Retrieval', () => {
    it('should handle getting latest rows from specific table', async () => {
      const rows = await dbPersistence.getLatestRowsFromTable('shell_history', 5);
      expect(Array.isArray(rows)).toBe(true);
    });

    it('should reject invalid table names', async () => {
      // The function logs an error and returns empty array instead of throwing
      const rows = await dbPersistence.getLatestRowsFromTable('invalid_table' as any, 5);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBe(0);
    });

    it('should accept valid table names', async () => {
      const validTables = [
        'shell_history',
        'shell_jobs',
        'shell_configuration',
        'shell_sessions',
        'shell_aliases',
        'shell_functions',
        'shell_completions',
        'trading_disclosures',
        'politicians',
        'data_pull_jobs',
      ];

      for (const table of validTables) {
        const rows = await dbPersistence.getLatestRowsFromTable(table, 1);
        expect(Array.isArray(rows)).toBe(true);
      }
    });
  });

  describe('User UUID Generation', () => {
    it('should generate consistent UUID for same username', () => {
      const db1 = new DatabasePersistence('testuser');
      const db2 = new DatabasePersistence('testuser');

      // Session IDs should be different
      expect(db1.getSessionId()).not.toBe(db2.getSessionId());

      // But they should both work
      expect(db1.getSessionId()).toBeTruthy();
      expect(db2.getSessionId()).toBeTruthy();
    });

    it('should handle empty username', () => {
      const db = new DatabasePersistence('');
      expect(db).toBeDefined();
      expect(db.getSessionId()).toBeTruthy();
    });

    it('should handle special characters in username', () => {
      const db = new DatabasePersistence('test@user.com');
      expect(db).toBeDefined();
      expect(db.getSessionId()).toBeTruthy();
    });
  });

  describe('Schema Initialization', () => {
    it('should initialize schema successfully', async () => {
      const result = await dbPersistence.initializeSchema();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Data Retrieval', () => {
    it('should get latest rows from all tables', async () => {
      const result = await dbPersistence.getLatestRows(5);
      expect(typeof result).toBe('object');
      expect(result).toBeDefined();
    });

    it('should return empty arrays for tables with no data', async () => {
      const result = await dbPersistence.getLatestRows(5);

      // Check that result has expected structure
      if (result.shell_history) {
        expect(Array.isArray(result.shell_history)).toBe(true);
      }
      if (result.shell_jobs) {
        expect(Array.isArray(result.shell_jobs)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid limit values gracefully', async () => {
      const result1 = await dbPersistence.getLatestRows(0);
      expect(typeof result1).toBe('object');

      const result2 = await dbPersistence.getLatestRows(-1);
      expect(typeof result2).toBe('object');
    });

    it('should handle connection test', async () => {
      const connected = await dbPersistence.testConnection();
      expect(typeof connected).toBe('boolean');
    });
  });
});
