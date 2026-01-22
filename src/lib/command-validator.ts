/**
 * Command Validation Utilities
 * Provides security validation for shell commands
 */

export interface CommandValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationOptions {
  allowDangerousCommands?: boolean;
  maxLength?: number;
  requireWhitelist?: boolean;
  whitelist?: string[];
}

/**
 * Dangerous command patterns that should trigger warnings or blocks
 */
const DANGEROUS_PATTERNS = [
  // System modification
  { pattern: /rm\s+-rf\s+\/(?!\w)/i, message: 'Attempting to delete root filesystem', level: 'critical' as const },
  { pattern: /mkfs/i, message: 'Filesystem formatting command detected', level: 'critical' as const },
  { pattern: /dd\s+.*of=/i, message: 'Direct disk write detected', level: 'critical' as const },

  // Privilege escalation
  { pattern: /sudo\s+su/i, message: 'Privilege escalation attempt', level: 'high' as const },
  { pattern: /sudo\s+.*passwd/i, message: 'Password modification attempt', level: 'high' as const },

  // Network exfiltration
  { pattern: /curl\s+.*\|\s*bash/i, message: 'Remote code execution via curl', level: 'critical' as const },
  { pattern: /wget\s+.*\|\s*sh/i, message: 'Remote code execution via wget', level: 'critical' as const },
  { pattern: /nc\s+.*-e/i, message: 'Reverse shell attempt with netcat', level: 'critical' as const },

  // Data exfiltration
  { pattern: /cat\s+\/etc\/shadow/i, message: 'Attempting to read shadow password file', level: 'critical' as const },
  { pattern: /cat\s+\/etc\/passwd/i, message: 'Attempting to read user account file', level: 'high' as const },
  { pattern: /\.ssh\/id_rsa/i, message: 'Attempting to access SSH private keys', level: 'critical' as const },

  // Process manipulation
  { pattern: /kill\s+-9\s+1\b/i, message: 'Attempting to kill init process', level: 'critical' as const },
  { pattern: /pkill\s+-9\s+.*sshd/i, message: 'Attempting to kill SSH daemon', level: 'high' as const },

  // Obfuscation attempts
  { pattern: /\$\(.*base64.*\)/i, message: 'Base64 encoded command detected', level: 'high' as const },
  { pattern: /eval.*\$\(/i, message: 'Dynamic command evaluation detected', level: 'high' as const },
  // eslint-disable-next-line no-control-regex
  { pattern: /\x00/i, message: 'Null byte injection detected', level: 'critical' as const },
];

/**
 * Patterns that should trigger warnings but might be legitimate
 */
const WARNING_PATTERNS = [
  { pattern: /rm\s+-rf/i, message: 'Recursive deletion command' },
  { pattern: /sudo/i, message: 'Elevated privileges requested' },
  { pattern: /chmod\s+777/i, message: 'Overly permissive file permissions' },
  { pattern: />\s*\/dev\/sda/i, message: 'Writing to disk device' },
  { pattern: /curl\s+.*-k/i, message: 'Insecure SSL certificate validation disabled' },
  { pattern: /:\(\)\{.*:\|:.*\}/i, message: 'Fork bomb pattern detected' },
];

/**
 * Validate a shell command for security issues
 */
// TODO(@gwicho38): Review - validateCommand
export function validateCommand(
  command: string,
  options: ValidationOptions = {}
): CommandValidationResult {
  const {
    allowDangerousCommands = false,
    maxLength = 10000,
    requireWhitelist = false,
    whitelist = []
  } = options;

  const result: CommandValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    riskLevel: 'low'
  };

  // Basic validation
  if (!command || typeof command !== 'string') {
    result.isValid = false;
    result.errors.push('Command must be a non-empty string');
    result.riskLevel = 'high';
    return result;
  }

  if (command.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Command cannot be empty or whitespace only');
    result.riskLevel = 'high';
    return result;
  }

  if (command.length > maxLength) {
    result.isValid = false;
    result.errors.push(`Command exceeds maximum length of ${maxLength} characters`);
    result.riskLevel = 'high';
    return result;
  }

  // Whitelist validation
  if (requireWhitelist) {
    const commandName = command.trim().split(/\s+/)[0];
    if (!whitelist.includes(commandName)) {
      result.isValid = false;
      result.errors.push(`Command '${commandName}' is not in whitelist`);
      result.riskLevel = 'high';
      return result;
    }
  }

  // Check for dangerous patterns
  for (const { pattern, message, level } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      if (!allowDangerousCommands) {
        result.isValid = false;
        result.errors.push(`BLOCKED: ${message}`);
        result.riskLevel = level;
      } else {
        result.warnings.push(`${message} (allowed by configuration)`);
        if (level === 'critical' || level === 'high') {
          result.riskLevel = level;
        }
      }
    }
  }

  // Check for warning patterns
  for (const { pattern, message } of WARNING_PATTERNS) {
    if (pattern.test(command)) {
      result.warnings.push(message);
      if (result.riskLevel === 'low') {
        result.riskLevel = 'medium';
      }
    }
  }

  // Additional checks for suspicious patterns
  const suspiciousChecks = [
    {
      test: () => (command.match(/;/g) || []).length > 5,
      message: 'Excessive command chaining detected',
      level: 'medium' as const
    },
    {
      test: () => (command.match(/\|/g) || []).length > 3,
      message: 'Excessive pipe usage detected',
      level: 'medium' as const
    },
    {
      test: () => /\$\([^)]*\$\(/.test(command),
      message: 'Nested command substitution detected',
      level: 'high' as const
    },
    {
      // eslint-disable-next-line no-control-regex
      test: () => /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(command),
      message: 'Control characters detected in command',
      level: 'high' as const
    }
  ];

  for (const check of suspiciousChecks) {
    if (check.test()) {
      result.warnings.push(check.message);
      if (check.level === 'high' && result.riskLevel !== 'critical') {
        result.riskLevel = check.level;
      } else if (check.level === 'medium' && result.riskLevel === 'low') {
        result.riskLevel = check.level;
      }
    }
  }

  return result;
}

/**
 * Sanitize a string for use as a shell argument
 * Note: This should be used for individual arguments, not full commands
 */
// TODO(@gwicho38): Review - sanitizeShellArgument
export function sanitizeShellArgument(arg: string): string {
  // Escape dangerous shell characters
  return arg.replace(/([;&|`$(){}[\]\\<>'"*?~])/g, '\\$1');
}

/**
 * Quote a string for safe use in shell commands
 */
// TODO(@gwicho38): Review - quoteForShell
export function quoteForShell(str: string): string {
  // Use single quotes to prevent expansion, escape any single quotes in the string
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Parse command and extract the base command name
 */
// TODO(@gwicho38): Review - getCommandName
export function getCommandName(command: string): string {
  const trimmed = command.trim();
  // Handle sudo and other prefixes
  const parts = trimmed.split(/\s+/);
  let cmdIndex = 0;

  // Handle 'sudo' prefix
  if (parts[0] === 'sudo') {
    cmdIndex = 1;
  }
  // Handle 'env' prefix with environment variables
  else if (parts[0] === 'env') {
    // Skip environment variable assignments (VAR=value format)
    cmdIndex = 1;
    while (cmdIndex < parts.length && parts[cmdIndex].includes('=')) {
      cmdIndex++;
    }
  }

  const cmdPart = parts[cmdIndex] || '';
  // Remove path if present
  return cmdPart.split('/').pop() || '';
}

export default {
  validateCommand,
  sanitizeShellArgument,
  quoteForShell,
  getCommandName
};
