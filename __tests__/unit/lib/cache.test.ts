import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cacheUserProfile,
  getCachedUserProfile,
  cacheUserLinks,
  getCachedUserLinks,
  cachePublicPage,
  getCachedPublicPage,
  invalidateUserCache,
  invalidatePublicPageCache,
  getCacheStats,
  getCacheHitRate,
  clearCache,
} from '@/lib/cache';

describe('InMemoryCache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('cacheUserProfile and getCachedUserProfile', () => {
    it('should cache and retrieve user profile', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile);
      const cached = getCachedUserProfile(userId);

      expect(cached).toEqual(profile);
    });

    it('should return null for non-existent user', () => {
      const cached = getCachedUserProfile('non-existent');
      expect(cached).toBeNull();
    });

    it('should overwrite existing cache entry', () => {
      const userId = 'user-123';
      const profile1 = { id: userId, name: 'User 1' };
      const profile2 = { id: userId, name: 'User 2' };

      cacheUserProfile(userId, profile1);
      cacheUserProfile(userId, profile2);

      const cached = getCachedUserProfile(userId);
      expect(cached).toEqual(profile2);
    });

    it('should respect custom TTL', async () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile, 100); // 100ms TTL

      // Should be available immediately
      expect(getCachedUserProfile(userId)).toEqual(profile);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(getCachedUserProfile(userId)).toBeNull();
    });
  });

  describe('cacheUserLinks and getCachedUserLinks', () => {
    it('should cache and retrieve user links', () => {
      const userId = 'user-123';
      const links = [
        { id: 'link-1', title: 'Link 1' },
        { id: 'link-2', title: 'Link 2' },
      ];

      cacheUserLinks(userId, links);
      const cached = getCachedUserLinks(userId);

      expect(cached).toEqual(links);
    });

    it('should return null for non-existent user links', () => {
      const cached = getCachedUserLinks('non-existent');
      expect(cached).toBeNull();
    });

    it('should overwrite existing cache entry', () => {
      const userId = 'user-123';
      const links1 = [{ id: 'link-1', title: 'Link 1' }];
      const links2 = [{ id: 'link-2', title: 'Link 2' }];

      cacheUserLinks(userId, links1);
      cacheUserLinks(userId, links2);

      const cached = getCachedUserLinks(userId);
      expect(cached).toEqual(links2);
    });
  });

  describe('cachePublicPage and getCachedPublicPage', () => {
    it('should cache and retrieve public page', () => {
      const username = 'testuser';
      const pageData = { username, bio: 'Test bio' };

      cachePublicPage(username, pageData);
      const cached = getCachedPublicPage(username);

      expect(cached).toEqual(pageData);
    });

    it('should return null for non-existent public page', () => {
      const cached = getCachedPublicPage('non-existent');
      expect(cached).toBeNull();
    });

    it('should overwrite existing cache entry', () => {
      const username = 'testuser';
      const page1 = { username, bio: 'Bio 1' };
      const page2 = { username, bio: 'Bio 2' };

      cachePublicPage(username, page1);
      cachePublicPage(username, page2);

      const cached = getCachedPublicPage(username);
      expect(cached).toEqual(page2);
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate user profile cache', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile);
      expect(getCachedUserProfile(userId)).toEqual(profile);

      invalidateUserCache(userId);
      expect(getCachedUserProfile(userId)).toBeNull();
    });

    it('should invalidate user links cache', () => {
      const userId = 'user-123';
      const links = [{ id: 'link-1', title: 'Link 1' }];

      cacheUserLinks(userId, links);
      expect(getCachedUserLinks(userId)).toEqual(links);

      invalidateUserCache(userId);
      expect(getCachedUserLinks(userId)).toBeNull();
    });

    it('should invalidate both user profile and links cache', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };
      const links = [{ id: 'link-1', title: 'Link 1' }];

      cacheUserProfile(userId, profile);
      cacheUserLinks(userId, links);

      invalidateUserCache(userId);

      expect(getCachedUserProfile(userId)).toBeNull();
      expect(getCachedUserLinks(userId)).toBeNull();
    });
  });

  describe('invalidatePublicPageCache', () => {
    it('should invalidate public page cache', () => {
      const username = 'testuser';
      const pageData = { username, bio: 'Test bio' };

      cachePublicPage(username, pageData);
      expect(getCachedPublicPage(username)).toEqual(pageData);

      invalidatePublicPageCache(username);
      expect(getCachedPublicPage(username)).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return initial stats', () => {
      const stats = getCacheStats();
      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        size: 0,
      });
    });

    it('should track cache hits', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile);
      getCachedUserProfile(userId); // Hit
      getCachedUserProfile(userId); // Hit

      const stats = getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
    });

    it('should track cache misses', () => {
      getCachedUserProfile('non-existent'); // Miss
      getCachedUserProfile('non-existent-2'); // Miss

      const stats = getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });

    it('should track cache size', () => {
      cacheUserProfile('user-1', { id: 'user-1', name: 'User 1' });
      cacheUserProfile('user-2', { id: 'user-2', name: 'User 2' });
      cacheUserLinks('user-1', [{ id: 'link-1', title: 'Link 1' }]);

      const stats = getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('should update size on deletion', () => {
      const userId = 'user-123';
      cacheUserProfile(userId, { id: userId, name: 'Test User' });

      expect(getCacheStats().size).toBe(1);

      invalidateUserCache(userId);
      expect(getCacheStats().size).toBe(0);
    });
  });

  describe('getCacheHitRate', () => {
    it('should return 0 for empty cache', () => {
      expect(getCacheHitRate()).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile);

      // 2 hits, 1 miss
      getCachedUserProfile(userId); // Hit
      getCachedUserProfile(userId); // Hit
      getCachedUserProfile('non-existent'); // Miss

      const hitRate = getCacheHitRate();
      expect(hitRate).toBeCloseTo(0.666, 2); // 2/3
    });

    it('should return 1 for all hits', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile);
      getCachedUserProfile(userId); // Hit
      getCachedUserProfile(userId); // Hit

      expect(getCacheHitRate()).toBe(1);
    });

    it('should return 0 for all misses', () => {
      getCachedUserProfile('non-existent-1'); // Miss
      getCachedUserProfile('non-existent-2'); // Miss

      expect(getCacheHitRate()).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      cacheUserProfile('user-1', { id: 'user-1', name: 'User 1' });
      cacheUserProfile('user-2', { id: 'user-2', name: 'User 2' });
      cacheUserLinks('user-1', [{ id: 'link-1', title: 'Link 1' }]);
      cachePublicPage('testuser', { username: 'testuser', bio: 'Bio' });

      expect(getCacheStats().size).toBe(4);

      clearCache();

      expect(getCacheStats().size).toBe(0);
      expect(getCachedUserProfile('user-1')).toBeNull();
      expect(getCachedUserLinks('user-1')).toBeNull();
      expect(getCachedPublicPage('testuser')).toBeNull();
    });

    it('should reset stats', () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile);
      getCachedUserProfile(userId); // Hit
      getCachedUserProfile('non-existent'); // Miss

      expect(getCacheStats().hits).toBe(1);
      expect(getCacheStats().misses).toBe(1);

      clearCache();

      expect(getCacheStats().hits).toBe(0);
      expect(getCacheStats().misses).toBe(0);
    });
  });

  describe('cache expiration', () => {
    it('should expire entries after TTL', async () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile, 100); // 100ms TTL

      // Should be available immediately
      expect(getCachedUserProfile(userId)).toEqual(profile);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(getCachedUserProfile(userId)).toBeNull();
    });

    it('should update stats on expiration', async () => {
      const userId = 'user-123';
      const profile = { id: userId, name: 'Test User' };

      cacheUserProfile(userId, profile, 100); // 100ms TTL

      // Hit
      getCachedUserProfile(userId);
      expect(getCacheStats().hits).toBe(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Miss (expired)
      getCachedUserProfile(userId);
      expect(getCacheStats().misses).toBe(1);
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest entries when cache is full', () => {
      // Set a small max size for testing
      const maxSize = 3;

      // Cache entries up to max size
      for (let i = 0; i < maxSize; i++) {
        cacheUserProfile(`user-${i}`, { id: `user-${i}`, name: `User ${i}` });
      }

      expect(getCacheStats().size).toBe(maxSize);

      // Add one more entry (should evict oldest)
      cacheUserProfile('user-new', { id: 'user-new', name: 'New User' });

      // Size should still be max size
      expect(getCacheStats().size).toBe(maxSize);

      // Oldest entry should be evicted
      expect(getCachedUserProfile('user-0')).toBeNull();
    });
  });
});
