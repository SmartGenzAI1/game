import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = __ENV.VUS || 50;
const DURATION = __ENV.DURATION || '60s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Test login endpoint (POST request)
  const loginPayload = JSON.stringify({
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    password: 'TestPassword123!',
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });

  check(loginRes, {
    'Login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'Login response time < 2000ms': (r) => r.timings.duration < 2000,
    'Login has JSON response': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  // Test signup endpoint (POST request)
  const signupPayload = JSON.stringify({
    email: `test${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'TestPassword123!',
    username: `testuser${Math.floor(Math.random() * 10000)}`,
    full_name: 'Test User',
  });

  const signupRes = http.post(`${BASE_URL}/api/auth/signup`, signupPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Signup' },
  });

  check(signupRes, {
    'Signup status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'Signup response time < 2000ms': (r) => r.timings.duration < 2000,
    'Signup has JSON response': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  // Test rate limiting
  const rateLimitCheck = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'RateLimitCheck' },
  });

  check(rateLimitCheck, {
    'Rate limit check status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'Rate limit headers present': (r) => {
      return r.headers['X-RateLimit-Limit'] !== undefined ||
             r.headers['X-RateLimit-Remaining'] !== undefined;
    },
  });

  // Small delay between requests
  sleep(2);
}
