/**
 * LRU Cache (Least Recently Used) implementation
 * Automatically removes oldest entries when size limit is reached
 * Useful for preventing memory leaks in long-running applications
 */

export interface LRUCacheOptions {
  maxSize: number
  onEvict?: (key: string, value: any) => void
}

/**
 * Simple LRU Cache implementation using Map
 * When cache size reaches maxSize, the least recently used item is removed
 *
 * Time Complexity:
 * - get(): O(1)
 * - set(): O(1) amortized
 * - clear(): O(1)
 *
 * Space Complexity: O(maxSize)
 */
export class LRUCache<K = string, V = any> {
  private cache: Map<K, V>
  private maxSize: number
  private onEvict?: (key: K, value: V) => void
  private accessOrder: K[] = [] // Track order of access

  /**
   * @param maxSize Maximum number of items to keep in cache
   * @param onEvict Optional callback when an item is evicted
   */
  constructor(maxSize: number = 5000, onEvict?: (key: K, value: V) => void) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be greater than 0')
    }
    this.cache = new Map()
    this.maxSize = maxSize
    this.onEvict = onEvict
  }

  /**
   * Get value from cache
   * Updates access order (moves to end = most recently used)
   *
   * @param key Cache key
   * @returns Value if found, undefined otherwise
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }

    // Move to end (mark as recently used)
    this.updateAccessOrder(key)
    return this.cache.get(key)
  }

  /**
   * Set value in cache
   * If cache is full, removes least recently used item
   *
   * @param key Cache key
   * @param value Value to store
   */
  set(key: K, value: V): void {
    // If key already exists, update it and mark as recently used
    if (this.cache.has(key)) {
      this.cache.set(key, value)
      this.updateAccessOrder(key)
      return
    }

    // If cache is full, evict least recently used item (first in array)
    if (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!
      const lruValue = this.cache.get(lruKey)
      this.cache.delete(lruKey)

      // Call eviction callback if provided
      if (this.onEvict && lruValue !== undefined) {
        this.onEvict(lruKey, lruValue)
      }
    }

    // Add new item
    this.cache.set(key, value)
    this.accessOrder.push(key)
  }

  /**
   * Check if key exists in cache
   *
   * @param key Cache key
   * @returns True if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * Get current cache size
   *
   * @returns Number of items in cache
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Clear all items from cache
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  /**
   * Delete specific item from cache
   *
   * @param key Cache key to delete
   * @returns True if item was deleted
   */
  delete(key: K): boolean {
    if (!this.cache.has(key)) {
      return false
    }

    const value = this.cache.get(key)
    this.cache.delete(key)
    this.accessOrder = this.accessOrder.filter(k => k !== key)

    if (this.onEvict && value !== undefined) {
      this.onEvict(key, value)
    }

    return true
  }

  /**
   * Get all entries as array
   *
   * @returns Array of [key, value] pairs in order of access
   */
  entries(): Array<[K, V]> {
    return this.accessOrder
      .map(key => [key, this.cache.get(key)!])
      .filter(([, value]) => value !== undefined) as Array<[K, V]>
  }

  /**
   * Get all keys in order of access
   *
   * @returns Array of keys
   */
  keys(): K[] {
    return [...this.accessOrder]
  }

  /**
   * Get all values in order of access
   *
   * @returns Array of values
   */
  values(): V[] {
    return this.accessOrder
      .map(key => this.cache.get(key))
      .filter(v => v !== undefined) as V[]
  }

  /**
   * Internal: Update access order by moving key to end
   *
   * @param key Key to mark as recently used
   */
  private updateAccessOrder(key: K): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    // Add to end (most recently used)
    this.accessOrder.push(key)
  }

  /**
   * Get statistics about cache
   *
   * @returns Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize * 100).toFixed(2) + '%',
      isFull: this.cache.size >= this.maxSize
    }
  }
}

/**
 * Factory function to create LRUCache with typed keys
 *
 * @example
 * const cache = createLRUCache<string, SearchData>(5000, (key, value) => {
 *   console.log('Evicted:', key)
 * })
 */
export function createLRUCache<K = string, V = any>(
  maxSize: number = 5000,
  onEvict?: (key: K, value: V) => void
): LRUCache<K, V> {
  return new LRUCache(maxSize, onEvict)
}
