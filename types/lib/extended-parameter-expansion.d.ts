/**
 * Extended Parameter Expansion Implementation
 * Provides ZSH-compatible parameter expansion features
 */
import AssociativeArrayManager from './associative-arrays.js';
export interface ExtendedParameterContext {
    variables: Record<string, string>;
    env: Record<string, string>;
    arrays: AssociativeArrayManager;
}
export declare class ExtendedParameterExpander {
    private context;
    constructor(context: ExtendedParameterContext);
    /**
     * Expand extended parameter expressions
     */
    expandParameter(paramExpr: string): string;
    /**
     * Handle global substitution: ${name:gs/old/new}
     */
    private handleGlobalSubstitution;
    /**
     * Handle case conversion: ${name:l} or ${name:u}
     */
    private handleCaseConversion;
    /**
     * Handle array slicing: ${array[2,4]}
     */
    private handleArraySlicing;
    /**
     * Handle parameter type: ${(t)var}
     */
    private handleParameterType;
    /**
     * Handle array keys: ${(k)array}
     */
    private handleArrayKeys;
    /**
     * Handle array values: ${(v)array}
     */
    private handleArrayValues;
    /**
     * Handle array length: ${#array}
     */
    private handleArrayLength;
    /**
     * Get parameter value from variables or environment
     */
    private getParameterValue;
    /**
     * Convert shell pattern to regex
     */
    private patternToRegex;
    /**
     * Expand complex parameter expressions
     */
    expandComplexParameter(paramExpr: string): string;
    /**
     * Check if a parameter expression is an array reference
     */
    isArrayReference(paramExpr: string): boolean;
    /**
     * Get array reference type
     */
    getArrayReferenceType(paramExpr: string): 'keys' | 'values' | 'length' | 'slice' | 'element' | 'none';
}
export default ExtendedParameterExpander;
