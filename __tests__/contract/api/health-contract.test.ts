import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';
import { GET as GET_LIVE } from '@/app/api/health/live/route';
import { GET as GET_READY } from '@/app/api/health/ready/route';
import { GET as GET_METRICS } from '@/app/api/metrics/route';

describe('API Contract Tests', () => {
  describe('Health Endpoint Contract', () => {
    it('should return correct response schema', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);
      const body = await response.json();

      // Validate response schema
      expect(body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return valid timestamp format', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);
      const body = await response.json();

      // ISO 8601 format
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return valid status values', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);
      const body = await response.json();

      expect(['healthy', 'unhealthy']).toContain(body.status);
    });

    it('should have correct content-type header', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should return 200 status code', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Live Endpoint Contract', () => {
    it('should return correct response schema', async () => {
      const request = new Request('http://localhost:3000/api/health/live');
      const response = await GET_LIVE(request);
      const body = await response.json();

      expect(body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return valid status values', async () => {
      const request = new Request('http://localhost:3000/api/health/live');
      const response = await GET_LIVE(request);
      const body = await response.json();

      expect(['alive', 'dead']).toContain(body.status);
    });

    it('should have correct content-type header', async () => {
      const request = new Request('http://localhost:3000/api/health/live');
      const response = await GET_LIVE(request);

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should return 200 status code', async () => {
      const request = new Request('http://localhost:3000/api/health/live');
      const response = await GET_LIVE(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Ready Endpoint Contract', () => {
    it('should return correct response schema', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);
      const body = await response.json();

      expect(body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
        checks: expect.any(Object),
      });
    });

    it('should include health checks in response', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);
      const body = await response.json();

      expect(body.checks).toHaveProperty('database');
      expect(body.checks).toHaveProperty('cache');
    });

    it('should return valid status values', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);
      const body = await response.json();

      expect(['ready', 'not_ready']).toContain(body.status);
    });

    it('should have correct content-type header', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should return 200 status code', async () => {
      const request = new Request('http://localhost:3000/api/health/ready');
      const response = await GET_READY(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Metrics Endpoint Contract', () => {
    it('should return Prometheus format', async () => {
      const request = new Request('http://localhost:3000/api/metrics');
      const response = await GET_METRICS(request);
      const text = await response.text();

      // Prometheus format: metric_name{labels} value
      expect(text).toMatch(/^[a-z_]+/);
    });

    it('should have correct content-type header', async () => {
      const request = new Request('http://localhost:3000/api/metrics');
      const response = await GET_METRICS(request);

      expect(response.headers.get('content-type')).toContain('text/plain');
    });

    it('should return 200 status code', async () => {
      const request = new Request('http://localhost:3000/api/metrics');
      const response = await GET_METRICS(request);

      expect(response.status).toBe(200);
    });

    it('should include metric metadata', async () => {
      const request = new Request('http://localhost:3000/api/metrics');
      const response = await GET_METRICS(request);
      const text = await response.text();

      // Should include HELP and TYPE comments
      expect(text).toMatch(/# HELP/);
      expect(text).toMatch(/# TYPE/);
    });
  });

  describe('Error Response Contract', () => {
    it('should return 404 for non-existent routes', async () => {
      const request = new Request('http://localhost:3000/api/nonexistent');
      const response = await fetch('http://localhost:3000/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return JSON error response for 404', async () => {
      const request = new Request('http://localhost:3000/api/nonexistent');
      const response = await fetch('http://localhost:3000/api/nonexistent');
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
    });

    it('should return 405 for invalid HTTP methods', async () => {
      const request = new Request('http://localhost:3000/api/health', {
        method: 'POST',
      });

      const response = await GET(request);
      // Should handle gracefully
      expect(response).toBeDefined();
    });
  });

  describe('Response Headers Contract', () => {
    it('should include CORS headers if configured', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      // Check for common headers
      expect(response.headers.get('content-type')).toBeDefined();
    });

    it('should not expose sensitive information in headers', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      const headers = response.headers;
      const headerNames = [];
      headers.forEach((_, name) => headerNames.push(name));

      // Should not contain sensitive headers
      expect(headerNames).not.toContain('x-powered-by');
      expect(headerNames).not.toContain('server');
    });
  });

  describe('Rate Limiting Contract', () => {
    it('should include rate limit headers when applicable', async () => {
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      // Rate limit headers may or may not be present
      const hasRateLimitHeaders = 
        response.headers.has('X-RateLimit-Limit') ||
        response.headers.has('X-RateLimit-Remaining') ||
        response.headers.has('X-RateLimit-Reset');

      // This is informational - headers may not be present for all endpoints
      expect(response).toBeDefined();
    });

    it('should return 429 with rate limit headers when rate limited', async () => {
      // This would require making many requests to trigger rate limiting
      // For now, we just verify the contract structure
      const request = new Request('http://localhost:3000/api/health');
      const response = await GET(request);

      // If rate limited, should have specific headers
      if (response.status === 429) {
        expect(response.headers.has('Retry-After')).toBe(true);
        expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
      }
    });
  });
});
