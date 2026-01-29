/**
 * Command Validation Utilities
 * Provides security validation for shell commands
 */

import {
  DANGEROUS_PATTERNS,
  WARNING_PATTERNS,
  SUSPICIOUS_CHECKS,
} from '../constants/validation.js';
import { ERRORS } from '../constants/errors.js';

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
 * Validate a shell command for security issues
 */
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
    result.errors.push(ERRORS.COMMAND_EMPTY_STRING);
    result.riskLevel = 'high';
    return result;
  }

  if (command.trim().length === 0) {
    result.isValid = false;
    result.errors.push(ERRORS.COMMAND_WHITESPACE_ONLY);
    result.riskLevel = 'high';
    return result;
  }

  if (command.length > maxLength) {
    result.isValid = false;
    result.errors.push(ERRORS.COMMAND_TOO_LONG.replace('${maxLength}', String(maxLength)));
    result.riskLevel = 'high';
    return result;
  }

  // Whitelist validation
  if (requireWhitelist) {
    const commandName = command.trim().split(/\s+/)[0];
    if (!whitelist.includes(commandName)) {
      result.isValid = false;
      result.errors.push(ERRORS.COMMAND_NOT_WHITELISTED.replace('${commandName}', commandName));
      result.riskLevel = 'high';
      return result;
    }
  }

  // Check for dangerous patterns (imported from constants/validation.ts)
  for (const { pattern, description, riskLevel } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      const level = riskLevel as 'low' | 'medium' | 'high' | 'critical';
      if (!allowDangerousCommands) {
        result.isValid = false;
        result.errors.push(`BLOCKED: ${description}`);
        result.riskLevel = level;
      } else {
        result.warnings.push(`${description} (allowed by configuration)`);
        if (level === 'critical' || level === 'high') {
          result.riskLevel = level;
        }
      }
    }
  }

  // Check for warning patterns (imported from constants/validation.ts)
  for (const { pattern, description } of WARNING_PATTERNS) {
    if (pattern.test(command)) {
      result.warnings.push(description);
      if (result.riskLevel === 'low') {
        result.riskLevel = 'medium';
      }
    }
  }

  // Additional checks for suspicious patterns (imported from constants/validation.ts)
  for (const check of SUSPICIOUS_CHECKS) {
    if (check.test(command)) {
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
export function sanitizeShellArgument(arg: string): string {
  // Escape dangerous shell characters
  return arg.replace(/([;&|`$(){}[\]\\<>'"*?~])/g, '\\$1');
}

/**
 * Quote a string for safe use in shell commands
 */
export function quoteForShell(str: string): string {
  // Use single quotes to prevent expansion, escape any single quotes in the string
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Parse command and extract the base command name
 */
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
