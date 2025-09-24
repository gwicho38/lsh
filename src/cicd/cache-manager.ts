import Redis from 'ioredis';
import { createHash } from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

export class CacheManager {
  private redis: Redis;
  private stats: CacheStats;
  private defaultTTL: number;
  private keyPrefix: string;

  constructor(redisUrl: string = 'redis://localhost:6379', options: CacheOptions = {}) {
    this.redis = new Redis(redisUrl);
    this.defaultTTL = options.ttl || 3600; // 1 hour default
    this.keyPrefix = options.prefix || 'cicd:cache:';
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };

    // Set up error handling
    this.redis.on('error', (err) => {
      console.error('Redis cache error:', err);
    });
  }

  private generateKey(namespace: string, identifier: string): string {
    const hash = createHash('md5').update(identifier).digest('hex');
    return `${this.keyPrefix}${namespace}:${hash}`;
  }

  async get<T>(namespace: string, identifier: string): Promise<T | null> {
    const key = this.generateKey(namespace, identifier);

    try {
      const cached = await this.redis.get(key);
      if (cached) {
        this.stats.hits++;
        this.updateHitRate();
        return JSON.parse(cached);
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  async set<T>(namespace: string, identifier: string, value: T, ttl?: number): Promise<void> {
    const key = this.generateKey(namespace, identifier);
    const ttlSeconds = ttl || this.defaultTTL;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serialized);
      this.stats.sets++;
      this.stats.size = await this.getSize();
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  }

  async invalidate(namespace: string, identifier?: string): Promise<void> {
    try {
      if (identifier) {
        // Invalidate specific item
        const key = this.generateKey(namespace, identifier);
        await this.redis.del(key);
        this.stats.deletes++;
      } else {
        // Invalidate entire namespace
        const pattern = `${this.keyPrefix}${namespace}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          this.stats.deletes += keys.length;
        }
      }
      this.stats.size = await this.getSize();
    } catch (error) {
      console.error(`Cache invalidate error:`, error);
    }
  }

  async getOrSet<T>(
    namespace: string,
    identifier: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(namespace, identifier);
    if (cached !== null) {
      return cached;
    }

    // Generate fresh value
    const value = await factory();
    await this.set(namespace, identifier, value, ttl);
    return value;
  }

  async warmup(namespace: string, items: Array<{ id: string; factory: () => Promise<any>; ttl?: number }>) {
    const promises = items.map(async (item) => {
      await this.getOrSet(namespace, item.id, item.factory, item.ttl);
    });

    await Promise.all(promises);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private async getSize(): Promise<number> {
    try {
      const info = await this.redis.info('memory');
      const match = info.match(/used_memory_human:(.+)/);
      if (match) {
        const size = match[1].trim();
        // Convert to bytes
        if (size.endsWith('K')) return parseFloat(size) * 1024;
        if (size.endsWith('M')) return parseFloat(size) * 1024 * 1024;
        if (size.endsWith('G')) return parseFloat(size) * 1024 * 1024 * 1024;
        return parseFloat(size);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    this.stats.size = await this.getSize();
    return { ...this.stats };
  }

  async clear(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.resetStats();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0
    };
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

// Decorator for method-level caching
export function Cacheable(namespace: string, ttl?: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const cacheManager = (this as any).cacheManager;
      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }

      const identifier = `${propertyKey}:${JSON.stringify(args)}`;
      return cacheManager.getOrSet(
        namespace,
        identifier,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}

// Export singleton instance
export const cacheManager = new CacheManager();