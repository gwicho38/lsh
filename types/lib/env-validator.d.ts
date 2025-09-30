/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */
export interface EnvValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    missing: string[];
    recommendations: string[];
}
export interface EnvRequirement {
    name: string;
    required: boolean;
    requireInProduction: boolean;
    validate?: (val: string) => boolean;
    description?: string;
    defaultValue?: string;
    sensitiveValue?: boolean;
}
/**
 * Standard environment variable requirements for LSH
 */
export declare const LSH_ENV_REQUIREMENTS: EnvRequirement[];
/**
 * Validate environment variables based on requirements
 */
export declare function validateEnvironment(requirements?: EnvRequirement[], env?: Record<string, string | undefined>): EnvValidationResult;
/**
 * Print validation results to console
 */
export declare function printValidationResults(result: EnvValidationResult, exitOnError?: boolean): void;
/**
 * Validate and exit if invalid (for use at startup)
 */
export declare function validateOrExit(requirements?: EnvRequirement[]): void;
declare const _default: {
    validateEnvironment: typeof validateEnvironment;
    printValidationResults: typeof printValidationResults;
    validateOrExit: typeof validateOrExit;
    LSH_ENV_REQUIREMENTS: EnvRequirement[];
};
export default _default;
