/**
 * POSIX Parameter and Variable Expansion Implementation
 * Implements POSIX.1-2017 Section 2.6 Parameter Expansion
 */
export interface ShellOptions {
    errexit: boolean;
    nounset: boolean;
    xtrace: boolean;
    verbose: boolean;
    noglob: boolean;
    monitor: boolean;
    noclobber: boolean;
    allexport: boolean;
}
export interface VariableContext {
    variables: Record<string, string>;
    env: Record<string, string>;
    positionalParams: string[];
    specialParams: {
        '$': string;
        '?': string;
        '#': string;
        '*': string;
        '@': string[];
        '!': string;
        '0': string;
        '-': string;
    };
    options?: ShellOptions;
}
export declare class VariableExpander {
    private context;
    constructor(context: VariableContext);
    updateContext(updates: Partial<VariableContext>): void;
    expandString(input: string): Promise<string>;
    private processParameterExpansion;
    private expandParameter;
    private getParameterValue;
    private handleDefaultValue;
    private handleAssignDefault;
    private handleErrorIfNull;
    private handleAlternativeValue;
    private handleSuffixRemoval;
    private handlePrefixRemoval;
    private removeSuffix;
    private removePrefix;
    private handleStringLength;
    private handleSubstring;
    private handleCaseConversion;
    private patternToRegex;
    private processCommandSubstitution;
    private processSubstitutionWithRegex;
    private processArithmeticExpansion;
    private evaluateArithmetic;
    expandParameterExpression(paramExpr: string): Promise<string>;
    evaluateArithmeticExpression(expression: string): number;
    splitFields(input: string, ifs?: string): string[];
}
