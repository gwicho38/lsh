/**
 * Tests for new variable expansion operators
 * Tests ${#VAR}, ${VAR:offset:length}, ${VAR^}, etc.
 */

import { VariableExpander } from '../src/lib/variable-expansion';

describe('New Variable Expansion Operators', () => {
  let expander: VariableExpander;

  beforeEach(() => {
    expander = new VariableExpander({
      variables: {
        FOO: 'hello world',
        NAME: 'john doe',
        PATH_VAR: '/usr/local/bin',
        EMPTY: '',
      },
      env: {},
      positionalParams: [],
      specialParams: {
        '$': process.pid.toString(),
        '?': '0',
        '#': '0',
        '*': '',
        '@': [],
        '!': '0',
        '0': 'lsh',
        '-': '',
      },
    });
  });

  describe('String Length: ${#VAR}', () => {
    test('should return length of variable value', async () => {
      const result = await expander.expandString('${#FOO}');
      expect(result).toBe('11'); // "hello world" is 11 chars
    });

    test('should return 0 for empty variable', async () => {
      const result = await expander.expandString('${#EMPTY}');
      expect(result).toBe('0');
    });

    test('should return 0 for unset variable', async () => {
      const result = await expander.expandString('${#UNSET}');
      expect(result).toBe('0');
    });

    test('should handle length in string context', async () => {
      const result = await expander.expandString('Length is ${#FOO} characters');
      expect(result).toBe('Length is 11 characters');
    });

    test('should handle multiple length expansions', async () => {
      const result = await expander.expandString('${#FOO} and ${#NAME}');
      expect(result).toBe('11 and 8');
    });
  });

  describe('Substring Extraction: ${VAR:offset:length}', () => {
    test('should extract substring with offset and length', async () => {
      const result = await expander.expandString('${FOO:0:5}');
      expect(result).toBe('hello');
    });

    test('should extract substring with offset only', async () => {
      const result = await expander.expandString('${FOO:6}');
      expect(result).toBe('world');
    });

    test('should handle negative offset (from end)', async () => {
      const result = await expander.expandString('${FOO:-5}');
      expect(result).toBe('world');
    });

    test('should handle negative offset with length', async () => {
      const result = await expander.expandString('${FOO:-5:3}');
      expect(result).toBe('wor');
    });

    test('should return empty for offset beyond length', async () => {
      const result = await expander.expandString('${FOO:100}');
      expect(result).toBe('');
    });

    test('should handle offset of 0', async () => {
      const result = await expander.expandString('${FOO:0:5}');
      expect(result).toBe('hello');
    });

    test('should work with path-like values', async () => {
      const result = await expander.expandString('${PATH_VAR:5:5}');
      expect(result).toBe('local');
    });
  });

  describe('Case Conversion: ${VAR^}, ${VAR,}, etc.', () => {
    test('should uppercase first character with ^', async () => {
      const result = await expander.expandString('${NAME^}');
      expect(result).toBe('John doe');
    });

    test('should uppercase all characters with ^^', async () => {
      const result = await expander.expandString('${NAME^^}');
      expect(result).toBe('JOHN DOE');
    });

    test('should lowercase first character with ,', async () => {
      const result = await expander.expandString('${FOO,}');
      expect(result).toBe('hello world');
    });

    test('should lowercase all characters with ,,', async () => {
      const result = await expander.expandString('${FOO,,}');
      expect(result).toBe('hello world');
    });

    test('should handle already uppercase string', async () => {
      expander.updateContext({ variables: { UPPER: 'HELLO' } });
      const result = await expander.expandString('${UPPER,,}');
      expect(result).toBe('hello');
    });

    test('should handle mixed case', async () => {
      expander.updateContext({ variables: { MIXED: 'HeLLo WoRLd' } });
      const result = await expander.expandString('${MIXED^^}');
      expect(result).toBe('HELLO WORLD');
    });

    test('should handle empty string', async () => {
      const result = await expander.expandString('${EMPTY^^}');
      expect(result).toBe('');
    });
  });

  describe('Combined Operations', () => {
    test('should combine length and substring', async () => {
      const result = await expander.expandString('${#FOO} ${FOO:0:5}');
      expect(result).toBe('11 hello');
    });

    test('should combine case conversion and length', async () => {
      const result = await expander.expandString('${#NAME} ${NAME^^}');
      expect(result).toBe('8 JOHN DOE');
    });

    test('should work in complex expressions', async () => {
      const result = await expander.expandString('First 5: ${FOO:0:5}, Last 5: ${FOO:-5}, Length: ${#FOO}');
      expect(result).toBe('First 5: hello, Last 5: world, Length: 11');
    });
  });

  describe('Edge Cases', () => {
    test('should handle length of special characters', async () => {
      expander.updateContext({ variables: { SPECIAL: '!@#$%^&*()' } });
      const result = await expander.expandString('${#SPECIAL}');
      expect(result).toBe('10');
    });

    test('should handle substring with unicode characters', async () => {
      expander.updateContext({ variables: { UNICODE: 'hello 世界' } });
      const result = await expander.expandString('${UNICODE:0:5}');
      expect(result).toBe('hello');
    });

    test('should handle case conversion with numbers', async () => {
      expander.updateContext({ variables: { MIXED: 'abc123' } });
      const result = await expander.expandString('${MIXED^^}');
      expect(result).toBe('ABC123');
    });

    test('should return empty for invalid substring format', async () => {
      const result = await expander.expandString('${FOO:invalid}');
      expect(result).toBe('');
    });
  });
});
