/**
 * MinHeap Implementation
 *
 * A generic min-heap data structure optimized for job scheduling.
 * The heap is ordered by a numeric priority value - lower values have higher priority.
 *
 * Time Complexity:
 * - push: O(log n)
 * - pop: O(log n)
 * - peek: O(1)
 * - remove: O(n) for finding + O(log n) for heap repair
 * - update: O(n) for finding + O(log n) for heap repair
 *
 * @example
 * ```typescript
 * interface JobEntry { jobId: string; nextRun: number; }
 * const heap = new MinHeap<JobEntry>(entry => entry.nextRun);
 * heap.push({ jobId: 'job1', nextRun: Date.now() + 60000 });
 * const next = heap.pop(); // returns job with earliest nextRun
 * ```
 */
export declare class MinHeap<T> {
    private heap;
    private getPriority;
    private getId?;
    /**
     * Create a new MinHeap
     * @param getPriority Function to extract numeric priority from items (lower = higher priority)
     * @param getId Optional function to extract unique ID for updates/removals
     */
    constructor(getPriority: (item: T) => number, getId?: (item: T) => string);
    /**
     * Get the number of items in the heap
     */
    get size(): number;
    /**
     * Check if the heap is empty
     */
    isEmpty(): boolean;
    /**
     * View the minimum item without removing it
     * @returns The item with lowest priority, or undefined if empty
     */
    peek(): T | undefined;
    /**
     * Add an item to the heap
     * @param item The item to add
     */
    push(item: T): void;
    /**
     * Remove and return the minimum item
     * @returns The item with lowest priority, or undefined if empty
     */
    pop(): T | undefined;
    /**
     * Remove an item by ID
     * @param id The ID of the item to remove
     * @returns The removed item, or undefined if not found
     */
    removeById(id: string): T | undefined;
    /**
     * Update an item's priority by ID
     * Removes and re-inserts the item with updated values
     * @param id The ID of the item to update
     * @param updater Function to update the item
     * @returns true if updated, false if not found
     */
    updateById(id: string, updater: (item: T) => T): boolean;
    /**
     * Check if an item with the given ID exists
     * @param id The ID to search for
     * @returns true if found
     */
    hasId(id: string): boolean;
    /**
     * Get all items as an array (does not modify heap)
     * @returns Array of all items (not in heap order)
     */
    toArray(): T[];
    /**
     * Clear all items from the heap
     */
    clear(): void;
    /**
     * Restore heap property by moving item up
     */
    private bubbleUp;
    /**
     * Restore heap property by moving item down
     */
    private bubbleDown;
    /**
     * Swap two items in the heap
     */
    private swap;
}
export default MinHeap;
