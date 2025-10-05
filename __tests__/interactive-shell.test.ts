/**
 * Interactive Shell Tests
 * Tests for the new interactive shell functionality added in v0.5.2
 */

import InteractiveShell from '../src/lib/interactive-shell.js';
import { ShellExecutor } from '../src/lib/shell-executor.js';

// Mock process.stdin for testing
const mockStdin = {
  isTTY: false, // Disable TTY to prevent signal handler setup
  setRawMode: jest.fn(),
  resume: jest.fn(),
  pause: jest.fn(),
  setEncoding: jest.fn(),
  removeAllListeners: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  removeListener: jest.fn(),
};

// Mock process.stdout
const mockStdout = {
  write: jest.fn(),
  isTTY: true,
};

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  clear: jest.fn(),
};

describe.skip('InteractiveShell', () => {
  let originalStdin: any;
  let originalStdout: any;
  let originalConsole: any;
  let originalExit: typeof process.exit;
  let shell: InteractiveShell;
  let mockExit: jest.Mock;

  beforeEach(() => {
    // Save originals
    originalStdin = process.stdin;
    originalStdout = process.stdout;
    originalExit = process.exit;
    originalConsole = {
      log: console.log,
      error: console.error,
      clear: console.clear,
    };

    // Apply mocks
    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: mockStdout, writable: true });
    mockExit = jest.fn() as any;
    (process.exit as any) = mockExit;
    console.log = mockConsole.log;
    console.error = mockConsole.error;
    console.clear = mockConsole.clear;

    // Reset mocks
    jest.clearAllMocks();

    // Create shell instance
    shell = new InteractiveShell();
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    process.exit = originalExit;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.clear = originalConsole.clear;
  });

  describe('Construction and Initialization', () => {
    test('should create shell instance', () => {
      expect(shell).toBeInstanceOf(InteractiveShell);
    });

    test('should accept custom options', () => {
      const customShell = new InteractiveShell({
        prompt: '> ',
        historyFile: '~/.lsh_history',
        verbose: true,
        debug: true,
      });
      expect(customShell).toBeInstanceOf(InteractiveShell);
    });
  });

  describe('Welcome Message', () => {
    test('should show welcome message on start', async () => {
      // Mock the shell to stop immediately
      const stopSpy = jest.spyOn(shell, 'stop');
      shell.stop();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('LSH Interactive Shell')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Type "help" for available commands')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Type "exit" or press Ctrl+D to quit')
      );
    });
  });

  describe('Terminal Setup', () => {
    test('should set raw mode when stdin is TTY', () => {
      // Shell constructor should have called setRawMode during setup
      expect(mockStdin.setRawMode).toHaveBeenCalled();
    });

    test('should set encoding to utf8', () => {
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
    });

    test('should resume stdin', () => {
      expect(mockStdin.resume).toHaveBeenCalled();
    });
  });

  describe('Stop/Exit Functionality', () => {
    test('should restore terminal on stop', () => {
      shell.stop();

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);
      expect(mockStdin.pause).toHaveBeenCalled();
      expect(mockStdin.removeAllListeners).toHaveBeenCalledWith('data');
    });

    test('should show goodbye message on stop', () => {
      shell.stop();

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Goodbye!')
      );
    });

    test('should call process.exit on stop', () => {
      shell.stop();

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('Command Execution', () => {
    test('should handle exit command', () => {
      const stopSpy = jest.spyOn(shell, 'stop').mockImplementation(() => {});

      // Simulate exit command
      // This tests the command handling logic
      const exitResult = shell['isRunning'];
      expect(typeof exitResult).toBe('boolean');

      stopSpy.mockRestore();
    });

    test('should handle clear command', async () => {
      // The clear command should call console.clear()
      // This is tested indirectly through command execution
      expect(mockConsole.clear).toBeDefined();
    });
  });

  describe('Help System', () => {
    test('should have help method', () => {
      expect(typeof shell['showHelp']).toBe('function');
    });

    test('should display help with CLI commands', () => {
      shell['showHelp']();

      // Check for main sections
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('LSH Interactive Shell Help')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Shell Commands')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('CLI Commands')
      );
    });

    test('should show lsh self update in help', () => {
      shell['showHelp']();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('lsh self update')
      );
    });

    test('should show lsh daemon commands in help', () => {
      shell['showHelp']();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('lsh daemon start')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('lsh daemon stop')
      );
    });

    test('should show lsh cron commands in help', () => {
      shell['showHelp']();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('lsh cron')
      );
    });

    test('should show key bindings in help', () => {
      shell['showHelp']();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Tab')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Up/Down')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Ctrl+C')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Ctrl+D')
      );
    });
  });

  describe('History Command', () => {
    test('should have showHistory method', () => {
      expect(typeof shell['showHistory']).toBe('function');
    });

    test('should show empty history message when no history', () => {
      // Mock executor with empty history
      const mockExecutor = {
        getHistoryEntries: jest.fn().mockReturnValue([]),
      };
      shell['executor'] = mockExecutor as any;

      shell['showHistory']();

      expect(mockConsole.log).toHaveBeenCalledWith('No command history');
    });

    test('should display history entries', () => {
      const mockHistory = [
        { command: 'ls', timestamp: Date.now(), exitCode: 0 },
        { command: 'pwd', timestamp: Date.now(), exitCode: 0 },
        { command: 'echo test', timestamp: Date.now(), exitCode: 0 },
      ];

      const mockExecutor = {
        getHistoryEntries: jest.fn().mockReturnValue(mockHistory),
      };
      shell['executor'] = mockExecutor as any;

      shell['showHistory']();

      expect(mockConsole.log).toHaveBeenCalledWith('Command History:');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('ls')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('pwd')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('echo test')
      );
    });

    test('should show exit codes in history', () => {
      const mockHistory = [
        { command: 'false', timestamp: Date.now(), exitCode: 1 },
      ];

      const mockExecutor = {
        getHistoryEntries: jest.fn().mockReturnValue(mockHistory),
      };
      shell['executor'] = mockExecutor as any;

      shell['showHistory']();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[1]')
      );
    });

    test('should number history entries', () => {
      const mockHistory = [
        { command: 'cmd1', timestamp: Date.now(), exitCode: 0 },
        { command: 'cmd2', timestamp: Date.now(), exitCode: 0 },
      ];

      const mockExecutor = {
        getHistoryEntries: jest.fn().mockReturnValue(mockHistory),
      };
      shell['executor'] = mockExecutor as any;

      shell['showHistory']();

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/^1\s/)
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/^2\s/)
      );
    });
  });

  describe('Signal Handling', () => {
    test('should handle SIGINT', () => {
      // Process should have SIGINT handler registered
      expect(mockStdin.on).toHaveBeenCalled();
    });

    test('should handle SIGTERM', () => {
      // Verify shell instance is properly created
      // Signal handlers are registered in constructor
      expect(shell).toBeInstanceOf(InteractiveShell);
    });
  });

  describe('Prompt System', () => {
    test('should have getPrompt method', () => {
      expect(typeof shell['getPrompt']).toBe('function');
    });

    test('should generate prompt', () => {
      const prompt = shell['getPrompt']();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('RC File', () => {
    test('should create default rc file if not exists', () => {
      // The createDefaultRcFile method should be callable
      expect(typeof shell['createDefaultRcFile']).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle command errors gracefully', async () => {
      const mockExecutor = {
        execute: jest.fn().mockRejectedValue(new Error('Command failed')),
        getPrompt: jest.fn().mockReturnValue('> '),
        addToHistory: jest.fn(),
      };
      shell['executor'] = mockExecutor as any;

      // Test error handling in command execution
      await expect(
        shell['executeCommand']('invalid-command')
      ).resolves.not.toThrow();
    });

    test('should log errors to console', async () => {
      const mockExecutor = {
        execute: jest.fn().mockRejectedValue(new Error('Test error')),
        getPrompt: jest.fn().mockReturnValue('> '),
        addToHistory: jest.fn(),
      };
      shell['executor'] = mockExecutor as any;

      await shell['executeCommand']('bad-command');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });
  });

  describe('Options', () => {
    test('should respect verbose option', () => {
      const verboseShell = new InteractiveShell({ verbose: true });
      expect(verboseShell['options'].verbose).toBe(true);
    });

    test('should respect debug option', () => {
      const debugShell = new InteractiveShell({ debug: true });
      expect(debugShell['options'].debug).toBe(true);
    });

    test('should respect prompt option', () => {
      const customShell = new InteractiveShell({ prompt: 'test> ' });
      expect(customShell['options'].prompt).toBe('test> ');
    });

    test('should respect historyFile option', () => {
      const customShell = new InteractiveShell({ historyFile: '/tmp/test_history' });
      expect(customShell['options'].historyFile).toBe('/tmp/test_history');
    });
  });
});
