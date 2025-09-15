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
export declare class AssociativeArrayManager {
    private context;
    constructor();
    /**
     * Declare an associative array with typeset -A
     */
    declareAssociativeArray(name: string): void;
    /**
     * Declare an indexed array with typeset -a
     */
    declareIndexedArray(name: string): void;
    /**
     * Set a value in an associative array
     */
    setAssociativeValue(arrayName: string, key: string, value: string): void;
    /**
     * Set a value in an indexed array
     */
    setIndexedValue(arrayName: string, index: number, value: string): void;
    /**
     * Get a value from an array
     */
    getValue(arrayName: string, key: string): string | undefined;
    /**
     * Get all keys from an associative array
     */
    getKeys(arrayName: string): string[];
    /**
     * Get all values from an array
     */
    getValues(arrayName: string): string[];
    /**
     * Get array length
     */
    getLength(arrayName: string): number;
    /**
     * Check if an array exists
     */
    hasArray(arrayName: string): boolean;
    /**
     * Get array type
     */
    getArrayType(arrayName: string): 'associative' | 'indexed' | undefined;
    /**
     * Remove an array
     */
    removeArray(arrayName: string): boolean;
    /**
     * Get all array names
     */
    getAllArrayNames(): string[];
    /**
     * Clear all arrays
     */
    clearAllArrays(): void;
    /**
     * Get array slice (for indexed arrays)
     */
    getSlice(arrayName: string, start: number, end?: number): string[];
    /**
     * Expand array reference like ${array[key]} or ${array[@]}
     */
    expandArrayReference(reference: string): string[];
    /**
     * Expand array keys like ${(k)array}
     */
    expandArrayKeys(reference: string): string[];
    /**
     * Expand array values like ${(v)array}
     */
    expandArrayValues(reference: string): string[];
    /**
     * Expand array length like ${#array}
     */
    expandArrayLength(reference: string): string;
    /**
     * Parse typeset command
     */
    parseTypesetCommand(args: string[]): {
        success: boolean;
        message: string;
    };
    /**
     * Get array information for display
     */
    getArrayInfo(arrayName: string): {
        type: string;
        length: number;
        keys: string[];
        values: string[];
    } | null;
    /**
     * Export array data for serialization
     */
    exportArrays(): {
        arrays: Record<string, AssociativeArray>;
        types: Record<string, string>;
    };
    /**
     * Import array data from serialization
     */
    importArrays(data: {
        arrays: Record<string, AssociativeArray>;
        types: Record<string, string>;
    }): void;
}
export default AssociativeArrayManager;
