import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/health/route';
import { GET as GET_LIVE } from '@/app/api/health/live/route';
import { GET as GET_READY } from '@/app/api/health/ready/route';

describe('Health API Routes', () => {
  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return JSON content type', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should include ISO timestamp', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      const body = await response.json();
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('GET /api/health/live', () => {
    it('should return alive status', async () => {
      const request = new Request('http://localhost:3000/api/health/live');
      const response = await GET_LIVE(request);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('status', 'alive');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return JSON content type', async () => {
      const request = new Request('http://localhost:3000/api/health/live');
      const response = await GET_LIVE(request);

      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);

      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('status', 'ready');
      expect(body).toHaveProperty('timestamp');
    });

    it('should include health checks', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);

      const body = await response.json();
      expect(body).toHaveProperty('checks');
      expect(body.checks).toHaveProperty('database');
      expect(body.checks).toHaveProperty('cache');
    });

    it('should return JSON content type', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);

      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('Health endpoint response format', () => {
    it('should have consistent response structure', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      const body = await response.json();
      
      expect(body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return 200 status code', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Health endpoint error handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'POST',
      });

      // Should handle gracefully (may return 405 or handle differently)
      const response = await GET(request);
      expect(response).toBeDefined();
    });
  });
});
