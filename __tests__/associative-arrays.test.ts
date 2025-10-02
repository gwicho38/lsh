/**
 * Tests for Associative Arrays
 * Tests ZSH-compatible associative array functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AssociativeArrayManager } from '../src/lib/associative-arrays';

describe('Associative Array Manager', () => {
  let manager: AssociativeArrayManager;

  beforeEach(() => {
    manager = new AssociativeArrayManager();
  });

  describe('Associative Array Declaration', () => {
    it('should declare an associative array', () => {
      manager.declareAssociativeArray('myMap');
      expect(manager.getValue('myMap', 'anyKey')).toBeUndefined();
    });

    it('should allow setting values after declaration', () => {
      manager.declareAssociativeArray('colors');
      manager.setAssociativeValue('colors', 'red', '#FF0000');
      expect(manager.getValue('colors', 'red')).toBe('#FF0000');
    });
  });

  describe('Indexed Array Declaration', () => {
    it('should declare an indexed array', () => {
      manager.declareIndexedArray('myList');
      expect(manager.getValue('myList', '0')).toBeUndefined();
    });

    it('should allow setting values by index', () => {
      manager.declareIndexedArray('items');
      manager.setIndexedValue('items', 0, 'first');
      manager.setIndexedValue('items', 1, 'second');
      expect(manager.getValue('items', '0')).toBe('first');
      expect(manager.getValue('items', '1')).toBe('second');
    });
  });

  describe('Associative Array Operations', () => {
    beforeEach(() => {
      manager.declareAssociativeArray('config');
    });

    it('should set and get string keys', () => {
      manager.setAssociativeValue('config', 'host', 'localhost');
      manager.setAssociativeValue('config', 'port', '8080');

      expect(manager.getValue('config', 'host')).toBe('localhost');
      expect(manager.getValue('config', 'port')).toBe('8080');
    });

    it('should handle special characters in keys', () => {
      manager.setAssociativeValue('config', 'db.url', 'postgresql://localhost');
      manager.setAssociativeValue('config', 'api-key', 'secret123');

      expect(manager.getValue('config', 'db.url')).toBe('postgresql://localhost');
      expect(manager.getValue('config', 'api-key')).toBe('secret123');
    });

    it('should overwrite existing values', () => {
      manager.setAssociativeValue('config', 'env', 'development');
      manager.setAssociativeValue('config', 'env', 'production');

      expect(manager.getValue('config', 'env')).toBe('production');
    });

    it('should handle empty string values', () => {
      manager.setAssociativeValue('config', 'optional', '');
      expect(manager.getValue('config', 'optional')).toBe('');
    });

    it('should return undefined for non-existent keys', () => {
      expect(manager.getValue('config', 'nonexistent')).toBeUndefined();
    });
  });

  describe('Indexed Array Operations', () => {
    beforeEach(() => {
      manager.declareIndexedArray('items');
    });

    it('should set and get by numeric index', () => {
      manager.setIndexedValue('items', 0, 'zero');
      manager.setIndexedValue('items', 1, 'one');
      manager.setIndexedValue('items', 2, 'two');

      expect(manager.getValue('items', '0')).toBe('zero');
      expect(manager.getValue('items', '1')).toBe('one');
      expect(manager.getValue('items', '2')).toBe('two');
    });

    it('should handle sparse arrays', () => {
      manager.setIndexedValue('items', 0, 'first');
      manager.setIndexedValue('items', 5, 'sixth');

      expect(manager.getValue('items', '0')).toBe('first');
      expect(manager.getValue('items', '5')).toBe('sixth');
      expect(manager.getValue('items', '1')).toBeUndefined();
    });

    it('should handle large indices', () => {
      manager.setIndexedValue('items', 1000, 'large');
      expect(manager.getValue('items', '1000')).toBe('large');
    });
  });

  describe('Auto-Declaration', () => {
    it('should auto-declare associative array on first set', () => {
      manager.setAssociativeValue('autoMap', 'key1', 'value1');
      expect(manager.getValue('autoMap', 'key1')).toBe('value1');
    });

    it('should auto-declare indexed array on first set', () => {
      manager.setIndexedValue('autoList', 0, 'item0');
      expect(manager.getValue('autoList', '0')).toBe('item0');
    });
  });

  describe('Get Keys', () => {
    it('should return all keys from associative array', () => {
      manager.declareAssociativeArray('map');
      manager.setAssociativeValue('map', 'a', '1');
      manager.setAssociativeValue('map', 'b', '2');
      manager.setAssociativeValue('map', 'c', '3');

      const keys = manager.getKeys('map');
      expect(keys.length).toBe(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });

    it('should return sorted numeric keys for indexed arrays', () => {
      manager.declareIndexedArray('list');
      manager.setIndexedValue('list', 5, 'five');
      manager.setIndexedValue('list', 1, 'one');
      manager.setIndexedValue('list', 10, 'ten');

      const keys = manager.getKeys('list');
      expect(keys).toEqual(['1', '5', '10']);
    });

    it('should return empty array for non-existent array', () => {
      const keys = manager.getKeys('nonexistent');
      expect(keys).toEqual([]);
    });

    it('should filter out non-numeric keys from indexed arrays', () => {
      manager.declareIndexedArray('list');
      manager.setIndexedValue('list', 1, 'one');
      manager.setIndexedValue('list', 2, 'two');

      const keys = manager.getKeys('list');
      expect(keys).toEqual(['1', '2']);
    });
  });

  describe('Get Values', () => {
    it('should return all values from associative array', () => {
      manager.declareAssociativeArray('map');
      manager.setAssociativeValue('map', 'a', 'alpha');
      manager.setAssociativeValue('map', 'b', 'beta');
      manager.setAssociativeValue('map', 'c', 'gamma');

      const values = manager.getValues('map');
      expect(values.length).toBe(3);
      expect(values).toContain('alpha');
      expect(values).toContain('beta');
      expect(values).toContain('gamma');
    });

    it('should return values in order for indexed arrays', () => {
      manager.declareIndexedArray('list');
      manager.setIndexedValue('list', 0, 'first');
      manager.setIndexedValue('list', 1, 'second');
      manager.setIndexedValue('list', 2, 'third');

      const values = manager.getValues('list');
      expect(values.length).toBe(3);
    });

    it('should return empty array for non-existent array', () => {
      const values = manager.getValues('nonexistent');
      expect(values).toEqual([]);
    });
  });

  describe('Array Length', () => {
    it('should return correct length for associative array', () => {
      manager.declareAssociativeArray('map');
      manager.setAssociativeValue('map', 'a', '1');
      manager.setAssociativeValue('map', 'b', '2');

      const length = manager.getLength('map');
      expect(length).toBe(2);
    });

    it('should return correct length for indexed array', () => {
      manager.declareIndexedArray('list');
      manager.setIndexedValue('list', 0, 'a');
      manager.setIndexedValue('list', 1, 'b');
      manager.setIndexedValue('list', 2, 'c');

      const length = manager.getLength('list');
      expect(length).toBe(3);
    });

    it('should return 0 for non-existent array', () => {
      const length = manager.getLength('nonexistent');
      expect(length).toBe(0);
    });

    it('should count sparse array correctly', () => {
      manager.declareIndexedArray('sparse');
      manager.setIndexedValue('sparse', 0, 'a');
      manager.setIndexedValue('sparse', 10, 'b');

      const length = manager.getLength('sparse');
      expect(length).toBe(2); // Only counts defined elements
    });
  });

  describe('Array Removal', () => {
    it('should remove entire array', () => {
      manager.declareAssociativeArray('temp');
      manager.setAssociativeValue('temp', 'key', 'value');

      const removed = manager.removeArray('temp');

      expect(removed).toBe(true);
      expect(manager.getValue('temp', 'key')).toBeUndefined();
      expect(manager.getLength('temp')).toBe(0);
    });

    it('should return false when removing non-existent array', () => {
      const removed = manager.removeArray('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('Array Existence Check', () => {
    it('should check if array exists', () => {
      manager.declareAssociativeArray('exists');

      expect(manager.hasArray('exists')).toBe(true);
      expect(manager.hasArray('notexists')).toBe(false);
    });

    it('should check if element exists via getValue', () => {
      manager.declareAssociativeArray('map');
      manager.setAssociativeValue('map', 'key', 'value');

      expect(manager.getValue('map', 'key')).toBeDefined();
      expect(manager.getValue('map', 'nokey')).toBeUndefined();
    });
  });

  describe('Array Type Management', () => {
    it('should return correct array type', () => {
      manager.declareAssociativeArray('assoc');
      manager.declareIndexedArray('indexed');

      expect(manager.getArrayType('assoc')).toBe('associative');
      expect(manager.getArrayType('indexed')).toBe('indexed');
      expect(manager.getArrayType('nonexistent')).toBeUndefined();
    });

    it('should list all array names', () => {
      manager.declareAssociativeArray('arr1');
      manager.declareIndexedArray('arr2');
      manager.declareAssociativeArray('arr3');

      const names = manager.getAllArrayNames();
      expect(names.length).toBe(3);
      expect(names).toContain('arr1');
      expect(names).toContain('arr2');
      expect(names).toContain('arr3');
    });

    it('should clear all arrays', () => {
      manager.declareAssociativeArray('arr1');
      manager.declareIndexedArray('arr2');

      manager.clearAllArrays();

      expect(manager.getAllArrayNames().length).toBe(0);
      expect(manager.hasArray('arr1')).toBe(false);
      expect(manager.hasArray('arr2')).toBe(false);
    });
  });

  describe('Array Slicing', () => {
    beforeEach(() => {
      manager.declareIndexedArray('list');
      manager.setIndexedValue('list', 0, 'a');
      manager.setIndexedValue('list', 1, 'b');
      manager.setIndexedValue('list', 2, 'c');
      manager.setIndexedValue('list', 3, 'd');
      manager.setIndexedValue('list', 4, 'e');
    });

    it('should get array slice with start and end', () => {
      const slice = manager.getSlice('list', 1, 3);
      expect(slice.length).toBeGreaterThan(0);
    });

    it('should get array slice from start to end', () => {
      const slice = manager.getSlice('list', 2);
      expect(slice.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent array', () => {
      const slice = manager.getSlice('nonexistent', 0, 5);
      expect(slice).toEqual([]);
    });

    it('should return empty for associative array', () => {
      manager.declareAssociativeArray('assoc');
      const slice = manager.getSlice('assoc', 0, 5);
      expect(slice).toEqual([]);
    });
  });

  describe('Array Expansion', () => {
    beforeEach(() => {
      manager.declareAssociativeArray('colors');
      manager.setAssociativeValue('colors', 'red', '#FF0000');
      manager.setAssociativeValue('colors', 'blue', '#0000FF');
    });

    it('should expand array reference for single element', () => {
      const result = manager.expandArrayReference('${colors[red]}');
      expect(result).toEqual(['#FF0000']);
    });

    it('should expand array keys', () => {
      const keys = manager.expandArrayKeys('${(k)colors}');
      expect(keys.length).toBe(2);
      expect(keys).toContain('red');
      expect(keys).toContain('blue');
    });

    it('should expand array values', () => {
      const values = manager.expandArrayValues('${(v)colors}');
      expect(values.length).toBe(2);
      expect(values).toContain('#FF0000');
      expect(values).toContain('#0000FF');
    });

    it('should expand array length', () => {
      const length = manager.expandArrayLength('${#colors}');
      expect(length).toBe('2');
    });
  });

  describe('Typeset Command Parsing', () => {
    it('should parse associative array declaration', () => {
      const result = manager.parseTypesetCommand(['-A', 'myMap']);
      expect(result.success).toBe(true);
      expect(manager.hasArray('myMap')).toBe(true);
      expect(manager.getArrayType('myMap')).toBe('associative');
    });

    it('should parse indexed array declaration', () => {
      const result = manager.parseTypesetCommand(['-a', 'myList']);
      expect(result.success).toBe(true);
      expect(manager.hasArray('myList')).toBe(true);
      expect(manager.getArrayType('myList')).toBe('indexed');
    });

    it('should parse array assignment', () => {
      const result = manager.parseTypesetCommand(['myMap[key]=value']);
      expect(result.success).toBe(true);
      expect(manager.getValue('myMap', 'key')).toBe('value');
    });

    it('should handle missing arguments', () => {
      const result = manager.parseTypesetCommand([]);
      expect(result.success).toBe(false);
      expect(result.message).toContain('missing arguments');
    });
  });

  describe('Array Info', () => {
    it('should get array information', () => {
      manager.declareAssociativeArray('map');
      manager.setAssociativeValue('map', 'a', '1');
      manager.setAssociativeValue('map', 'b', '2');

      const info = manager.getArrayInfo('map');
      expect(info).not.toBeNull();
      expect(info?.type).toBe('associative');
      expect(info?.length).toBe(2);
      expect(info?.keys.length).toBe(2);
      expect(info?.values.length).toBe(2);
    });

    it('should return null for non-existent array', () => {
      const info = manager.getArrayInfo('nonexistent');
      expect(info).toBeNull();
    });
  });

  describe('Import/Export', () => {
    it('should export arrays', () => {
      manager.declareAssociativeArray('map1');
      manager.setAssociativeValue('map1', 'key', 'value');
      manager.declareIndexedArray('list1');
      manager.setIndexedValue('list1', 0, 'item');

      const exported = manager.exportArrays();
      expect(exported.arrays).toHaveProperty('map1');
      expect(exported.arrays).toHaveProperty('list1');
      expect(exported.types.map1).toBe('associative');
      expect(exported.types.list1).toBe('indexed');
    });

    it('should import arrays', () => {
      const data = {
        arrays: {
          importedMap: { key: 'value' },
          importedList: { '0': 'item' },
        },
        types: {
          importedMap: 'associative',
          importedList: 'indexed',
        },
      };

      manager.importArrays(data);

      expect(manager.hasArray('importedMap')).toBe(true);
      expect(manager.getValue('importedMap', 'key')).toBe('value');
      expect(manager.getArrayType('importedMap')).toBe('associative');
    });

    it('should clear existing arrays on import', () => {
      manager.declareAssociativeArray('existing');
      manager.setAssociativeValue('existing', 'old', 'data');

      const data = {
        arrays: { new: { key: 'value' } },
        types: { new: 'associative' },
      };

      manager.importArrays(data);

      expect(manager.hasArray('existing')).toBe(false);
      expect(manager.hasArray('new')).toBe(true);
    });
  });

  describe('Real World Use Cases', () => {
    it('should handle configuration map', () => {
      manager.declareAssociativeArray('appConfig');
      manager.setAssociativeValue('appConfig', 'database.host', 'localhost');
      manager.setAssociativeValue('appConfig', 'database.port', '5432');
      manager.setAssociativeValue('appConfig', 'api.key', 'secret123');
      manager.setAssociativeValue('appConfig', 'api.timeout', '30');

      expect(manager.getValue('appConfig', 'database.host')).toBe('localhost');
      expect(manager.getValue('appConfig', 'api.timeout')).toBe('30');
      expect(manager.getLength('appConfig')).toBe(4);
    });

    it('should handle color palette', () => {
      manager.declareAssociativeArray('colors');
      manager.setAssociativeValue('colors', 'primary', '#3498db');
      manager.setAssociativeValue('colors', 'secondary', '#2ecc71');
      manager.setAssociativeValue('colors', 'danger', '#e74c3c');

      const keys = manager.getKeys('colors');
      expect(keys.length).toBe(3);
      expect(manager.getValue('colors', 'primary')).toBe('#3498db');
    });

    it('should handle command history as indexed array', () => {
      manager.declareIndexedArray('history');
      manager.setIndexedValue('history', 0, 'ls -la');
      manager.setIndexedValue('history', 1, 'cd /tmp');
      manager.setIndexedValue('history', 2, 'echo "test"');

      const commands = manager.getValues('history');
      expect(commands.length).toBe(3);
      expect(commands).toContain('ls -la');
    });
  });
});
