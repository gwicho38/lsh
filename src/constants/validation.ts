/**
 * Validation patterns and security rules
 *
 * All validation patterns, security rules, and dangerous command patterns.
 */

import { ERRORS, RISK_LEVELS } from './errors.js';

export interface DangerousPattern {
  pattern: RegExp;
  description: string;
  riskLevel: string;
}

export interface WarningPattern {
  pattern: RegExp;
  description: string;
}

export const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // Critical risk - Filesystem destruction
  {
    pattern: /rm\s+-rf\s+\/(?!\w)/i,
    description: ERRORS.DELETE_ROOT,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
  {
    pattern: /mkfs/i,
    description: ERRORS.MKFS_DETECTED,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
  {
    pattern: /dd\s+.*of=/i,
    description: ERRORS.DD_DETECTED,
    riskLevel: RISK_LEVELS.CRITICAL,
  },

  // High risk - Privilege escalation
  {
    pattern: /sudo\s+su/i,
    description: ERRORS.PRIV_ESCALATION,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    pattern: /sudo\s+.*passwd/i,
    description: ERRORS.PASSWORD_MOD,
    riskLevel: RISK_LEVELS.HIGH,
  },

  // Critical risk - Remote code execution
  {
    pattern: /curl\s+.*\|\s*bash/i,
    description: ERRORS.REMOTE_EXEC_CURL,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
  {
    pattern: /wget\s+.*\|\s*sh/i,
    description: ERRORS.REMOTE_EXEC_WGET,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
  {
    pattern: /nc\s+.*-e/i,
    description: ERRORS.REVERSE_SHELL,
    riskLevel: RISK_LEVELS.CRITICAL,
  },

  // Critical risk - Sensitive file access
  {
    pattern: /cat\s+\/etc\/shadow/i,
    description: ERRORS.READ_SHADOW,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
  {
    pattern: /cat\s+\/etc\/passwd/i,
    description: ERRORS.READ_PASSWD,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    pattern: /\.ssh\/id_rsa/i,
    description: ERRORS.ACCESS_SSH_KEY,
    riskLevel: RISK_LEVELS.CRITICAL,
  },

  // High risk - Process killing
  {
    pattern: /kill\s+-9\s+1\b/i,
    description: ERRORS.KILL_INIT,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
  {
    pattern: /pkill\s+-9\s+.*sshd/i,
    description: ERRORS.KILL_SSHD,
    riskLevel: RISK_LEVELS.HIGH,
  },

  // High risk - Obfuscation attempts
  {
    pattern: /\$\(.*base64.*\)/i,
    description: ERRORS.BASE64_COMMAND,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    pattern: /eval.*\$\(/i,
    description: ERRORS.DYNAMIC_EVAL,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    // Detect null byte injection attacks (legitimate security pattern)
    // eslint-disable-next-line no-control-regex
    pattern: /\x00/i,
    description: ERRORS.NULL_BYTE,
    riskLevel: RISK_LEVELS.CRITICAL,
  },
];

export const WARNING_PATTERNS: WarningPattern[] = [
  {
    pattern: /rm\s+-rf/i,
    description: ERRORS.RECURSIVE_DELETE,
  },
  {
    pattern: /sudo/i,
    description: ERRORS.SUDO_ELEVATED,
  },
  {
    pattern: /chmod\s+777/i,
    description: ERRORS.CHMOD_777,
  },
  {
    pattern: />\s*\/dev\/sda/i,
    description: ERRORS.DISK_WRITE,
  },
  {
    pattern: /curl\s+.*-k/i,
    description: ERRORS.INSECURE_SSL,
  },
  {
    pattern: /:\(\)\{.*:\|:.*\}/i,
    description: ERRORS.FORK_BOMB,
  },
];

export interface SuspiciousCheck {
  test: (command: string) => boolean;
  message: string;
  level: 'medium' | 'high';
}

export const SUSPICIOUS_CHECKS: SuspiciousCheck[] = [
  {
    test: (command: string) => (command.match(/;/g) || []).length > 5,
    message: ERRORS.EXCESSIVE_CHAINING,
    level: 'medium',
  },
  {
    test: (command: string) => (command.match(/\|/g) || []).length > 3,
    message: ERRORS.EXCESSIVE_PIPES,
    level: 'medium',
  },
  {
    test: (command: string) => /\$\([^)]*\$\(/.test(command),
    message: ERRORS.NESTED_SUBSTITUTION,
    level: 'high',
  },
  {
    // eslint-disable-next-line no-control-regex
    test: (command: string) => /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(command),
    message: ERRORS.CONTROL_CHARS,
    level: 'high',
  },
];
