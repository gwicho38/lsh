/**
 * MinHeap Unit Tests
 *
 * Tests for the priority queue implementation used by the optimized job scheduler.
 */

import { MinHeap } from '../lib/min-heap.js';

interface TestEntry {
  id: string;
  priority: number;
  name: string;
}

describe('MinHeap', () => {
  describe('basic operations', () => {
    it('should start empty', () => {
      const heap = new MinHeap<number>(n => n);
      expect(heap.isEmpty()).toBe(true);
      expect(heap.size).toBe(0);
      expect(heap.peek()).toBeUndefined();
    });

    it('should push and pop a single item', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(5);

      expect(heap.isEmpty()).toBe(false);
      expect(heap.size).toBe(1);
      expect(heap.peek()).toBe(5);
      expect(heap.pop()).toBe(5);
      expect(heap.isEmpty()).toBe(true);
    });

    it('should maintain min-heap property with multiple pushes', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(5);
      heap.push(3);
      heap.push(7);
      heap.push(1);
      heap.push(9);

      expect(heap.size).toBe(5);
      expect(heap.peek()).toBe(1); // Minimum should be at top
    });

    it('should pop items in ascending order', () => {
      const heap = new MinHeap<number>(n => n);
      const values = [5, 3, 7, 1, 9, 2, 8, 4, 6];
      values.forEach(v => heap.push(v));

      const popped: number[] = [];
      while (!heap.isEmpty()) {
        popped.push(heap.pop()!);
      }

      expect(popped).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should handle duplicate priorities', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(3);
      heap.push(3);
      heap.push(1);
      heap.push(3);
      heap.push(1);

      expect(heap.pop()).toBe(1);
      expect(heap.pop()).toBe(1);
      expect(heap.pop()).toBe(3);
      expect(heap.pop()).toBe(3);
      expect(heap.pop()).toBe(3);
    });

    it('should clear all items', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(1);
      heap.push(2);
      heap.push(3);

      heap.clear();

      expect(heap.isEmpty()).toBe(true);
      expect(heap.size).toBe(0);
    });

    it('should convert to array', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(3);
      heap.push(1);
      heap.push(2);

      const arr = heap.toArray();
      expect(arr).toHaveLength(3);
      expect(arr).toContain(1);
      expect(arr).toContain(2);
      expect(arr).toContain(3);
    });
  });

  describe('with custom objects', () => {
    it('should work with object priority extraction', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 5, name: 'Task A' });
      heap.push({ id: 'b', priority: 1, name: 'Task B' });
      heap.push({ id: 'c', priority: 3, name: 'Task C' });

      expect(heap.peek()?.id).toBe('b'); // Lowest priority
      expect(heap.pop()?.id).toBe('b');
      expect(heap.pop()?.id).toBe('c');
      expect(heap.pop()?.id).toBe('a');
    });

    it('should remove by ID', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 5, name: 'Task A' });
      heap.push({ id: 'b', priority: 1, name: 'Task B' });
      heap.push({ id: 'c', priority: 3, name: 'Task C' });

      const removed = heap.removeById('b');

      expect(removed?.id).toBe('b');
      expect(heap.size).toBe(2);
      expect(heap.hasId('b')).toBe(false);
      expect(heap.peek()?.id).toBe('c'); // Next minimum
    });

    it('should return undefined when removing non-existent ID', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 5, name: 'Task A' });

      const removed = heap.removeById('nonexistent');
      expect(removed).toBeUndefined();
      expect(heap.size).toBe(1);
    });

    it('should update by ID with lower priority', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 5, name: 'Task A' });
      heap.push({ id: 'b', priority: 3, name: 'Task B' });
      heap.push({ id: 'c', priority: 1, name: 'Task C' });

      // Move 'a' to highest priority (lowest number)
      const updated = heap.updateById('a', item => ({
        ...item,
        priority: 0,
      }));

      expect(updated).toBe(true);
      expect(heap.peek()?.id).toBe('a');
    });

    it('should update by ID with higher priority', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 1, name: 'Task A' });
      heap.push({ id: 'b', priority: 3, name: 'Task B' });
      heap.push({ id: 'c', priority: 5, name: 'Task C' });

      // Move 'a' to lowest priority (highest number)
      heap.updateById('a', item => ({
        ...item,
        priority: 10,
      }));

      expect(heap.peek()?.id).toBe('b'); // 'b' is now minimum
    });

    it('should return false when updating non-existent ID', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 5, name: 'Task A' });

      const updated = heap.updateById('nonexistent', item => item);
      expect(updated).toBe(false);
    });

    it('should check if ID exists', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 5, name: 'Task A' });

      expect(heap.hasId('a')).toBe(true);
      expect(heap.hasId('b')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw when removeById called without getId function', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(1);

      expect(() => heap.removeById('1')).toThrow('getId function required');
    });

    it('should throw when updateById called without getId function', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(1);

      expect(() => heap.updateById('1', n => n)).toThrow('getId function required');
    });

    it('should throw when hasId called without getId function', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(1);

      expect(() => heap.hasId('1')).toThrow('getId function required');
    });
  });

  describe('edge cases', () => {
    it('should handle large number of items', () => {
      const heap = new MinHeap<number>(n => n);
      const count = 10000;

      // Push random numbers
      const values = Array.from({ length: count }, () => Math.floor(Math.random() * 100000));
      values.forEach(v => heap.push(v));

      expect(heap.size).toBe(count);

      // Pop all and verify sorted
      const popped: number[] = [];
      while (!heap.isEmpty()) {
        popped.push(heap.pop()!);
      }

      // Check that it's sorted in ascending order
      for (let i = 1; i < popped.length; i++) {
        expect(popped[i]).toBeGreaterThanOrEqual(popped[i - 1]);
      }
    });

    it('should handle negative priorities', () => {
      const heap = new MinHeap<number>(n => n);
      heap.push(-5);
      heap.push(0);
      heap.push(-10);
      heap.push(5);

      expect(heap.pop()).toBe(-10);
      expect(heap.pop()).toBe(-5);
      expect(heap.pop()).toBe(0);
      expect(heap.pop()).toBe(5);
    });

    it('should maintain heap property after multiple removes', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      // Add items
      for (let i = 0; i < 20; i++) {
        heap.push({ id: `item-${i}`, priority: i, name: `Item ${i}` });
      }

      // Remove every other item
      for (let i = 0; i < 20; i += 2) {
        heap.removeById(`item-${i}`);
      }

      // Verify remaining items come out in order
      const popped: number[] = [];
      while (!heap.isEmpty()) {
        popped.push(heap.pop()!.priority);
      }

      for (let i = 1; i < popped.length; i++) {
        expect(popped[i]).toBeGreaterThanOrEqual(popped[i - 1]);
      }
    });

    it('should handle removing the only item', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'only', priority: 1, name: 'Only Item' });
      const removed = heap.removeById('only');

      expect(removed?.id).toBe('only');
      expect(heap.isEmpty()).toBe(true);
    });

    it('should handle removing the last item', () => {
      const heap = new MinHeap<TestEntry>(
        entry => entry.priority,
        entry => entry.id
      );

      heap.push({ id: 'a', priority: 1, name: 'A' });
      heap.push({ id: 'b', priority: 5, name: 'B' }); // Higher priority, likely at end

      heap.removeById('b');

      expect(heap.size).toBe(1);
      expect(heap.peek()?.id).toBe('a');
    });
  });

  describe('performance characteristics', () => {
    it('should have O(log n) push complexity', () => {
      const heap = new MinHeap<number>(n => n);
      const operations = 10000;

      const start = globalThis.performance.now();
      for (let i = 0; i < operations; i++) {
        heap.push(Math.random() * 100000);
      }
      const elapsed = globalThis.performance.now() - start;

      // Should be fast (well under 1 second for 10k ops)
      expect(elapsed).toBeLessThan(1000);
    });

    it('should have O(log n) pop complexity', () => {
      const heap = new MinHeap<number>(n => n);
      const operations = 10000;

      // Fill the heap
      for (let i = 0; i < operations; i++) {
        heap.push(Math.random() * 100000);
      }

      const start = globalThis.performance.now();
      while (!heap.isEmpty()) {
        heap.pop();
      }
      const elapsed = globalThis.performance.now() - start;

      // Should be fast
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
