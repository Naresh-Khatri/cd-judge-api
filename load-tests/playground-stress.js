import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// ─── Custom metrics ───
const submissionLatency = new Trend("submission_latency", true);
const totalCompletionTime = new Trend("total_completion_time", true);
const pollingRounds = new Trend("polling_rounds");
const verdictOk = new Counter("verdict_ok");
const verdictFailed = new Counter("verdict_failed");
const timeoutRate = new Rate("job_timeout_rate");

export const options = {
  scenarios: {
    constant_load: {
      executor: "constant-vus",
      vus: parseInt(__ENV.VUS || "5"),
      duration: __ENV.DURATION || "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    submission_latency: ["p(95)<1000"],
    total_completion_time: ["p(95)<10000"],
    job_timeout_rate: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:3001";
const API_KEY = __ENV.API_KEY;

if (!API_KEY) {
  throw new Error(
    "API_KEY environment variable is required. Usage:\n  k6 run -e API_KEY=sk_live_... load-tests/playground-stress.js",
  );
}

const PROGRAMS = [
  { lang: "py", code: 'print("Hello from k6!")' },
  { lang: "js", code: 'console.log("Hello from k6!")' },
  {
    lang: "cpp",
    code: `#include <iostream>
int main() { std::cout << "Hello from k6!"; }`,
  },
  {
    lang: "java",
    code: 'public class Solution { public static void main(String[] args) { System.out.println("Hello from k6!"); } }',
  },
];

const params = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

export default function () {
  // Pick a random language
  const prog = PROGRAMS[Math.floor(Math.random() * PROGRAMS.length)];

  // 1. Submit
  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/submissions`,
    JSON.stringify({ code: prog.code, lang: prog.lang }),
    params,
  );

  submissionLatency.add(res.timings.duration);

  const ok = check(res, {
    "submit 200": (r) => r.status === 200,
    "has id": (r) => !!r.json().id,
  });

  if (!ok) {
    console.error(`Submit failed [${prog.lang}]: ${res.status} ${res.body}`);
    return;
  }

  const id = res.json().id;

  // 2. Poll for result
  let completed = false;
  let attempts = 0;
  const maxAttempts = 30;

  while (!completed && attempts < maxAttempts) {
    sleep(1);
    attempts++;

    const poll = http.get(`${BASE_URL}/api/v1/submissions/${id}`, params);
    if (poll.status !== 200) continue;

    const data = poll.json();
    if (data.status === "completed" || data.status === "failed") {
      completed = true;
      pollingRounds.add(attempts);
      totalCompletionTime.add(Date.now() - startTime);

      if (data.result && data.result.verdict === "OK") {
        verdictOk.add(1);
      } else {
        verdictFailed.add(1);
        console.warn(
          `Job ${id} [${prog.lang}]: verdict=${data.result?.verdict} stderr=${data.result?.stderr?.slice(0, 100)}`,
        );
      }
    }
  }

  timeoutRate.add(!completed);
  if (!completed) {
    console.error(`Job ${id} [${prog.lang}] timed out after ${maxAttempts}s`);
  }
}
