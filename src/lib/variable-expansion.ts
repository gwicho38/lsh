/**
 * POSIX Parameter and Variable Expansion Implementation
 * Implements POSIX.1-2017 Section 2.6 Parameter Expansion
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// We'll import ShellOptions from shell-executor to avoid duplication
export interface ShellOptions {
  errexit: boolean;    // set -e: exit on error
  nounset: boolean;    // set -u: error on unset variables
  xtrace: boolean;     // set -x: print commands before execution
  verbose: boolean;    // set -v: print shell input lines
  noglob: boolean;     // set -f: disable pathname expansion
  monitor: boolean;    // set -m: enable job control
  noclobber: boolean;  // set -C: don't overwrite files with >
  allexport: boolean;  // set -a: export all variables
}

export interface VariableContext {
  variables: Record<string, string>;
  env: Record<string, string>;
  positionalParams: string[];
  specialParams: {
    '$': string;    // Process ID
    '?': string;    // Last exit status
    '#': string;    // Number of positional parameters
    '*': string;    // All positional parameters (joined)
    '@': string[];  // All positional parameters (array)
    '!': string;    // Process ID of last background command
    '0': string;    // Shell name
    '-': string;    // Shell options
  };
  options?: ShellOptions; // Optional shell options
}

export class VariableExpander {
  private context: VariableContext;

  constructor(context: VariableContext) {
    this.context = context;
  }

  public updateContext(updates: Partial<VariableContext>): void {
    this.context = { ...this.context, ...updates };
  }

  public async expandString(input: string): Promise<string> {
    let result = input;
    
    // Process in order: parameter expansion, command substitution, arithmetic expansion
    result = await this.processParameterExpansion(result);
    result = await this.processCommandSubstitution(result);
    result = await this.processArithmeticExpansion(result);
    
    return result;
  }

  private async processParameterExpansion(input: string): Promise<string> {
    // Handle ${parameter} and $parameter forms
    // More comprehensive regex to handle all parameter expansion forms
    const paramRegex = /\$\{([^}]+)\}|\$([a-zA-Z_][a-zA-Z0-9_]*|\d+|[*@#?$!-])/g;
    
    let result = input;
    
    // Process all matches from right to left to avoid index shifting issues
    const matches = Array.from(input.matchAll(paramRegex));
    
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const fullMatch = match[0];
      const paramExpr = match[1] || match[2];
      const startIndex = match.index!;
      const endIndex = startIndex + fullMatch.length;
      
      const expandedValue = await this.expandParameter(paramExpr);
      
      // Replace the match with the expanded value
      result = result.slice(0, startIndex) + expandedValue + result.slice(endIndex);
    }
    
    return result;
  }

  private async expandParameter(paramExpr: string): Promise<string> {
    // Handle different parameter expansion forms

    // String length: ${#VAR}
    if (paramExpr.startsWith('#')) {
      return this.handleStringLength(paramExpr.substring(1));
    }

    // Substring extraction: ${VAR:offset:length}
    if (paramExpr.match(/^[^:]+:-?\d+/)) {
      return this.handleSubstring(paramExpr);
    }

    // Case conversion: ${VAR^}, ${VAR,}, ${VAR^^}, ${VAR,,}
    if (paramExpr.match(/\^+$|\,+$/)) {
      return this.handleCaseConversion(paramExpr);
    }

    // Check for parameter expansion operators
    if (paramExpr.includes(':-')) {
      return this.handleDefaultValue(paramExpr, ':-');
    } else if (paramExpr.includes(':=')) {
      return this.handleAssignDefault(paramExpr, ':=');
    } else if (paramExpr.includes(':?')) {
      return this.handleErrorIfNull(paramExpr, ':?');
    } else if (paramExpr.includes(':+')) {
      return this.handleAlternativeValue(paramExpr, ':+');
    } else if (paramExpr.includes('%')) {
      return this.handleSuffixRemoval(paramExpr);
    } else if (paramExpr.includes('#')) {
      return this.handlePrefixRemoval(paramExpr);
    } else {
      // Simple parameter expansion
      return this.getParameterValue(paramExpr);
    }
  }

  private getParameterValue(param: string): string {
    // Handle special parameters
    if (param in this.context.specialParams) {
      const value = this.context.specialParams[param as keyof typeof this.context.specialParams];
      return Array.isArray(value) ? value.join(' ') : value;
    }

    // Handle positional parameters
    if (/^\d+$/.test(param)) {
      const index = parseInt(param, 10);
      if (index === 0) return this.context.specialParams['0'];
      const value = this.context.positionalParams[index - 1];

      // Implement set -u (nounset): error on unset parameters
      if (this.context.options?.nounset && value === undefined) {
        throw new Error(`${param}: parameter not set`);
      }

      return value || '';
    }

    // Handle regular variables
    const value = this.context.variables[param] || this.context.env[param];

    // Implement set -u (nounset): error on unset variables
    if (this.context.options?.nounset && value === undefined && !(param in this.context.variables) && !(param in this.context.env)) {
      throw new Error(`${param}: parameter not set`);
    }

    return value || '';
  }

  private handleDefaultValue(paramExpr: string, operator: string): string {
    const parts = paramExpr.split(operator);
    const param = parts[0].trim();
    const defaultValue = parts.slice(1).join(operator).trim();
    const value = this.getParameterValue(param);
    
    // Use default if parameter is unset or null (for :- operator)
    return (value === '' || value === undefined) ? (defaultValue || '') : value;
  }

  private handleAssignDefault(paramExpr: string, operator: string): string {
    const parts = paramExpr.split(operator);
    const param = parts[0].trim();
    const defaultValue = parts.slice(1).join(operator).trim();
    let value = this.getParameterValue(param);
    
    // Assign default if parameter is unset or null
    if (value === '' || value === undefined) {
      value = defaultValue || '';
      this.context.variables[param] = value;
    }
    
    return value;
  }

  private handleErrorIfNull(paramExpr: string, operator: string): string {
    const parts = paramExpr.split(operator);
    const param = parts[0].trim();
    const errorMessage = parts.slice(1).join(operator).trim();
    const value = this.getParameterValue(param);
    
    if (value === '' || value === undefined) {
      const message = errorMessage || `${param}: parameter null or not set`;
      throw new Error(message);
    }
    
    return value;
  }

  private handleAlternativeValue(paramExpr: string, operator: string): string {
    const parts = paramExpr.split(operator);
    const param = parts[0].trim();
    const altValue = parts.slice(1).join(operator).trim();
    const value = this.getParameterValue(param);
    
    // Use alternative value if parameter is set and not null
    return (value !== '' && value !== undefined) ? (altValue || '') : '';
  }

  private handleSuffixRemoval(paramExpr: string): string {
    const isLongest = paramExpr.includes('%%');
    const operator = isLongest ? '%%' : '%';
    const [param, pattern] = paramExpr.split(operator, 2);
    
    const value = this.getParameterValue(param);
    if (!value) return '';
    
    return this.removeSuffix(value, pattern, isLongest);
  }

  private handlePrefixRemoval(paramExpr: string): string {
    const isLongest = paramExpr.includes('##');
    const operator = isLongest ? '##' : '#';
    const [param, pattern] = paramExpr.split(operator, 2);
    
    const value = this.getParameterValue(param);
    if (!value) return '';
    
    return this.removePrefix(value, pattern, isLongest);
  }

  private removeSuffix(value: string, pattern: string, longest: boolean): string {
    const regex = this.patternToRegex(pattern);
    if (longest) {
      // Find longest matching suffix
      for (let i = 0; i < value.length; i++) {
        const suffix = value.slice(i);
        if (regex.test(suffix)) {
          return value.slice(0, i);
        }
      }
    } else {
      // Find shortest matching suffix
      for (let i = value.length; i > 0; i--) {
        const suffix = value.slice(i - 1);
        if (regex.test(suffix)) {
          return value.slice(0, i - 1);
        }
      }
    }
    return value;
  }

  private removePrefix(value: string, pattern: string, longest: boolean): string {
    const regex = this.patternToRegex(pattern);
    if (longest) {
      // Find longest matching prefix
      for (let i = value.length; i > 0; i--) {
        const prefix = value.slice(0, i);
        if (regex.test(prefix)) {
          return value.slice(i);
        }
      }
    } else {
      // Find shortest matching prefix
      for (let i = 1; i <= value.length; i++) {
        const prefix = value.slice(0, i);
        if (regex.test(prefix)) {
          return value.slice(i);
        }
      }
    }
    return value;
  }

  private handleStringLength(param: string): string {
    const value = this.getParameterValue(param);
    return value.length.toString();
  }

  private handleSubstring(paramExpr: string): string {
    // Parse ${VAR:offset:length} or ${VAR:offset}
    const match = paramExpr.match(/^([^:]+):(-?\d+)(?::(\d+))?$/);
    if (!match) {
      // Invalid format, return empty
      return '';
    }

    const [, param, offsetStr, lengthStr] = match;
    const value = this.getParameterValue(param);
    let offset = parseInt(offsetStr, 10);

    // Handle negative offset (from end of string)
    if (offset < 0) {
      offset = value.length + offset;
      if (offset < 0) offset = 0;
    }

    if (lengthStr) {
      const length = parseInt(lengthStr, 10);
      return value.substring(offset, offset + length);
    } else {
      return value.substring(offset);
    }
  }

  private handleCaseConversion(paramExpr: string): string {
    // Handle ${VAR^}, ${VAR,}, ${VAR^^}, ${VAR,,}
    let operator = '';
    let param = paramExpr;

    if (paramExpr.endsWith('^^')) {
      operator = '^^';
      param = paramExpr.slice(0, -2);
    } else if (paramExpr.endsWith('^')) {
      operator = '^';
      param = paramExpr.slice(0, -1);
    } else if (paramExpr.endsWith(',,')) {
      operator = ',,';
      param = paramExpr.slice(0, -2);
    } else if (paramExpr.endsWith(',')) {
      operator = ',';
      param = paramExpr.slice(0, -1);
    }

    const value = this.getParameterValue(param);

    switch (operator) {
      case '^':
        // Uppercase first character
        return value.charAt(0).toUpperCase() + value.slice(1);
      case '^^':
        // Uppercase all characters
        return value.toUpperCase();
      case ',':
        // Lowercase first character
        return value.charAt(0).toLowerCase() + value.slice(1);
      case ',,':
        // Lowercase all characters
        return value.toLowerCase();
      default:
        return value;
    }
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert shell pattern to regex
    const regex = pattern
      .replace(/\*/g, '.*')       // * matches any string
      .replace(/\?/g, '.')        // ? matches any single character
      .replace(/\[([^\]]+)\]/g, '[$1]'); // [abc] character class

    return new RegExp(`^${regex}$`);
  }

  private async processCommandSubstitution(input: string): Promise<string> {
    // Handle both $(command) and `command` forms
    const dollarParenRegex = /\$\(([^)]+)\)/g;
    const backtickRegex = /`([^`]+)`/g;
    
    let result = input;
    
    // Process $(command) form
    result = await this.processSubstitutionWithRegex(result, dollarParenRegex);
    
    // Process `command` form
    result = await this.processSubstitutionWithRegex(result, backtickRegex);
    
    return result;
  }

  private async processSubstitutionWithRegex(input: string, regex: RegExp): Promise<string> {
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(input)) !== null) {
      result += input.slice(lastIndex, match.index);
      
      const command = match[1];
      try {
        const { stdout } = await execAsync(command, {
          env: { ...this.context.env, ...this.context.variables },
        });
        // Remove trailing newlines as per POSIX
        result += stdout.replace(/\n+$/, '');
      } catch (_error) {
        // Command substitution failed, leave empty
        result += '';
      }
      
      lastIndex = regex.lastIndex;
    }
    
    result += input.slice(lastIndex);
    return result;
  }

  private async processArithmeticExpansion(input: string): Promise<string> {
    const arithmeticRegex = /\$\(\(([^)]+)\)\)/g;
    
    let result = input;
    const matches = Array.from(input.matchAll(arithmeticRegex));
    
    // Process all matches from right to left to avoid index shifting issues
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const fullMatch = match[0];
      const expression = match[1];
      const startIndex = match.index!;
      const endIndex = startIndex + fullMatch.length;
      
      const value = this.evaluateArithmetic(expression);
      
      // Replace the match with the evaluated value
      result = result.slice(0, startIndex) + value.toString() + result.slice(endIndex);
    }
    
    return result;
  }

  private evaluateArithmetic(expression: string): number {
    // Simple arithmetic evaluator
    // Replace variables with their numeric values
    const expr = expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (match) => {
      const value = this.getParameterValue(match);
      const numValue = parseInt(value, 10);
      return isNaN(numValue) ? '0' : numValue.toString();
    });

    try {
      // Use Function constructor for safe evaluation
      // This is a simplified version - full implementation would need proper arithmetic parser
      return Function(`"use strict"; return (${expr})`)() || 0;
    } catch (_error) {
      return 0;
    }
  }

  // Public method to expand parameter expressions
  public async expandParameterExpression(paramExpr: string): Promise<string> {
    return this.expandParameter(paramExpr);
  }

  // Public method to evaluate arithmetic expressions
  public evaluateArithmeticExpression(expression: string): number {
    return this.evaluateArithmetic(expression);
  }

  // Utility method for field splitting (will be used by shell executor)
  public splitFields(input: string, ifs: string = ' \t\n'): string[] {
    if (!ifs) return [input]; // No field splitting if IFS is empty
    
    if (ifs === ' \t\n') {
      // Default IFS behavior - split on any whitespace and trim
      return input.trim().split(/\s+/).filter(field => field.length > 0);
    }
    
    // Custom IFS - more complex splitting rules
    const fields: string[] = [];
    let currentField = '';
    
    for (const char of input) {
      if (ifs.includes(char)) {
        if (currentField || fields.length === 0) {
          fields.push(currentField);
          currentField = '';
        }
      } else {
        currentField += char;
      }
    }
    
    if (currentField || fields.length === 0) {
      fields.push(currentField);
    }
    
    return fields;
  }
}