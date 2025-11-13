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

  // High risk - Remote code execution
  {
    pattern: /curl\s+.*\|\s*bash/i,
    description: ERRORS.REMOTE_EXEC_CURL,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    pattern: /wget\s+.*\|\s*sh/i,
    description: ERRORS.REMOTE_EXEC_WGET,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    pattern: /nc\s+.*-e/i,
    description: ERRORS.REVERSE_SHELL,
    riskLevel: RISK_LEVELS.HIGH,
  },

  // High risk - Sensitive file access
  {
    pattern: /cat\s+\/etc\/shadow/i,
    description: ERRORS.READ_SHADOW,
    riskLevel: RISK_LEVELS.HIGH,
  },
  {
    pattern: /cat\s+\/etc\/passwd/i,
    description: ERRORS.READ_PASSWD,
    riskLevel: RISK_LEVELS.MEDIUM,
  },
  {
    pattern: /\.ssh\/id_rsa/i,
    description: ERRORS.ACCESS_SSH_KEY,
    riskLevel: RISK_LEVELS.HIGH,
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

  // Medium risk - Obfuscation attempts
  {
    pattern: /\$\(.*base64.*\)/i,
    description: ERRORS.BASE64_COMMAND,
    riskLevel: RISK_LEVELS.MEDIUM,
  },
  {
    pattern: /eval.*\$\(/i,
    description: ERRORS.DYNAMIC_EVAL,
    riskLevel: RISK_LEVELS.MEDIUM,
  },
  {
    pattern: /\x00/i,
    description: ERRORS.NULL_BYTE,
    riskLevel: RISK_LEVELS.HIGH,
  },
];

export const WARNING_PATTERNS: WarningPattern[] = [
  {
    pattern: /sudo\s+/i,
    description: 'Command uses sudo (elevated privileges)',
  },
  {
    pattern: /rm\s+-rf/i,
    description: 'Force recursive deletion - use with caution',
  },
  {
    pattern: />\s*\/dev\/(sd[a-z]|hd[a-z]|nvme[0-9])/i,
    description: 'Direct disk device access',
  },
  {
    pattern: /chmod\s+777/i,
    description: 'Setting world-writable permissions',
  },
  {
    pattern: /curl.*\|/i,
    description: 'Piping curl output to another command',
  },
  {
    pattern: /wget.*\|/i,
    description: 'Piping wget output to another command',
  },
  {
    pattern: /exec\s+/i,
    description: 'Using exec to replace current process',
  },
];
