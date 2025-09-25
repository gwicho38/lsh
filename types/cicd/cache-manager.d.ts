interface CacheOptions {
    ttl?: number;
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
export declare class CacheManager {
    private redis;
    private stats;
    private defaultTTL;
    private keyPrefix;
    constructor(redisUrl?: string, options?: CacheOptions);
    private generateKey;
    get<T>(namespace: string, identifier: string): Promise<T | null>;
    set<T>(namespace: string, identifier: string, value: T, ttl?: number): Promise<void>;
    invalidate(namespace: string, identifier?: string): Promise<void>;
    getOrSet<T>(namespace: string, identifier: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    warmup<T>(namespace: string, items: Array<{
        id: string;
        factory: () => Promise<T>;
        ttl?: number;
    }>): Promise<void>;
    private updateHitRate;
    private getSize;
    getStats(): Promise<CacheStats>;
    clear(): Promise<void>;
    private resetStats;
    disconnect(): Promise<void>;
}
export declare function Cacheable(namespace: string, ttl?: number): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const cacheManager: CacheManager;
export {};
