/**
 * Floating Point Arithmetic Implementation
 * Provides ZSH-compatible floating point math support
 */

export interface MathFunction {
  name: string;
  func: (x: number, y?: number) => number;
  arity: 1 | 2;
}

export class FloatingPointArithmetic {
  private mathFunctions: Map<string, MathFunction> = new Map();
  private precision: number = 6;

  constructor() {
    this.setupMathFunctions();
  }

  /**
   * Evaluate arithmetic expression with floating point support
   */
  public evaluate(expression: string): number {
    try {
      // Clean and validate expression
      const cleaned = this.cleanExpression(expression);
      
      // Replace variables with their values
      const withVariables = this.replaceVariables(cleaned);
      
      // Replace function calls
      const withFunctions = this.replaceFunctions(withVariables);
      
      // Evaluate the expression
      const result = this.evaluateExpression(withFunctions);
      
      // Round to specified precision
      return this.roundToPrecision(result);
    } catch (error) {
      throw new Error(`Arithmetic error: ${error.message}`);
    }
  }

  /**
   * Set precision for floating point results
   */
  public setPrecision(precision: number): void {
    this.precision = Math.max(0, Math.min(15, precision));
  }

  /**
   * Get current precision
   */
  public getPrecision(): number {
    return this.precision;
  }

  /**
   * Add a custom math function
   */
  public addMathFunction(func: MathFunction): void {
    this.mathFunctions.set(func.name, func);
  }

  /**
   * Get available math functions
   */
  public getAvailableFunctions(): string[] {
    return Array.from(this.mathFunctions.keys());
  }

  /**
   * Setup built-in math functions
   */
  private setupMathFunctions(): void {
    // Basic trigonometric functions
    this.addMathFunction({ name: 'sin', func: Math.sin, arity: 1 });
    this.addMathFunction({ name: 'cos', func: Math.cos, arity: 1 });
    this.addMathFunction({ name: 'tan', func: Math.tan, arity: 1 });
    this.addMathFunction({ name: 'asin', func: Math.asin, arity: 1 });
    this.addMathFunction({ name: 'acos', func: Math.acos, arity: 1 });
    this.addMathFunction({ name: 'atan', func: Math.atan, arity: 1 });
    this.addMathFunction({ name: 'atan2', func: Math.atan2, arity: 2 });

    // Hyperbolic functions
    this.addMathFunction({ name: 'sinh', func: Math.sinh, arity: 1 });
    this.addMathFunction({ name: 'cosh', func: Math.cosh, arity: 1 });
    this.addMathFunction({ name: 'tanh', func: Math.tanh, arity: 1 });
    this.addMathFunction({ name: 'asinh', func: Math.asinh, arity: 1 });
    this.addMathFunction({ name: 'acosh', func: Math.acosh, arity: 1 });
    this.addMathFunction({ name: 'atanh', func: Math.atanh, arity: 1 });

    // Exponential and logarithmic functions
    this.addMathFunction({ name: 'exp', func: Math.exp, arity: 1 });
    this.addMathFunction({ name: 'log', func: Math.log, arity: 1 });
    this.addMathFunction({ name: 'log10', func: Math.log10, arity: 1 });
    this.addMathFunction({ name: 'log2', func: Math.log2, arity: 1 });
    this.addMathFunction({ name: 'pow', func: Math.pow, arity: 2 });

    // Power and root functions
    this.addMathFunction({ name: 'sqrt', func: Math.sqrt, arity: 1 });
    this.addMathFunction({ name: 'cbrt', func: Math.cbrt, arity: 1 });

    // Rounding functions
    this.addMathFunction({ name: 'ceil', func: Math.ceil, arity: 1 });
    this.addMathFunction({ name: 'floor', func: Math.floor, arity: 1 });
    this.addMathFunction({ name: 'round', func: Math.round, arity: 1 });
    this.addMathFunction({ name: 'trunc', func: Math.trunc, arity: 1 });

    // Absolute value and sign
    this.addMathFunction({ name: 'abs', func: Math.abs, arity: 1 });
    this.addMathFunction({ name: 'sign', func: Math.sign, arity: 1 });

    // Random functions
    this.addMathFunction({ name: 'random', func: () => Math.random(), arity: 1 });
    this.addMathFunction({ name: 'rand', func: () => Math.random(), arity: 1 });

    // Constants
    this.addMathFunction({ name: 'pi', func: () => Math.PI, arity: 1 });
    this.addMathFunction({ name: 'e', func: () => Math.E, arity: 1 });

    // Additional utility functions
    this.addMathFunction({ name: 'min', func: Math.min, arity: 2 });
    this.addMathFunction({ name: 'max', func: Math.max, arity: 2 });
    this.addMathFunction({ name: 'clz32', func: Math.clz32, arity: 1 });
    this.addMathFunction({ name: 'fround', func: Math.fround, arity: 1 });
    this.addMathFunction({ name: 'imul', func: Math.imul, arity: 2 });
  }

