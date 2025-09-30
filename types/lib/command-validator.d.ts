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
 * Validate a shell command for security issues
 */
export declare function validateCommand(command: string, options?: ValidationOptions): CommandValidationResult;
/**
 * Sanitize a string for use as a shell argument
 * Note: This should be used for individual arguments, not full commands
 */
export declare function sanitizeShellArgument(arg: string): string;
/**
 * Quote a string for safe use in shell commands
 */
export declare function quoteForShell(str: string): string;
/**
 * Parse command and extract the base command name
 */
export declare function getCommandName(command: string): string;
declare const _default: {
    validateCommand: typeof validateCommand;
    sanitizeShellArgument: typeof sanitizeShellArgument;
    quoteForShell: typeof quoteForShell;
    getCommandName: typeof getCommandName;
};
export default _default;
