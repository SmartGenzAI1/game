import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { PrismaClient } from '@prisma/client';

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options);
}

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  bio: 'Test bio',
  theme: 'default',
  avatar_url: null,
  created_at: new Date(),
  updated_at: new Date(),
  failedLoginAttempts: 0,
  lockoutUntil: null,
};

// Mock link data
export const mockLink = {
  id: 'test-link-id',
  userId: 'test-user-id',
  title: 'Test Link',
  url: 'https://example.com',
  position: 0,
  isActive: true,
  clicks: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock analytics data
export const mockAnalytics = {
  totalClicks: 100,
  uniqueVisitors: 50,
  topLinks: [
    { id: 'link-1', title: 'Link 1', clicks: 50 },
    { id: 'link-2', title: 'Link 2', clicks: 30 },
    { id: 'link-3', title: 'Link 3', clicks: 20 },
  ],
  clicksOverTime: [
    { date: '2024-01-01', clicks: 10 },
    { date: '2024-01-02', clicks: 20 },
    { date: '2024-01-03', clicks: 30 },
  ],
};

// Create test database client
let testPrisma: PrismaClient | null = null;

export async function getTestPrisma(): Promise<PrismaClient> {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db',
        },
      },
    });
  }
  return testPrisma;
}

// Clean up test database
export async function cleanupTestDatabase(): Promise<void> {
  const prisma = await getTestPrisma();
  
  // Delete all test data in correct order (respecting foreign keys)
  await prisma.link.deleteMany({});
  await prisma.user.deleteMany({});
  
  await prisma.$disconnect();
  testPrisma = null;
}

// Create test user
export async function createTestUser(overrides: Partial<typeof mockUser> = {}) {
  const prisma = await getTestPrisma();
  
  return prisma.user.create({
    data: {
      ...mockUser,
      ...overrides,
      email: overrides.email || `test-${Date.now()}@example.com`,
      username: overrides.username || `testuser-${Date.now()}`,
    },
  });
}

// Create test link
export async function createTestLink(userId: string, overrides: Partial<typeof mockLink> = {}) {
  const prisma = await getTestPrisma();
  
  return prisma.link.create({
    data: {
      ...mockLink,
      ...overrides,
      userId,
      title: overrides.title || 'Test Link',
      url: overrides.url || 'https://example.com',
    },
  });
}

// Mock NextAuth session
export const mockSession = {
  user: {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.full_name,
    image: mockUser.avatar_url,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock request object
export const mockRequest = {
  method: 'GET',
  url: 'http://localhost:3000/test',
  headers: new Headers({
    'user-agent': 'test-agent',
    'x-forwarded-for': '127.0.0.1',
  }),
  json: async () => ({}),
  text: async () => '',
  formData: async () => new FormData(),
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
  clone: function () {
    return { ...this };
  },
} as Request;

// Mock response object
export const mockResponse = {
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  json: async () => ({}),
  text: async () => '',
  blob: async () => new Blob(),
  arrayBuffer: async () => new ArrayBuffer(0),
  clone: function () {
    return { ...this };
  },
} as Response;

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate random test data
export const generateRandomEmail = () => `test-${Date.now()}@example.com`;
export const generateRandomUsername = () => `testuser-${Date.now()}`;
export const generateRandomString = (length: number = 10) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// Mock bcrypt hash
export const mockHashedPassword = '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890';

// Helper to create mock FormData
export const createMockFormData = (data: Record<string, string | File>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

// Helper to create mock Headers
export const createMockHeaders = (headers: Record<string, string>) => {
  return new Headers(headers);
};

// Helper to create mock URL
export const createMockUrl = (url: string) => {
  return new URL(url, 'http://localhost:3000');
};

// Helper to mock console methods
export const mockConsole = () => {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    console.error = vi.fn();
    console.warn = vi.fn();
    console.log = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
  });
  
  afterEach(() => {
    Object.assign(console, originalConsole);
  });
  
  return originalConsole;
};

// Helper to test async errors
export const expectAsyncError = async (fn: () => Promise<any>, errorMessage?: string) => {
  await expect(fn).rejects.toThrow(errorMessage);
};

// Helper to create spy on object method
export const spyOnMethod = <T extends object, K extends keyof T>(
  obj: T,
  method: K
) => {
  return vi.spyOn(obj, method as any);
};

// Helper to restore all spies
export const restoreAllSpies = () => {
  vi.restoreAllMocks();
};

// Helper to clear all mocks
export const clearAllMocks = () => {
  vi.clearAllMocks();
};

// Helper to reset all mocks
export const resetAllMocks = () => {
  vi.resetAllMocks();
};
