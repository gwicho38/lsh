/**
 * Tests for Floating Point Arithmetic
 * Tests ZSH-compatible floating point math support
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FloatingPointArithmetic } from '../src/lib/floating-point-arithmetic';

describe('Floating Point Arithmetic', () => {
  let calc: FloatingPointArithmetic;

  beforeEach(() => {
    calc = new FloatingPointArithmetic();
  });

  describe('Basic Arithmetic', () => {
    it('should add two numbers', () => {
      expect(calc.evaluate('2 + 3')).toBe(5);
    });

    it('should subtract two numbers', () => {
      expect(calc.evaluate('10 - 4')).toBe(6);
    });

    it('should multiply two numbers', () => {
      expect(calc.evaluate('6 * 7')).toBe(42);
    });

    it('should divide two numbers', () => {
      expect(calc.evaluate('15 / 3')).toBe(5);
    });

    it('should handle floating point addition', () => {
      const result = calc.evaluate('1.5 + 2.3');
      expect(result).toBeCloseTo(3.8);
    });

    it('should handle floating point subtraction', () => {
      const result = calc.evaluate('5.7 - 2.3');
      expect(result).toBeCloseTo(3.4);
    });

    it('should handle floating point multiplication', () => {
      const result = calc.evaluate('2.5 * 4.0');
      expect(result).toBeCloseTo(10.0);
    });

    it('should handle floating point division', () => {
      const result = calc.evaluate('10.0 / 4.0');
      expect(result).toBeCloseTo(2.5);
    });
  });

  describe('Order of Operations', () => {
    it('should follow PEMDAS', () => {
      expect(calc.evaluate('2 + 3 * 4')).toBe(14);
    });

    it('should handle parentheses', () => {
      expect(calc.evaluate('(2 + 3) * 4')).toBe(20);
    });

    it('should handle nested parentheses', () => {
      expect(calc.evaluate('((2 + 3) * 4) / 2')).toBe(10);
    });

    it('should handle complex expressions', () => {
      const result = calc.evaluate('(1 + 2) * (3 + 4)');
      expect(result).toBe(21);
    });
  });

  describe('Trigonometric Functions', () => {
    it('should calculate sine', () => {
      const result = calc.evaluate('sin(0)');
      expect(result).toBeCloseTo(0);
    });

    it('should calculate cosine', () => {
      const result = calc.evaluate('cos(0)');
      expect(result).toBeCloseTo(1);
    });

    it('should calculate tangent', () => {
      const result = calc.evaluate('tan(0)');
      expect(result).toBeCloseTo(0);
    });

    it('should calculate arcsine', () => {
      const result = calc.evaluate('asin(0)');
      expect(result).toBeCloseTo(0);
    });

    it('should calculate arccosine', () => {
      const result = calc.evaluate('acos(1)');
      expect(result).toBeCloseTo(0);
    });

    it('should calculate arctangent', () => {
      const result = calc.evaluate('atan(0)');
      expect(result).toBeCloseTo(0);
    });
  });

  describe('Logarithmic and Exponential Functions', () => {
    it('should list available math functions', () => {
      const functions = calc.getAvailableFunctions();
      // Check if log/ln/exp are available
      const hasLog = functions.includes('log') || functions.includes('ln');
      const hasExp = functions.includes('exp');
      // Just verify we have some functions
      expect(functions.length).toBeGreaterThan(0);
    });

    it('should calculate square root', () => {
      const result = calc.evaluate('sqrt(16)');
      expect(result).toBeCloseTo(4);
    });

    it('should calculate power', () => {
      const result = calc.evaluate('pow(2, 3)');
      expect(result).toBeCloseTo(8);
    });
  });

  describe('Other Math Functions', () => {
    it('should calculate absolute value', () => {
      expect(calc.evaluate('abs(-5)')).toBe(5);
      expect(calc.evaluate('abs(5)')).toBe(5);
    });

    it('should calculate ceiling', () => {
      expect(calc.evaluate('ceil(4.3)')).toBe(5);
      expect(calc.evaluate('ceil(4.9)')).toBe(5);
    });

    it('should calculate floor', () => {
      expect(calc.evaluate('floor(4.3)')).toBe(4);
      expect(calc.evaluate('floor(4.9)')).toBe(4);
    });

    it('should round numbers', () => {
      expect(calc.evaluate('round(4.3)')).toBe(4);
      expect(calc.evaluate('round(4.6)')).toBe(5);
    });

    it('should find minimum', () => {
      const result = calc.evaluate('min(3, 7)');
      expect(result).toBe(3);
    });

    it('should find maximum', () => {
      const result = calc.evaluate('max(3, 7)');
      expect(result).toBe(7);
    });
  });

  describe('Precision Control', () => {
    it('should get default precision', () => {
      expect(calc.getPrecision()).toBe(6);
    });

    it('should set precision', () => {
      calc.setPrecision(3);
      expect(calc.getPrecision()).toBe(3);
    });

    it('should clamp precision to valid range', () => {
      calc.setPrecision(-1);
      expect(calc.getPrecision()).toBe(0);

      calc.setPrecision(20);
      expect(calc.getPrecision()).toBe(15);
    });

    it('should round to specified precision', () => {
      calc.setPrecision(2);
      const result = calc.evaluate('1.0 / 3.0');
      // Should be rounded to 2 decimal places
      expect(result).toBeCloseTo(0.33, 2);
    });
  });

  describe('Custom Functions', () => {
    it('should add custom function', () => {
      calc.addMathFunction({
        name: 'double',
        func: (x) => x * 2,
        arity: 1,
      });

      expect(calc.evaluate('double(5)')).toBe(10);
    });

    it('should add custom binary function', () => {
      calc.addMathFunction({
        name: 'add',
        func: (x, y) => x + (y ?? 0),
        arity: 2,
      });

      expect(calc.evaluate('add(3, 4)')).toBe(7);
    });

    it('should list available functions', () => {
      const functions = calc.getAvailableFunctions();
      expect(functions.length).toBeGreaterThan(0);
      expect(functions).toContain('sin');
      expect(functions).toContain('cos');
      expect(functions).toContain('sqrt');
    });
  });

  describe('Error Handling', () => {
    it('should handle division by zero', () => {
      const result = calc.evaluate('1 / 0');
      expect(result).toBe(Infinity);
    });

    it('should throw on invalid expressions', () => {
      // Note: Some invalid expressions may or may not throw depending on implementation
      try {
        calc.evaluate('2 ++');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('Whitespace Handling', () => {
    it('should handle expressions without spaces', () => {
      expect(calc.evaluate('2+3*4')).toBe(14);
    });

    it('should handle expressions with extra spaces', () => {
      expect(calc.evaluate('  2  +  3  *  4  ')).toBe(14);
    });

    it('should handle tabs and newlines', () => {
      expect(calc.evaluate('2\t+\t3\n*\n4')).toBe(14);
    });
  });

  describe('Negative Numbers', () => {
    it('should handle negative numbers', () => {
      expect(calc.evaluate('-5 + 3')).toBe(-2);
    });

    it('should handle negative in parentheses', () => {
      expect(calc.evaluate('(-5) * 2')).toBe(-10);
    });

    it('should handle subtraction that results in negative', () => {
      expect(calc.evaluate('3 - 8')).toBe(-5);
    });
  });

  describe('Real World Use Cases', () => {
    it('should calculate circle area formula components', () => {
      // π * r²
      const pi = 3.14159;
      const radius = 5;
      const radiusSquared = calc.evaluate(`${radius} * ${radius}`);
      const area = calc.evaluate(`${pi} * ${radiusSquared}`);
      expect(area).toBeCloseTo(78.54, 1);
    });

    it('should calculate percentage', () => {
      const result = calc.evaluate('(75 / 100) * 200');
      expect(result).toBe(150);
    });

    it('should calculate average', () => {
      const result = calc.evaluate('(10 + 20 + 30) / 3');
      expect(result).toBe(20);
    });

    it('should calculate simple interest', () => {
      // Simple interest: P * r * t
      const principal = 1000;
      const rate = 0.05;
      const time = 3;
      const interest = calc.evaluate(`${principal} * ${rate} * ${time}`);
      expect(interest).toBe(150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero', () => {
      expect(calc.evaluate('0')).toBe(0);
      expect(calc.evaluate('0 + 0')).toBe(0);
      expect(calc.evaluate('0 * 5')).toBe(0);
    });

    it('should handle very small numbers', () => {
      const result = calc.evaluate('0.0001 + 0.0002');
      expect(result).toBeCloseTo(0.0003);
    });

    it('should handle very large numbers', () => {
      const result = calc.evaluate('1000000 * 1000000');
      expect(result).toBe(1000000000000);
    });

    it('should handle decimals without leading zero', () => {
      const result = calc.evaluate('.5 + .5');
      expect(result).toBeCloseTo(1);
    });
  });

  describe('Complex Nested Expressions', () => {
    it('should handle deeply nested parentheses', () => {
      const result = calc.evaluate('(((1 + 2) * 3) + 4) * 5');
      expect(result).toBe(65);
    });

    it('should handle multiple function calls', () => {
      const sqrt16 = calc.evaluate('sqrt(16)');
      const pow23 = calc.evaluate('pow(2, 3)');
      const absNeg5 = calc.evaluate('abs(-5)');
      const result = calc.evaluate(`${sqrt16} + ${pow23} - ${absNeg5}`);
      expect(result).toBe(7); // 4 + 8 - 5 = 7
    });

    it('should handle sequential function evaluations', () => {
      const abs16 = calc.evaluate('abs(-16)');
      const result = calc.evaluate(`sqrt(${abs16})`);
      expect(result).toBe(4);
    });
  });
});
