/**
 * In-Memory Cache Layer
 * 
 * This module provides a simple in-memory caching solution for frequently accessed data.
 * For production, consider using Redis or a dedicated caching service.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>>
  private stats: CacheStats
  private defaultTTL: number
  private maxSize: number
  private cleanupInterval: NodeJS.Timeout | null

  constructor(defaultTTL: number = 300, maxSize: number = 1000) {
    this.cache = new Map()
    this.stats = { hits: 0, misses: 0, size: 0 }
    this.defaultTTL = defaultTTL * 1000 // Convert to milliseconds
    this.maxSize = maxSize
    this.cleanupInterval = null
    
    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.size = this.cache.size
      return null
    }
    
    this.stats.hits++
    return entry.value as T
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest()
    }
    
    this.cache.set(key, { value, expiresAt })
    this.stats.size = this.cache.size
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    this.stats.size = this.cache.size
    return deleted
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.size = this.cache.size
      return false
    }
    
    return true
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear()
    this.stats.size = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses
    return total > 0 ? this.stats.hits / total : 0
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestTime) {
        oldestTime = entry.expiresAt
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key)
        }
      }
      this.stats.size = this.cache.size
    }, 60000) // Run every minute
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Create singleton cache instance
const cache = new InMemoryCache(
  parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10), // 5 minutes default
  parseInt(process.env.CACHE_MAX_SIZE || '1000', 10)
)

/**
 * Cache decorator for async functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  ttl?: number
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void {
  return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}}`
      
      // Try to get from cache
      const cached = cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args)
      
      // Cache the result
      cache.set(cacheKey, result, ttl)
      
      return result
    }
  }
}

/**
 * Cache user profile data
 */
export function cacheUserProfile(userId: string, data: any, ttl?: number): void {
  cache.set(`user:${userId}`, data, ttl)
}

/**
 * Get cached user profile
 */
export function getCachedUserProfile(userId: string): any | null {
  return cache.get(`user:${userId}`)
}

/**
 * Cache user links
 */
export function cacheUserLinks(userId: string, links: any[], ttl?: number): void {
  cache.set(`links:${userId}`, links, ttl)
}

/**
 * Get cached user links
 */
export function getCachedUserLinks(userId: string): any[] | null {
  return cache.get(`links:${userId}`)
}

/**
 * Cache public page data
 */
export function cachePublicPage(username: string, data: any, ttl?: number): void {
  cache.set(`public:${username}`, data, ttl)
}

/**
 * Get cached public page
 */
export function getCachedPublicPage(username: string): any | null {
  return cache.get(`public:${username}`)
}

/**
 * Invalidate user cache
 */
export function invalidateUserCache(userId: string): void {
  cache.delete(`user:${userId}`)
  cache.delete(`links:${userId}`)
}

/**
 * Invalidate public page cache
 */
export function invalidatePublicPageCache(username: string): void {
  cache.delete(`public:${username}`)
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return cache.getStats()
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  return cache.getHitRate()
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear()
}

// Export cache instance for advanced usage
export { cache as default }
