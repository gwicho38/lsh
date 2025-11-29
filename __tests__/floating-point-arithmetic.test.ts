/**
 * Floating Point Arithmetic Tests
 * Tests for ZSH-compatible floating point math support
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

describe('FloatingPointArithmetic', () => {
  let FloatingPointArithmetic: typeof import('../src/lib/floating-point-arithmetic.js').FloatingPointArithmetic;

  beforeAll(async () => {
    const module = await import('../src/lib/floating-point-arithmetic.js');
    FloatingPointArithmetic = module.FloatingPointArithmetic;
  });

  describe('Constructor', () => {
    it('should create instance', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith).toBeDefined();
    });

    it('should have default precision of 6', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.getPrecision()).toBe(6);
    });
  });

  describe('Basic Arithmetic', () => {
    it('should evaluate addition', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('2+3')).toBe(5);
    });

    it('should evaluate subtraction', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('10-4')).toBe(6);
    });

    it('should evaluate multiplication', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('5*7')).toBe(35);
    });

    it('should evaluate division', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('20/4')).toBe(5);
    });

    it('should handle floating point numbers', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('3.14+2.86')).toBe(6);
    });

    it('should handle parentheses', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('(2+3)*4')).toBe(20);
    });

    it('should handle nested parentheses', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('((2+3)*2)+5')).toBe(15);
    });

    it('should handle negative numbers', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('-5+10')).toBe(5);
    });
  });

  describe('Precision', () => {
    it('should set precision', () => {
      const arith = new FloatingPointArithmetic();
      arith.setPrecision(2);
      expect(arith.getPrecision()).toBe(2);
    });

    it('should clamp precision to valid range', () => {
      const arith = new FloatingPointArithmetic();
      arith.setPrecision(-5);
      expect(arith.getPrecision()).toBe(0);

      arith.setPrecision(100);
      expect(arith.getPrecision()).toBe(15);
    });

    it('should round results to specified precision', () => {
      const arith = new FloatingPointArithmetic();
      arith.setPrecision(2);
      const result = arith.evaluate('10/3');
      expect(result).toBe(3.33);
    });
  });

  describe('Math Functions', () => {
    it('should list available functions', () => {
      const arith = new FloatingPointArithmetic();
      const functions = arith.getAvailableFunctions();
      expect(functions).toContain('sin');
      expect(functions).toContain('cos');
      expect(functions).toContain('sqrt');
      expect(functions).toContain('abs');
    });

    it('should evaluate sqrt function', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('sqrt(16)')).toBe(4);
    });

    it('should evaluate abs function', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('abs(-5)')).toBe(5);
    });

    it('should evaluate ceil function', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('ceil(4.2)')).toBe(5);
    });

    it('should evaluate floor function', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('floor(4.8)')).toBe(4);
    });

    it('should evaluate round function', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.evaluate('round(4.5)')).toBe(5);
    });

    it('should add custom math function', () => {
      const arith = new FloatingPointArithmetic();
      arith.addMathFunction({
        name: 'double',
        func: (x: number) => x * 2,
        arity: 1
      });
      expect(arith.getAvailableFunctions()).toContain('double');
    });
  });

  describe('Constants', () => {
    it('should return mathematical constants', () => {
      const arith = new FloatingPointArithmetic();
      const constants = arith.getConstants();
      expect(constants.pi).toBe(Math.PI);
      expect(constants.e).toBe(Math.E);
      expect(constants.ln2).toBe(Math.LN2);
      expect(constants.ln10).toBe(Math.LN10);
      expect(constants.sqrt2).toBe(Math.SQRT2);
    });
  });

  describe('Number Formatting', () => {
    it('should format number with default precision', () => {
      const arith = new FloatingPointArithmetic();
      const formatted = arith.formatNumber(3.14159265359);
      expect(formatted).toBe('3.141593');
    });

    it('should format number with custom precision', () => {
      const arith = new FloatingPointArithmetic();
      const formatted = arith.formatNumber(3.14159265359, 2);
      expect(formatted).toBe('3.14');
    });
  });

  describe('Validation', () => {
    it('should validate float strings', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.isValidFloat('3.14')).toBe(true);
      expect(arith.isValidFloat('-10.5')).toBe(true);
      expect(arith.isValidFloat('42')).toBe(true);
      expect(arith.isValidFloat('abc')).toBe(false);
      expect(arith.isValidFloat('Infinity')).toBe(false);
    });

    it('should parse valid float strings', () => {
      const arith = new FloatingPointArithmetic();
      expect(arith.parseFloat('3.14')).toBe(3.14);
      expect(arith.parseFloat('-10')).toBe(-10);
    });

    it('should throw for invalid float strings', () => {
      const arith = new FloatingPointArithmetic();
      expect(() => arith.parseFloat('abc')).toThrow('Invalid floating point number');
    });
  });

  describe('Error Handling', () => {
    it('should throw for invalid characters', () => {
      const arith = new FloatingPointArithmetic();
      expect(() => arith.evaluate('2 @ 3')).toThrow();
    });

    it('should throw for unknown functions', () => {
      const arith = new FloatingPointArithmetic();
      expect(() => arith.evaluate('unknown(5)')).toThrow('Unknown function');
    });

    it('should handle safe evaluation', () => {
      const arith = new FloatingPointArithmetic();

      const success = arith.safeEvaluate('2+3');
      expect(success.success).toBe(true);
      expect(success.result).toBe(5);

      const failure = arith.safeEvaluate('invalid@expression');
      expect(failure.success).toBe(false);
      expect(failure.error).toBeDefined();
    });
  });
});
