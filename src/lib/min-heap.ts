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
export class MinHeap<T> {
  private heap: T[] = [];
  private getPriority: (item: T) => number;
  private getId?: (item: T) => string;

  /**
   * Create a new MinHeap
   * @param getPriority Function to extract numeric priority from items (lower = higher priority)
   * @param getId Optional function to extract unique ID for updates/removals
   */
  constructor(getPriority: (item: T) => number, getId?: (item: T) => string) {
    this.getPriority = getPriority;
    this.getId = getId;
  }

  /**
   * Get the number of items in the heap
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Check if the heap is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * View the minimum item without removing it
   * @returns The item with lowest priority, or undefined if empty
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * Add an item to the heap
   * @param item The item to add
   */
  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the minimum item
   * @returns The item with lowest priority, or undefined if empty
   */
  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return min;
  }

  /**
   * Remove an item by ID
   * @param id The ID of the item to remove
   * @returns The removed item, or undefined if not found
   */
  removeById(id: string): T | undefined {
    if (!this.getId) {
      throw new Error('MinHeap: getId function required for removeById');
    }

    const index = this.heap.findIndex(item => this.getId!(item) === id);
    if (index === -1) {
      return undefined;
    }

    const removed = this.heap[index];
    const last = this.heap.pop();

    if (index < this.heap.length && last !== undefined) {
      this.heap[index] = last;
      // Repair heap - item might need to go up or down
      const parentIndex = Math.floor((index - 1) / 2);
      if (index > 0 && this.getPriority(this.heap[index]) < this.getPriority(this.heap[parentIndex])) {
        this.bubbleUp(index);
      } else {
        this.bubbleDown(index);
      }
    }

    return removed;
  }

  /**
   * Update an item's priority by ID
   * Removes and re-inserts the item with updated values
   * @param id The ID of the item to update
   * @param updater Function to update the item
   * @returns true if updated, false if not found
   */
  updateById(id: string, updater: (item: T) => T): boolean {
    if (!this.getId) {
      throw new Error('MinHeap: getId function required for updateById');
    }

    const index = this.heap.findIndex(item => this.getId!(item) === id);
    if (index === -1) {
      return false;
    }

    const oldPriority = this.getPriority(this.heap[index]);
    this.heap[index] = updater(this.heap[index]);
    const newPriority = this.getPriority(this.heap[index]);

    // Repair heap based on priority change
    if (newPriority < oldPriority) {
      this.bubbleUp(index);
    } else if (newPriority > oldPriority) {
      this.bubbleDown(index);
    }

    return true;
  }

  /**
   * Check if an item with the given ID exists
   * @param id The ID to search for
   * @returns true if found
   */
  hasId(id: string): boolean {
    if (!this.getId) {
      throw new Error('MinHeap: getId function required for hasId');
    }
    return this.heap.some(item => this.getId!(item) === id);
  }

  /**
   * Get all items as an array (does not modify heap)
   * @returns Array of all items (not in heap order)
   */
  toArray(): T[] {
    return [...this.heap];
  }

  /**
   * Clear all items from the heap
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Restore heap property by moving item up
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.getPriority(this.heap[index]) >= this.getPriority(this.heap[parentIndex])) {
        break;
      }
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Restore heap property by moving item down
   */
  private bubbleDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < length &&
        this.getPriority(this.heap[leftChild]) < this.getPriority(this.heap[smallest])
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < length &&
        this.getPriority(this.heap[rightChild]) < this.getPriority(this.heap[smallest])
      ) {
        smallest = rightChild;
      }

      if (smallest === index) {
        break;
      }

      this.swap(index, smallest);
      index = smallest;
    }
  }

  /**
   * Swap two items in the heap
   */
  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

export default MinHeap;
