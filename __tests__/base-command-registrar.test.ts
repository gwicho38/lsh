/**
 * Base Command Registrar Tests
 * Tests for the command registration base class utilities
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { Command } from 'commander';

describe('BaseCommandRegistrar', () => {
  let BaseCommandRegistrar: typeof import('../src/lib/base-command-registrar.js').BaseCommandRegistrar;
  let TestCommandRegistrar: ReturnType<typeof createTestRegistrar>;

  function createTestRegistrar(BaseClass: typeof BaseCommandRegistrar) {
    return class extends BaseClass {
      constructor() {
        super('TestService');
      }

      async register(program: Command): Promise<void> {
        const cmd = this.createCommand(program, 'test', 'Test command');
        this.addSubcommand(cmd, {
          name: 'sub',
          description: 'Test subcommand',
          action: async () => {
            // Action
          }
        });
      }

      // Expose protected methods for testing
      public testParseTags(tagsString: string): string[] {
        return this.parseTags(tagsString);
      }

      public testFormatSchedule(schedule: { cron?: string; interval?: number } | undefined): string {
        return this.formatSchedule(schedule);
      }

      public testValidateRequired(
        options: Record<string, unknown>,
        required: string[],
        commandName?: string
      ): void {
        return this.validateRequired(options, required, commandName);
      }

      public testParseJSON<T = unknown>(jsonString: string, context?: string): T {
        return this.parseJSON<T>(jsonString, context);
      }

      public testLogSuccess(message: string, data?: unknown): void {
        return this.logSuccess(message, data);
      }

      public testLogError(message: string, error?: Error | unknown): void {
        return this.logError(message, error);
      }

      public testLogInfo(message: string): void {
        return this.logInfo(message);
      }

      public testLogWarning(message: string): void {
        return this.logWarning(message);
      }
    };
  }

  beforeAll(async () => {
    const module = await import('../src/lib/base-command-registrar.js');
    BaseCommandRegistrar = module.BaseCommandRegistrar;
    TestCommandRegistrar = createTestRegistrar(BaseCommandRegistrar);
  });

  describe('Constructor', () => {
    it('should create instance with service name', () => {
      const registrar = new TestCommandRegistrar();
      expect(registrar).toBeDefined();
    });
  });

  describe('parseTags', () => {
    it('should parse comma-separated tags', () => {
      const registrar = new TestCommandRegistrar();
      const tags = registrar.testParseTags('tag1,tag2,tag3');
      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should trim whitespace from tags', () => {
      const registrar = new TestCommandRegistrar();
      const tags = registrar.testParseTags('  tag1 , tag2 ,  tag3  ');
      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should filter out empty tags', () => {
      const registrar = new TestCommandRegistrar();
      const tags = registrar.testParseTags('tag1,,tag2,  ,tag3');
      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle single tag', () => {
      const registrar = new TestCommandRegistrar();
      const tags = registrar.testParseTags('single-tag');
      expect(tags).toEqual(['single-tag']);
    });

    it('should return empty array for empty string', () => {
      const registrar = new TestCommandRegistrar();
      const tags = registrar.testParseTags('');
      expect(tags).toEqual([]);
    });
  });

  describe('formatSchedule', () => {
    it('should format cron schedule', () => {
      const registrar = new TestCommandRegistrar();
      const formatted = registrar.testFormatSchedule({ cron: '0 * * * *' });
      expect(formatted).toBe('0 * * * *');
    });

    it('should format interval schedule', () => {
      const registrar = new TestCommandRegistrar();
      const formatted = registrar.testFormatSchedule({ interval: 5000 });
      expect(formatted).toBe('5000ms interval');
    });

    it('should prioritize cron over interval', () => {
      const registrar = new TestCommandRegistrar();
      const formatted = registrar.testFormatSchedule({ cron: '0 * * * *', interval: 5000 });
      expect(formatted).toBe('0 * * * *');
    });

    it('should return "No schedule" for undefined', () => {
      const registrar = new TestCommandRegistrar();
      const formatted = registrar.testFormatSchedule(undefined);
      expect(formatted).toBe('No schedule');
    });

    it('should return "No schedule" for empty object', () => {
      const registrar = new TestCommandRegistrar();
      const formatted = registrar.testFormatSchedule({});
      expect(formatted).toBe('No schedule');
    });
  });

  describe('validateRequired', () => {
    it('should not throw when all required options are present', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => {
        registrar.testValidateRequired(
          { name: 'test', command: 'echo hello' },
          ['name', 'command']
        );
      }).not.toThrow();
    });

    it('should throw when required options are missing', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => {
        registrar.testValidateRequired(
          { name: 'test' },
          ['name', 'command']
        );
      }).toThrow('Missing required options');
    });

    it('should include missing option names in error', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => {
        registrar.testValidateRequired(
          {},
          ['name', 'command']
        );
      }).toThrow('--name, --command');
    });

    it('should include command name in error message', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => {
        registrar.testValidateRequired(
          {},
          ['name'],
          'mycommand'
        );
      }).toThrow('mycommand');
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      const registrar = new TestCommandRegistrar();
      const result = registrar.testParseJSON<{ key: string }>('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON array', () => {
      const registrar = new TestCommandRegistrar();
      const result = registrar.testParseJSON<string[]>('["a", "b", "c"]');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should throw for invalid JSON', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => {
        registrar.testParseJSON('not valid json');
      }).toThrow('Invalid JSON');
    });

    it('should include context in error message', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => {
        registrar.testParseJSON('invalid', 'environment variables');
      }).toThrow('Invalid environment variables');
    });
  });

  describe('createCommand', () => {
    it('should create a command on the program', async () => {
      const registrar = new TestCommandRegistrar();
      const program = new Command();

      await registrar.register(program);

      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('test');
    });
  });

  describe('addSubcommand', () => {
    it('should add subcommand to parent command', async () => {
      const registrar = new TestCommandRegistrar();
      const program = new Command();

      await registrar.register(program);

      const testCmd = program.commands.find(c => c.name() === 'test');
      expect(testCmd).toBeDefined();

      const subcommands = testCmd?.commands.map(c => c.name());
      expect(subcommands).toContain('sub');
    });
  });

  describe('logging methods', () => {
    it('should call logSuccess without throwing', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogSuccess('Test message')).not.toThrow();
    });

    it('should call logSuccess with data object', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogSuccess('Test message', { key: 'value' })).not.toThrow();
    });

    it('should call logSuccess with array data', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogSuccess('Test message', ['item1', 'item2'])).not.toThrow();
    });

    it('should call logSuccess with array of objects', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogSuccess('Test message', [{ a: 1 }, { b: 2 }])).not.toThrow();
    });

    it('should call logSuccess with primitive data', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogSuccess('Test message', 'string data')).not.toThrow();
    });

    it('should call logError without throwing', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogError('Test error')).not.toThrow();
    });

    it('should call logError with Error object', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogError('Test error', new Error('error'))).not.toThrow();
    });

    it('should call logError with non-Error object', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogError('Test error', 'string error')).not.toThrow();
    });

    it('should call logInfo without throwing', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogInfo('Test info')).not.toThrow();
    });

    it('should call logWarning without throwing', () => {
      const registrar = new TestCommandRegistrar();
      expect(() => registrar.testLogWarning('Test warning')).not.toThrow();
    });
  });
});
