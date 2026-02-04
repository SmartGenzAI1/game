import { prisma } from '@/lib/db';

// Account lockout configuration
export const ACCOUNT_LOCKOUT_CONFIG = {
  maxAttempts: 5, // Maximum failed login attempts
  lockoutDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
  incrementDuration: 5 * 60 * 1000, // 5 minutes increment for each additional failed attempt
};

interface LockoutStatus {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutUntil: Date | null;
  lockoutDuration: number;
}

/**
 * Check if an account is locked out
 * @param email - User email address
 * @returns Lockout status object
 */
export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
    },
  });

  if (!user) {
    return {
      isLocked: false,
      remainingAttempts: ACCOUNT_LOCKOUT_CONFIG.maxAttempts,
      lockoutUntil: null,
      lockoutDuration: 0,
    };
  }

  // Check if lockout has expired
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutUntil: user.lockoutUntil,
      lockoutDuration: ACCOUNT_LOCKOUT_CONFIG.lockoutDuration,
    };
  }

  // Reset failed attempts if lockout has expired
  if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
    await prisma.user.update({
      where: { email },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  }

  const remainingAttempts = ACCOUNT_LOCKOUT_CONFIG.maxAttempts - (user.failedLoginAttempts || 0);

  return {
    isLocked: false,
    remainingAttempts: Math.max(0, remainingAttempts),
    lockoutUntil: null,
    lockoutDuration: 0,
  };
}

/**
 * Record a failed login attempt
 * @param email - User email address
 * @returns Updated lockout status
 */
export async function recordFailedLoginAttempt(email: string): Promise<LockoutStatus> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      failedLoginAttempts: true,
      lockoutUntil: true,
    },
  });

  if (!user) {
    // User doesn't exist, but we don't reveal this
    return {
      isLocked: false,
      remainingAttempts: ACCOUNT_LOCKOUT_CONFIG.maxAttempts - 1,
      lockoutUntil: null,
      lockoutDuration: 0,
    };
  }

  const currentAttempts = (user.failedLoginAttempts || 0) + 1;
  const shouldLock = currentAttempts >= ACCOUNT_LOCKOUT_CONFIG.maxAttempts;

  let lockoutUntil: Date | null = null;
  let lockoutDuration = 0;

  if (shouldLock) {
    // Calculate lockout duration with exponential backoff
    const excessAttempts = currentAttempts - ACCOUNT_LOCKOUT_CONFIG.maxAttempts;
    lockoutDuration = ACCOUNT_LOCKOUT_CONFIG.lockoutDuration + 
      (excessAttempts * ACCOUNT_LOCKOUT_CONFIG.incrementDuration);
    lockoutUntil = new Date(Date.now() + lockoutDuration);
  }

  await prisma.user.update({
    where: { email },
    data: {
      failedLoginAttempts: currentAttempts,
      lockoutUntil,
    },
  });

  return {
    isLocked: shouldLock,
    remainingAttempts: Math.max(0, ACCOUNT_LOCKOUT_CONFIG.maxAttempts - currentAttempts),
    lockoutUntil,
    lockoutDuration,
  };
}

/**
 * Reset failed login attempts on successful login
 * @param email - User email address
 */
export async function resetFailedLoginAttempts(email: string): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
    },
  });
}

/**
 * Get time remaining until account unlock
 * @param lockoutUntil - Lockout expiration date
 * @returns Human-readable time remaining string
 */
export function getTimeRemaining(lockoutUntil: Date): string {
  const now = Date.now();
  const remaining = lockoutUntil.getTime() - now;

  if (remaining <= 0) {
    return '0 minutes';
  }

  const minutes = Math.floor(remaining / (60 * 1000));
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Check if an IP address is rate limited for login attempts
 * This is a simple in-memory implementation
 * For production, consider using Redis or a dedicated service
 */
const ipLoginAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkIpRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10; // 10 attempts per 15 minutes per IP

  const attempts = ipLoginAttempts.get(ip);

  if (!attempts || attempts.resetTime < now) {
    // Reset or create new entry
    ipLoginAttempts.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  const newCount = attempts.count + 1;
  ipLoginAttempts.set(ip, {
    count: newCount,
    resetTime: attempts.resetTime,
  });

  return {
    allowed: newCount <= maxAttempts,
    remainingAttempts: Math.max(0, maxAttempts - newCount),
    resetTime: attempts.resetTime,
  };
}

/**
 * Reset IP rate limit (e.g., after successful login)
 * @param ip - IP address to reset
 */
export function resetIpRateLimit(ip: string): void {
  ipLoginAttempts.delete(ip);
}

/**
 * Clean up expired IP rate limit entries
 * Should be called periodically
 */
export function cleanupIpRateLimits(): void {
  const now = Date.now();
  for (const [ip, attempts] of ipLoginAttempts.entries()) {
    if (attempts.resetTime < now) {
      ipLoginAttempts.delete(ip);
    }
  }
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupIpRateLimits, 5 * 60 * 1000);
}
