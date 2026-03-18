import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ─── Custom metrics ───
const totalCompletionTime = new Trend("total_completion_time", true);
const timeoutRate = new Rate("job_timeout_rate");
const completedJobs = new Counter("completed_jobs");
const failedJobs = new Counter("failed_jobs");

/**
 * Ramp-up test: gradually increase concurrent users to find the saturation point.
 *
 * Usage:
 *   k6 run -e API_KEY=sk_live_... load-tests/throughput-ramp.js
 *   k6 run -e API_KEY=sk_live_... -e MAX_VUS=50 -e RAMP_DURATION=2m load-tests/throughput-ramp.js
 */
export const options = {
  scenarios: {
    ramp_up: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: __ENV.RAMP_DURATION || "1m", target: parseInt(__ENV.MAX_VUS || "20") },
        { duration: "30s", target: parseInt(__ENV.MAX_VUS || "20") }, // hold at peak
        { duration: "15s", target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.10"],
    total_completion_time: ["p(50)<5000", "p(95)<15000"],
    job_timeout_rate: ["rate<0.10"],
  },
};

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:3000";
const API_KEY = __ENV.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is required");
}

const params = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

// Lightweight programs for throughput testing
const PROGRAMS = [
  { lang: "py", code: 'print("ok")' },
  { lang: "js", code: 'console.log("ok")' },
  { lang: "cpp", code: '#include <iostream>\nint main() { std::cout << "ok"; }' },
];

export default function () {
  const prog = PROGRAMS[Math.floor(Math.random() * PROGRAMS.length)];
  const start = Date.now();

  const res = http.post(
    `${BASE_URL}/api/v1/submissions`,
    JSON.stringify({ code: prog.code, lang: prog.lang }),
    params,
  );

  if (!check(res, { "submit ok": (r) => r.status === 200 })) {
    failedJobs.add(1);
    return;
  }

  const id = res.json().id;

  // Poll with exponential backoff
  let completed = false;
  let delay = 0.5;
  let attempts = 0;

  while (!completed && attempts < 20) {
    sleep(delay);
    delay = Math.min(delay * 1.5, 3);
    attempts++;

    const poll = http.get(`${BASE_URL}/api/v1/submissions/${id}`, params);
    if (poll.status !== 200) continue;

    const data = poll.json();
    if (data.status === "completed" || data.status === "failed") {
      completed = true;
      totalCompletionTime.add(Date.now() - start);

      if (data.result?.verdict === "OK") {
        completedJobs.add(1);
      } else {
        failedJobs.add(1);
      }
    }
  }

  timeoutRate.add(!completed);
}
