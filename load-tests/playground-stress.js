import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics
const submissionLatency = new Trend('submission_latency');
const totalCompletionTime = new Trend('total_completion_time');

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: __ENV.VUS || 5,
      duration: __ENV.DURATION || '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY;

if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}

export default function () {
  const payload = JSON.stringify({
    code: 'print("Hello from k6 load test!")',
    lang: 'py',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  // 1. Submit Job
  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/v1/submissions`, payload, params);

  submissionLatency.add(res.timings.duration);

  const submissionOk = check(res, {
    'submission status is 200': (r) => r.status === 200,
    'has submission id': (r) => r.json().id !== undefined,
  });

  if (!submissionOk) {
    console.error(`Submission failed: ${res.status} ${res.body}`);
    return;
  }

  const submissionId = res.json().id;

  // 2. Poll for results
  let completed = false;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max for one job

  while (!completed && attempts < maxAttempts) {
    sleep(1);
    attempts++;

    const pollRes = http.get(`${BASE_URL}/api/v1/submissions/${submissionId}`, params);

    const pollOk = check(pollRes, {
      'poll status is 200': (r) => r.status === 200,
    });

    if (!pollOk) {
      console.error(`Polling failed for ${submissionId}: ${pollRes.status}`);
      break;
    }

    const jobData = pollRes.json();
    if (jobData.status === 'completed' || jobData.status === 'failed') {
      completed = true;
      totalCompletionTime.add(Date.now() - startTime);

      check(jobData, {
        'job completed successfully': (data) => data.status === 'completed',
      });
    }
  }

  if (!completed) {
    console.error(`Job ${submissionId} timed out after ${maxAttempts} attempts`);
  }
}
