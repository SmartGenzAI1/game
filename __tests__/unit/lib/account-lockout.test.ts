import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ACCOUNT_LOCKOUT_CONFIG,
  checkAccountLockout,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
  getTimeRemaining,
  checkIpRateLimit,
  resetIpRateLimit,
  cleanupIpRateLimits,
} from '@/lib/account-lockout';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('ACCOUNT_LOCKOUT_CONFIG', () => {
  it('should have correct configuration', () => {
    expect(ACCOUNT_LOCKOUT_CONFIG.maxAttempts).toBe(5);
    expect(ACCOUNT_LOCKOUT_CONFIG.lockoutDuration).toBe(30 * 60 * 1000); // 30 minutes
    expect(ACCOUNT_LOCKOUT_CONFIG.incrementDuration).toBe(5 * 60 * 1000); // 5 minutes
  });
});

describe('checkAccountLockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return not locked for non-existent user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const status = await checkAccountLockout('nonexistent@example.com');

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(ACCOUNT_LOCKOUT_CONFIG.maxAttempts);
    expect(status.lockoutUntil).toBeNull();
    expect(status.lockoutDuration).toBe(0);
  });

  it('should return not locked for user with no failed attempts', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    const status = await checkAccountLockout('test@example.com');

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(ACCOUNT_LOCKOUT_CONFIG.maxAttempts);
    expect(status.lockoutUntil).toBeNull();
  });

  it('should return not locked for user with failed attempts below threshold', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 3,
      lockoutUntil: null,
    });

    const status = await checkAccountLockout('test@example.com');

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(2);
    expect(status.lockoutUntil).toBeNull();
  });

  it('should return locked for user with active lockout', async () => {
    const lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 5,
      lockoutUntil,
    });

    const status = await checkAccountLockout('test@example.com');

    expect(status.isLocked).toBe(true);
    expect(status.remainingAttempts).toBe(0);
    expect(status.lockoutUntil).toBe(lockoutUntil);
    expect(status.lockoutDuration).toBe(ACCOUNT_LOCKOUT_CONFIG.lockoutDuration);
  });

  it('should reset failed attempts when lockout has expired', async () => {
    const lockoutUntil = new Date(Date.now() - 1000); // Expired
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 5,
      lockoutUntil,
    });

    (prisma.user.update as any).mockResolvedValue({});

    const status = await checkAccountLockout('test@example.com');

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(ACCOUNT_LOCKOUT_CONFIG.maxAttempts);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  });
});

describe('recordFailedLoginAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record failed attempt for non-existent user', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const status = await recordFailedLoginAttempt('nonexistent@example.com');

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(ACCOUNT_LOCKOUT_CONFIG.maxAttempts - 1);
    expect(status.lockoutUntil).toBeNull();
  });

  it('should increment failed attempts below threshold', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 2,
      lockoutUntil: null,
    });

    (prisma.user.update as any).mockResolvedValue({});

    const status = await recordFailedLoginAttempt('test@example.com');

    expect(status.isLocked).toBe(false);
    expect(status.remainingAttempts).toBe(2);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: {
        failedLoginAttempts: 3,
        lockoutUntil: null,
      },
    });
  });

  it('should lock account when threshold is reached', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 4,
      lockoutUntil: null,
    });

    (prisma.user.update as any).mockResolvedValue({});

    const status = await recordFailedLoginAttempt('test@example.com');

    expect(status.isLocked).toBe(true);
    expect(status.remainingAttempts).toBe(0);
    expect(status.lockoutUntil).toBeInstanceOf(Date);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: expect.objectContaining({
        failedLoginAttempts: 5,
        lockoutUntil: expect.any(Date),
      }),
    });
  });

  it('should calculate lockout duration with exponential backoff', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      failedLoginAttempts: 6,
      lockoutUntil: null,
    });

    (prisma.user.update as any).mockResolvedValue({});

    const status = await recordFailedLoginAttempt('test@example.com');

    expect(status.isLocked).toBe(true);
    // Base 30 minutes + 1 increment of 5 minutes = 35 minutes
    expect(status.lockoutDuration).toBe(ACCOUNT_LOCKOUT_CONFIG.lockoutDuration + ACCOUNT_LOCKOUT_CONFIG.incrementDuration);
  });
});

