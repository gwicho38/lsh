/**
 * Associative Arrays Implementation
 * Provides ZSH-compatible associative array functionality
 */

export interface AssociativeArray {
  [key: string]: string;
}

export interface ArrayContext {
  arrays: Map<string, AssociativeArray>;
  arrayTypes: Map<string, 'associative' | 'indexed'>;
}

export class AssociativeArrayManager {
  private context: ArrayContext;

  constructor() {
    this.context = {
      arrays: new Map(),
      arrayTypes: new Map(),
    };
  }

  /**
   * Declare an associative array with typeset -A
   */
  public declareAssociativeArray(name: string): void {
    this.context.arrays.set(name, {});
    this.context.arrayTypes.set(name, 'associative');
  }

  /**
   * Declare an indexed array with typeset -a
   */
  public declareIndexedArray(name: string): void {
    this.context.arrays.set(name, {});
    this.context.arrayTypes.set(name, 'indexed');
  }

  /**
   * Set a value in an associative array
   */
  public setAssociativeValue(arrayName: string, key: string, value: string): void {
    if (!this.context.arrays.has(arrayName)) {
      this.declareAssociativeArray(arrayName);
    }
    
    const array = this.context.arrays.get(arrayName)!;
    array[key] = value;
  }

  /**
   * Set a value in an indexed array
   */
  public setIndexedValue(arrayName: string, index: number, value: string): void {
    if (!this.context.arrays.has(arrayName)) {
      this.declareIndexedArray(arrayName);
    }
    
    const array = this.context.arrays.get(arrayName)!;
    array[index.toString()] = value;
  }

  /**
   * Get a value from an array
   */
  public getValue(arrayName: string, key: string): string | undefined {
    const array = this.context.arrays.get(arrayName);
    return array ? array[key] : undefined;
  }

  /**
   * Get all keys from an associative array
   */
  public getKeys(arrayName: string): string[] {
    const array = this.context.arrays.get(arrayName);
    if (!array) return [];
    
    const type = this.context.arrayTypes.get(arrayName);
    if (type === 'indexed') {
      // For indexed arrays, return sorted numeric keys
      return Object.keys(array)
        .map(k => parseInt(k, 10))
        .filter(k => !isNaN(k))
        .sort((a, b) => a - b)
        .map(k => k.toString());
    } else {
      // For associative arrays, return all keys
      return Object.keys(array);
    }
  }

  /**
   * Get all values from an array
   */
  public getValues(arrayName: string): string[] {
    const array = this.context.arrays.get(arrayName);
    if (!array) return [];
    
    const type = this.context.arrayTypes.get(arrayName);
    if (type === 'indexed') {
      // For indexed arrays, return values in order
      const keys = this.getKeys(arrayName);
      return keys.map(key => array[key]);
    } else {
      // For associative arrays, return all values
      return Object.values(array);
    }
  }

  /**
   * Get array length
   */
  public getLength(arrayName: string): number {
    const array = this.context.arrays.get(arrayName);
    return array ? Object.keys(array).length : 0;
  }

  /**
   * Check if an array exists
   */
  public hasArray(arrayName: string): boolean {
    return this.context.arrays.has(arrayName);
  }

  /**
   * Get array type
   */
  public getArrayType(arrayName: string): 'associative' | 'indexed' | undefined {
    return this.context.arrayTypes.get(arrayName);
  }

  /**
   * Remove an array
   */
  public removeArray(arrayName: string): boolean {
    const hadArray = this.context.arrays.has(arrayName);
    this.context.arrays.delete(arrayName);
    this.context.arrayTypes.delete(arrayName);
    return hadArray;
  }

  /**
   * Get all array names
   */
  public getAllArrayNames(): string[] {
    return Array.from(this.context.arrays.keys());
  }

  /**
   * Clear all arrays
   */
  public clearAllArrays(): void {
    this.context.arrays.clear();
    this.context.arrayTypes.clear();
  }

  /**
   * Get array slice (for indexed arrays)
   */
  public getSlice(arrayName: string, start: number, end?: number): string[] {
    const array = this.context.arrays.get(arrayName);
    if (!array) return [];
    
    const type = this.context.arrayTypes.get(arrayName);
    if (type !== 'indexed') return [];
    
    const keys = this.getKeys(arrayName);
    const startIdx = Math.max(0, start - 1); // Convert to 0-based
    const endIdx = end ? Math.min(keys.length, end) : keys.length;
    
    return keys.slice(startIdx, endIdx).map(key => array[key]);
  }

