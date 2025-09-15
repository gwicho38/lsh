/**
 * Floating Point Arithmetic Implementation
 * Provides ZSH-compatible floating point math support
 */
export interface MathFunction {
    name: string;
    func: (x: number, y?: number) => number;
    arity: 1 | 2;
}
export declare class FloatingPointArithmetic {
    private mathFunctions;
    private precision;
    constructor();
    /**
     * Evaluate arithmetic expression with floating point support
     */
    evaluate(expression: string): number;
    /**
     * Set precision for floating point results
     */
    setPrecision(precision: number): void;
    /**
     * Get current precision
     */
    getPrecision(): number;
    /**
     * Add a custom math function
     */
    addMathFunction(func: MathFunction): void;
    /**
     * Get available math functions
     */
    getAvailableFunctions(): string[];
    /**
     * Setup built-in math functions
     */
    private setupMathFunctions;
    /**
     * Clean expression by removing whitespace and validating characters
     */
    private cleanExpression;
    /**
     * Replace variables in expression (placeholder for future variable support)
     */
    private replaceVariables;
    /**
     * Replace function calls with their results
     */
    private replaceFunctions;
    /**
     * Parse function arguments
     */
    private parseFunctionArguments;
    /**
     * Evaluate the mathematical expression
     */
    private evaluateExpression;
    /**
     * Round number to specified precision
     */
    private roundToPrecision;
    /**
     * Format number with specified precision
     */
    formatNumber(num: number, precision?: number): string;
    /**
     * Check if a string represents a valid floating point number
     */
    isValidFloat(str: string): boolean;
    /**
     * Convert string to floating point number
     */
    parseFloat(str: string): number;
    /**
     * Get mathematical constants
     */
    getConstants(): Record<string, number>;
    /**
     * Evaluate expression with error handling
     */
    safeEvaluate(expression: string): {
        success: boolean;
        result?: number;
        error?: string;
    };
}
export default FloatingPointArithmetic;