describe('resetFailedLoginAttempts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset failed login attempts', async () => {
    (prisma.user.update as any).mockResolvedValue({});

    await resetFailedLoginAttempts('test@example.com');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  });
});

describe('getTimeRemaining', () => {
  it('should return 0 minutes for expired lockout', () => {
    const lockoutUntil = new Date(Date.now() - 1000);
    const remaining = getTimeRemaining(lockoutUntil);

    expect(remaining).toBe('0 minutes');
  });

  it('should return minutes for lockout with minutes remaining', () => {
    const lockoutUntil = new Date(Date.now() + 5 * 60 * 1000);
    const remaining = getTimeRemaining(lockoutUntil);

    expect(remaining).toBe('5 minutes');
  });

  it('should return singular minute for 1 minute', () => {
    const lockoutUntil = new Date(Date.now() + 1 * 60 * 1000);
    const remaining = getTimeRemaining(lockoutUntil);

    expect(remaining).toBe('1 minute');
  });

  it('should return seconds for lockout with seconds remaining', () => {
    const lockoutUntil = new Date(Date.now() + 30 * 1000);
    const remaining = getTimeRemaining(lockoutUntil);

    expect(remaining).toBe('30 seconds');
  });

  it('should return singular second for 1 second', () => {
    const lockoutUntil = new Date(Date.now() + 1 * 1000);
    const remaining = getTimeRemaining(lockoutUntil);

    expect(remaining).toBe('1 second');
  });
});

describe('checkIpRateLimit', () => {
  beforeEach(() => {
    // Clear IP rate limits
    cleanupIpRateLimits();
  });

  it('should allow first request from IP', () => {
    const result = checkIpRateLimit('192.168.1.1');

    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(9);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });

  it('should allow requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkIpRateLimit('192.168.1.1');
      expect(result.allowed).toBe(true);
    }
  });

  it('should block requests exceeding limit', () => {
    // Make 10 requests (at limit)
    for (let i = 0; i < 10; i++) {
      checkIpRateLimit('192.168.1.1');
    }

    // 11th request should be blocked
    const result = checkIpRateLimit('192.168.1.1');
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
  });

  it('should track different IPs separately', () => {
    const result1 = checkIpRateLimit('192.168.1.1');
    const result2 = checkIpRateLimit('192.168.1.2');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });

  it('should reset after window expires', async () => {
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      checkIpRateLimit('192.168.1.1');
    }

    // Should be blocked
    let result = checkIpRateLimit('192.168.1.1');
    expect(result.allowed).toBe(false);

    // Wait for window to expire (15 minutes + buffer)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be allowed again
    result = checkIpRateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
  });
});

describe('resetIpRateLimit', () => {
  beforeEach(() => {
    cleanupIpRateLimits();
  });

  it('should reset rate limit for IP', () => {
    // Make some requests
    for (let i = 0; i < 5; i++) {
      checkIpRateLimit('192.168.1.1');
    }

    resetIpRateLimit('192.168.1.1');

    // Should be allowed again
    const result = checkIpRateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(9);
  });

  it('should not affect other IPs', () => {
    checkIpRateLimit('192.168.1.1');
    checkIpRateLimit('192.168.1.2');

    resetIpRateLimit('192.168.1.1');

    // IP 1 should be reset
    const result1 = checkIpRateLimit('192.168.1.1');
    expect(result1.remainingAttempts).toBe(9);

    // IP 2 should still have 1 request
    const result2 = checkIpRateLimit('192.168.1.2');
    expect(result2.remainingAttempts).toBe(8);
  });
});

describe('cleanupIpRateLimits', () => {
  it('should clean up expired entries', async () => {
    // Make a request with short window
    const ip = '192.168.1.1';
    checkIpRateLimit(ip);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Cleanup
    cleanupIpRateLimits();

    // Should be allowed again (entry was cleaned up)
    const result = checkIpRateLimit(ip);
    expect(result.allowed).toBe(true);
  });

  it('should not remove active entries', () => {
    const ip = '192.168.1.1';
    checkIpRateLimit(ip);

    cleanupIpRateLimits();

    // Should still be tracked
    const result = checkIpRateLimit(ip);
    expect(result.remainingAttempts).toBe(8);
  });
});