  /**
   * Expand array reference like ${array[key]} or ${array[@]}
   */
  public expandArrayReference(reference: string): string[] {
    // Match patterns like ${array[key]}, ${array[@]}, ${array[*]}
    const match = reference.match(/^\$\{([^[\]]+)(?:\[([^\]]+)\])?(?:\[@\*\]|\[@\]|\[\*\]|\[@\])?\}$/);
    if (!match) return [];

    const arrayName = match[1];
    const key = match[2];

    if (!this.hasArray(arrayName)) return [];

    if (key) {
      // Single element access
      const value = this.getValue(arrayName, key);
      return value !== undefined ? [value] : [];
    } else {
      // All elements access
      return this.getValues(arrayName);
    }
  }

  /**
   * Expand array keys like ${(k)array}
   */
  public expandArrayKeys(reference: string): string[] {
    const match = reference.match(/^\$\{\(k\)([^}]+)\}$/);
    if (!match) return [];

    const arrayName = match[1];
    return this.getKeys(arrayName);
  }

  /**
   * Expand array values like ${(v)array}
   */
  public expandArrayValues(reference: string): string[] {
    const match = reference.match(/^\$\{\(v\)([^}]+)\}$/);
    if (!match) return [];

    const arrayName = match[1];
    return this.getValues(arrayName);
  }

  /**
   * Expand array length like ${#array}
   */
  public expandArrayLength(reference: string): string {
    const match = reference.match(/^\$\{#([^}]+)\}$/);
    if (!match) return '';

    const arrayName = match[1];
    return this.getLength(arrayName).toString();
  }

  /**
   * Parse typeset command
   */
  public parseTypesetCommand(args: string[]): { success: boolean; message: string } {
    if (args.length === 0) {
      return { success: false, message: 'typeset: missing arguments' };
    }

    for (const arg of args) {
      if (arg === '-A') {
        // Declare associative array - next argument should be the name
        const nameIndex = args.indexOf('-A') + 1;
        if (nameIndex < args.length) {
          const name = args[nameIndex];
          this.declareAssociativeArray(name);
        }
      } else if (arg === '-a') {
        // Declare indexed array - next argument should be the name
        const nameIndex = args.indexOf('-a') + 1;
        if (nameIndex < args.length) {
          const name = args[nameIndex];
          this.declareIndexedArray(name);
        }
      } else if (arg.includes('=')) {
        // Assignment: name=value or name[key]=value
        const [left, right] = arg.split('=', 2);
        const arrayMatch = left.match(/^([^[\]]+)(?:\[([^\]]+)\])?$/);
        
        if (arrayMatch) {
          const arrayName = arrayMatch[1];
          const key = arrayMatch[2];
          
          if (key) {
            // Associative array assignment
            this.setAssociativeValue(arrayName, key, right);
          } else {
            // Regular variable assignment (not array)
            // This would be handled by the regular variable system
          }
        }
      }
    }

    return { success: true, message: '' };
  }

  /**
   * Get array information for display
   */
  public getArrayInfo(arrayName: string): {
    type: string;
    length: number;
    keys: string[];
    values: string[];
  } | null {
    if (!this.hasArray(arrayName)) return null;

    const type = this.getArrayType(arrayName);
    const length = this.getLength(arrayName);
    const keys = this.getKeys(arrayName);
    const values = this.getValues(arrayName);

    return {
      type: type || 'unknown',
      length,
      keys,
      values,
    };
  }

  /**
   * Export array data for serialization
   */
  public exportArrays(): { arrays: Record<string, AssociativeArray>; types: Record<string, string> } {
    const arrays: Record<string, AssociativeArray> = {};
    const types: Record<string, string> = {};

    for (const [name, array] of this.context.arrays) {
      arrays[name] = { ...array };
      types[name] = this.context.arrayTypes.get(name) || 'unknown';
    }

    return { arrays, types };
  }

  /**
   * Import array data from serialization
   */
  public importArrays(data: { arrays: Record<string, AssociativeArray>; types: Record<string, string> }): void {
    this.clearAllArrays();

    for (const [name, array] of Object.entries(data.arrays)) {
      this.context.arrays.set(name, { ...array });
      this.context.arrayTypes.set(name, data.types[name] as 'associative' | 'indexed');
    }
  }
}

export default AssociativeArrayManager;