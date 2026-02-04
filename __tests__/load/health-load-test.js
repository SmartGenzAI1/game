import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = __ENV.VUS || 100;
const DURATION = __ENV.DURATION || '30s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'Health' },
  });

  check(healthRes, {
    'Health status is 200': (r) => r.status === 200,
    'Health response time < 500ms': (r) => r.timings.duration < 500,
    'Health has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return 'status' in body;
      } catch (e) {
        return false;
      }
    },
  });

  // Test live endpoint
  const liveRes = http.get(`${BASE_URL}/api/health/live`, {
    tags: { name: 'Live' },
  });

  check(liveRes, {
    'Live status is 200': (r) => r.status === 200,
    'Live response time < 500ms': (r) => r.timings.duration < 500,
    'Live has status field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return 'status' in body;
      } catch (e) {
        return false;
      }
    },
  });

  // Test ready endpoint
  const readyRes = http.get(`${BASE_URL}/api/health/ready`, {
    tags: { name: 'Ready' },
  });

  check(readyRes, {
    'Ready status is 200': (r) => r.status === 200,
    'Ready response time < 500ms': (r) => r.timings.duration < 500,
    'Ready has checks field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return 'checks' in body;
      } catch (e) {
        return false;
      }
    },
  });

  // Small delay between requests
  sleep(1);
}
