import { describe, it, expect } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Test utilities that are commonly used across the codebase
describe('Utility Functions', () => {
  describe('Path utilities', () => {
    it('should convert file URL to path correctly', () => {
      const fileUrl = 'file:///Users/test/project/file.js';
      const filePath = fileURLToPath(fileUrl);
      expect(filePath).toBe('/Users/test/project/file.js');
    });

    it('should get directory name correctly', () => {
      const filePath = '/Users/test/project/file.js';
      const dirName = dirname(filePath);
      expect(dirName).toBe('/Users/test/project');
    });
  });

  describe('Data validation helpers', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should sanitize strings for shell commands', () => {
      const sanitizeForShell = (input: string): string => {
        return input.replace(/[;&|`$(){}[\]\\]/g, '\\$&');
      };

      expect(sanitizeForShell('normal string')).toBe('normal string');
      expect(sanitizeForShell('rm -rf /')).toBe('rm -rf /');
      expect(sanitizeForShell('test; rm -rf /')).toBe('test\\; rm -rf /');
      expect(sanitizeForShell('test && echo "hack"')).toBe('test \\&\\& echo "hack"');
    });

    it('should validate job names', () => {
      const isValidJobName = (name: string): boolean => {
        return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length <= 100;
      };

      expect(isValidJobName('valid-job-name')).toBe(true);
      expect(isValidJobName('valid_job_name')).toBe(true);
      expect(isValidJobName('ValidJobName123')).toBe(true);
      expect(isValidJobName('')).toBe(false);
      expect(isValidJobName('invalid job name')).toBe(false);
      expect(isValidJobName('invalid@job')).toBe(false);
    });
  });

  describe('Error handling utilities', () => {
    it('should format error messages consistently', () => {
      const formatError = (error: unknown): string => {
        if (error instanceof Error) {
          return `${error.name}: ${error.message}`;
        }
        return String(error);
      };

      const testError = new Error('Test error message');
      testError.name = 'TestError';

      expect(formatError(testError)).toBe('TestError: Test error message');
      expect(formatError('String error')).toBe('String error');
      expect(formatError(null)).toBe('null');
      expect(formatError(undefined)).toBe('undefined');
    });

    it('should create safe error objects for API responses', () => {
      const createSafeError = (error: unknown) => {
        const safeError: { error: string; type?: string } = {
          error: 'Unknown error occurred'
        };

        if (error instanceof Error) {
          safeError.error = error.message;
          safeError.type = error.name;
        } else if (typeof error === 'string') {
          safeError.error = error;
        }

        return safeError;
      };

      const testError = new Error('Database connection failed');
      testError.name = 'DatabaseError';

      expect(createSafeError(testError)).toEqual({
        error: 'Database connection failed',
        type: 'DatabaseError'
      });

      expect(createSafeError('String error')).toEqual({
        error: 'String error'
      });

      expect(createSafeError(null)).toEqual({
        error: 'Unknown error occurred'
      });
    });
  });

  describe('Async utilities', () => {
    it('should implement retry logic', async () => {
      const retryWithBackoff = async <T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 100
      ): Promise<T> => {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
              throw lastError;
            }

            // Exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        throw lastError!;
      };

      // Test successful execution
      let callCount = 0;
      const successFn = async () => {
        callCount++;
        return 'success';
      };

      const result = await retryWithBackoff(successFn, 3, 10);
      expect(result).toBe('success');
      expect(callCount).toBe(1);

      // Test retry logic
      let failCount = 0;
      const failTwiceThenSucceed = async () => {
        failCount++;
        if (failCount <= 2) {
          throw new Error('Temporary failure');
        }
        return 'eventual success';
      };

      failCount = 0;
      const retryResult = await retryWithBackoff(failTwiceThenSucceed, 3, 10);
      expect(retryResult).toBe('eventual success');
      expect(failCount).toBe(3);

      // Test final failure
      const alwaysFailFn = async () => {
        throw new Error('Always fails');
      };

      await expect(retryWithBackoff(alwaysFailFn, 2, 10))
        .rejects
        .toThrow('Always fails');
    });

    it('should handle timeout correctly', async () => {
      const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
          }, timeoutMs);

          promise
            .then(resolve)
            .catch(reject)
            .finally(() => clearTimeout(timeoutId));
        });
      };

      // Test successful completion within timeout
      const quickPromise = new Promise(resolve => setTimeout(() => resolve('quick'), 50));
      const quickResult = await withTimeout(quickPromise, 100);
      expect(quickResult).toBe('quick');

      // Test timeout
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 200));
      await expect(withTimeout(slowPromise, 100))
        .rejects
        .toThrow('Operation timed out after 100ms');
    });
  });

  describe('Environment utilities', () => {
    it('should parse boolean environment variables', () => {
      const parseBoolEnv = (value: string | undefined): boolean => {
        if (!value) return false;
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
      };

      expect(parseBoolEnv('true')).toBe(true);
      expect(parseBoolEnv('TRUE')).toBe(true);
      expect(parseBoolEnv('1')).toBe(true);
      expect(parseBoolEnv('yes')).toBe(true);
      expect(parseBoolEnv('on')).toBe(true);
      expect(parseBoolEnv('false')).toBe(false);
      expect(parseBoolEnv('0')).toBe(false);
      expect(parseBoolEnv('no')).toBe(false);
      expect(parseBoolEnv('')).toBe(false);
      expect(parseBoolEnv(undefined)).toBe(false);
    });

    it('should get environment variables with defaults', () => {
      const getEnvWithDefault = (key: string, defaultValue: string): string => {
        return process.env[key] || defaultValue;
      };

      // Test with existing env var
      process.env.TEST_VAR = 'test_value';
      expect(getEnvWithDefault('TEST_VAR', 'default')).toBe('test_value');

      // Test with missing env var
      delete process.env.TEST_VAR;
      expect(getEnvWithDefault('TEST_VAR', 'default')).toBe('default');
    });
  });
});