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

export class ExtendedParameterExpander {
  private context: ExtendedParameterContext;

  constructor(context: ExtendedParameterContext) {
    this.context = context;
  }

  /**
   * Expand extended parameter expressions
   */
  public expandParameter(paramExpr: string): string {
    // Handle ZSH-style parameter expansion patterns
    
    // Global substitution: ${name:gs/old/new}
    if (paramExpr.includes(':gs/')) {
      return this.handleGlobalSubstitution(paramExpr);
    }

    // Case conversion: ${name:l} or ${name:u}
    if (paramExpr.match(/:[lu]$/)) {
      return this.handleCaseConversion(paramExpr);
    }

    // Array slicing: ${array[2,4]}
    if (paramExpr.includes('[') && paramExpr.includes(',') && paramExpr.includes(']')) {
      return this.handleArraySlicing(paramExpr);
    }

    // Parameter type: ${(t)var}
    if (paramExpr.match(/^\(t\)/)) {
      return this.handleParameterType(paramExpr);
    }

    // Array keys: ${(k)array}
    if (paramExpr.match(/^\(k\)/)) {
      return this.handleArrayKeys(paramExpr);
    }

    // Array values: ${(v)array}
    if (paramExpr.match(/^\(v\)/)) {
      return this.handleArrayValues(paramExpr);
    }

    // Array length: ${#array}
    if (paramExpr.startsWith('#')) {
      return this.handleArrayLength(paramExpr);
    }

    // Default to regular parameter expansion
    return this.getParameterValue(paramExpr);
  }

  /**
   * Handle global substitution: ${name:gs/old/new}
   */
  private handleGlobalSubstitution(paramExpr: string): string {
    const match = paramExpr.match(/^([^:]+):gs\/([^/]+)\/(.*)$/);
    if (!match) return this.getParameterValue(paramExpr);

    const [, param, oldPattern, newPattern] = match;
    const value = this.getParameterValue(param);
    
    // Convert shell pattern to regex
    const regex = this.patternToRegex(oldPattern);
    return value.replace(regex, newPattern);
  }

  /**
   * Handle case conversion: ${name:l} or ${name:u}
   */
  private handleCaseConversion(paramExpr: string): string {
    const match = paramExpr.match(/^([^:]+):([lu])$/);
    if (!match) return this.getParameterValue(paramExpr);

    const [, param, conversion] = match;
    const value = this.getParameterValue(param);

    switch (conversion) {
      case 'l': return value.toLowerCase();
      case 'u': return value.toUpperCase();
      default: return value;
    }
  }

  /**
   * Handle array slicing: ${array[2,4]}
   */
  private handleArraySlicing(paramExpr: string): string {
    const match = paramExpr.match(/^([^[\]]+)\[(\d+),(\d+)\]$/);
    if (!match) return this.getParameterValue(paramExpr);

    const [, arrayName, startStr, endStr] = match;
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);

    if (!this.context.arrays.hasArray(arrayName)) {
      return '';
    }

    const slice = this.context.arrays.getSlice(arrayName, start, end);
    return slice.join(' ');
  }

  /**
   * Handle parameter type: ${(t)var}
   */
  private handleParameterType(paramExpr: string): string {
    const match = paramExpr.match(/^\(t\)(.+)$/);
    if (!match) return '';

    const param = match[1];
    
    if (this.context.arrays.hasArray(param)) {
      const type = this.context.arrays.getArrayType(param);
      return type === 'associative' ? 'association' : 'array';
    }
    
    if (param in this.context.variables || param in this.context.env) {
      return 'scalar';
    }
    
    return 'unset';
  }

  /**
   * Handle array keys: ${(k)array}
   */
  private handleArrayKeys(paramExpr: string): string {
    const match = paramExpr.match(/^\(k\)(.+)$/);
    if (!match) return '';

    const arrayName = match[1];
    if (!this.context.arrays.hasArray(arrayName)) {
      return '';
    }

    const keys = this.context.arrays.getKeys(arrayName);
    return keys.join(' ');
  }

  /**
   * Handle array values: ${(v)array}
   */
  private handleArrayValues(paramExpr: string): string {
    const match = paramExpr.match(/^\(v\)(.+)$/);
    if (!match) return '';

    const arrayName = match[1];
    if (!this.context.arrays.hasArray(arrayName)) {
      return '';
    }

    const values = this.context.arrays.getValues(arrayName);
    return values.join(' ');
  }

  /**
   * Handle array length: ${#array}
   */
  private handleArrayLength(paramExpr: string): string {
    const arrayName = paramExpr.substring(1); // Remove #
    
    if (!this.context.arrays.hasArray(arrayName)) {
      return '0';
    }

    return this.context.arrays.getLength(arrayName).toString();
  }

  /**
   * Get parameter value from variables or environment
   */
  private getParameterValue(param: string): string {
    // Check arrays first
    if (this.context.arrays.hasArray(param)) {
      const values = this.context.arrays.getValues(param);
      return values.join(' ');
    }

    // Check regular variables
    if (param in this.context.variables) {
      return this.context.variables[param];
    }

    // Check environment variables
    if (param in this.context.env) {
      return this.context.env[param];
    }

    return '';
  }

  /**
   * Convert shell pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    let regex = pattern
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/\*/g, '.*')    // * matches any string
      .replace(/\?/g, '.')     // ? matches any single character
      .replace(/\[([^\]]+)\]/g, '[$1]') // [abc] character class
      .replace(/\./g, '\\.')   // Escape dots
      .replace(/\+/g, '\\+')   // Escape plus signs
      .replace(/\^/g, '\\^')   // Escape carets
      .replace(/\$/g, '\\$')   // Escape dollar signs
      .replace(/\(/g, '\\(')   // Escape parentheses
      .replace(/\)/g, '\\)')   // Escape parentheses
      .replace(/\|/g, '\\|')   // Escape pipes
      .replace(/\{/g, '\\{')   // Escape braces
      .replace(/\}/g, '\\}');  // Escape braces

    return new RegExp(regex, 'g');
  }

  /**
   * Expand complex parameter expressions
   */
  public expandComplexParameter(paramExpr: string): string {
    // Handle nested expansions and complex expressions
    let result = paramExpr;

    // Process from innermost to outermost
    while (result.includes('${')) {
      const start = result.lastIndexOf('${');
      const end = result.indexOf('}', start);
      
      if (end === -1) break;

      const innerExpr = result.substring(start + 2, end);
      const expanded = this.expandParameter(innerExpr);
      
      result = result.substring(0, start) + expanded + result.substring(end + 1);
    }

    return result;
  }

  /**
   * Check if a parameter expression is an array reference
   */
  public isArrayReference(paramExpr: string): boolean {
    return (
      paramExpr.match(/^\([kv]\)/) !== null ||
      paramExpr.startsWith('#') ||
      paramExpr.includes('[') && paramExpr.includes(']')
    );
  }

  /**
   * Get array reference type
   */
  public getArrayReferenceType(paramExpr: string): 'keys' | 'values' | 'length' | 'slice' | 'element' | 'none' {
    if (paramExpr.match(/^\(k\)/)) return 'keys';
    if (paramExpr.match(/^\(v\)/)) return 'values';
    if (paramExpr.startsWith('#')) return 'length';
    if (paramExpr.includes('[') && paramExpr.includes(',')) return 'slice';
    if (paramExpr.includes('[') && paramExpr.includes(']')) return 'element';
    return 'none';
  }
}

export default ExtendedParameterExpander;