  /**
   * Clean expression by removing whitespace and validating characters
   */
  private cleanExpression(expression: string): string {
    // Remove whitespace
    let cleaned = expression.replace(/\s/g, '');
    
    // Validate characters (allow numbers, operators, parentheses, function names, and dots)
    if (!/^[0-9+\-*/().,a-zA-Z_]+$/.test(cleaned)) {
      throw new Error('Invalid characters in expression');
    }
    
    return cleaned;
  }

  /**
   * Replace variables in expression (placeholder for future variable support)
   */
  private replaceVariables(expression: string): string {
    // For now, just return the expression as-is
    // In a full implementation, this would replace variables like $x with their values
    return expression;
  }

  /**
   * Replace function calls with their results
   */
  private replaceFunctions(expression: string): string {
    let result = expression;
    
    // Find function calls like sin(1.5) or pow(2,3)
    const functionRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)/g;
    
    let match;
    while ((match = functionRegex.exec(expression)) !== null) {
      const [fullMatch, funcName, argsStr] = match;
      
      const func = this.mathFunctions.get(funcName);
      if (!func) {
        throw new Error(`Unknown function: ${funcName}`);
      }
      
      const args = this.parseFunctionArguments(argsStr);
      
      if (args.length !== func.arity) {
        throw new Error(`Function ${funcName} expects ${func.arity} arguments, got ${args.length}`);
      }
      
      const funcResult = func.func(args[0], args[1]);
      result = result.replace(fullMatch, funcResult.toString());
    }
    
    return result;
  }

  /**
   * Parse function arguments
   */
  private parseFunctionArguments(argsStr: string): number[] {
    if (!argsStr.trim()) return [];
    
    const args: number[] = [];
    let current = '';
    let parenCount = 0;
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (char === '(') {
        parenCount++;
        current += char;
      } else if (char === ')') {
        parenCount--;
        current += char;
      } else if (char === ',' && parenCount === 0) {
        args.push(parseFloat(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(parseFloat(current.trim()));
    }
    
    return args;
  }

  /**
   * Evaluate the mathematical expression
   */
  private evaluateExpression(expression: string): number {
    try {
      // Use Function constructor for safe evaluation
      // This is a simplified approach - a full implementation would use a proper parser
      const func = new Function(`return ${expression}`);
      const result = func();
      
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Invalid expression result');
      }
      
      return result;
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error.message}`);
    }
  }

  /**
   * Round number to specified precision
   */
  private roundToPrecision(num: number): number {
    const factor = Math.pow(10, this.precision);
    return Math.round(num * factor) / factor;
  }

  /**
   * Format number with specified precision
   */
  public formatNumber(num: number, precision?: number): string {
    const prec = precision !== undefined ? precision : this.precision;
    return num.toFixed(prec);
  }

  /**
   * Check if a string represents a valid floating point number
   */
  public isValidFloat(str: string): boolean {
    const num = parseFloat(str);
    return !isNaN(num) && isFinite(num);
  }

  /**
   * Convert string to floating point number
   */
  public parseFloat(str: string): number {
    const num = parseFloat(str);
    if (isNaN(num)) {
      throw new Error(`Invalid floating point number: ${str}`);
    }
    return num;
  }

  /**
   * Get mathematical constants
   */
  public getConstants(): Record<string, number> {
    return {
      pi: Math.PI,
      e: Math.E,
      ln2: Math.LN2,
      ln10: Math.LN10,
      log2e: Math.LOG2E,
      log10e: Math.LOG10E,
      sqrt1_2: Math.SQRT1_2,
      sqrt2: Math.SQRT2,
    };
  }

  /**
   * Evaluate expression with error handling
   */
  public safeEvaluate(expression: string): { success: boolean; result?: number; error?: string } {
    try {
      const result = this.evaluate(expression);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default FloatingPointArithmetic;