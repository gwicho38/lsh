/**
 * Test helpers for secrets management tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { glob } from 'glob';

/**
 * Create a temporary .env file with given content
 * Creates files like .env.test-prefix-timestamp-random
 */
export function createTempEnvFile(content: string, prefix: string = 'test-env'): string {
  const tempPath = path.join(os.tmpdir(), `.env.${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  fs.writeFileSync(tempPath, content, 'utf8');
  return tempPath;
}

/**
 * Clean up temporary files matching patterns
 */
export function cleanupTempFiles(patterns: string[]): void {
  patterns.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });
}

/**
 * Generate a test encryption key (32-byte hex)
 */
export function generateTestKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a test environment with cleanup
 */
export class TestEnvironment {
  private tempFiles: string[] = [];
  private originalEnv: Record<string, string | undefined> = {};

  /**
   * Create a temp file and track it for cleanup
   */
  createTempFile(content: string, prefix: string = 'test'): string {
    const filePath = createTempEnvFile(content, prefix);
    this.tempFiles.push(filePath);
    return filePath;
  }

  /**
   * Set environment variable and remember original
   */
  setEnv(key: string, value: string): void {
    if (!(key in this.originalEnv)) {
      this.originalEnv[key] = process.env[key];
    }
    process.env[key] = value;
  }

  /**
   * Clean up all temp files and restore environment
   */
  cleanup(): void {
    // Clean up temp files
    this.tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      // Also clean up any .backup files
      glob.sync(`${file}.backup.*`).forEach(backup => {
        if (fs.existsSync(backup)) {
          fs.unlinkSync(backup);
        }
      });
    });
    this.tempFiles = [];

    // Restore environment
    for (const [key, value] of Object.entries(this.originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    this.originalEnv = {};
  }
}

/**
 * Parse .env file content into object (matches SecretsManager implementation)
 */
export function parseEnvContent(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.trim().startsWith('#') || !line.trim()) {
      continue;
    }

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }
  }

  return env;
}

/**
 * Wait for async operations to complete
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
