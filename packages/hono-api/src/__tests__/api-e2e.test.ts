import { describe, expect, it } from "vitest";

/**
 * E2E API tests — requires the full stack running:
 *   - Next.js web app (port from BASE_URL)
 *   - PostgreSQL + Redis
 *   - Worker container with isolate + language runtimes
 *
 * Run with: pnpm --filter @acme/hono-api test:e2e
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const API_URL = `${BASE_URL}/api`;
const API_KEY = process.env.E2E_API_KEY ?? "";

if (!API_KEY) {
  throw new Error(
    "E2E_API_KEY environment variable is required to run E2E tests",
  );
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

/** Submit code and poll until completion (or timeout). */
async function submitAndWait(
  body: Record<string, string>,
  endpoint: "submissions" | "jobs" = "submissions",
  timeoutMs = 30_000,
): Promise<{ id: string; status: string; result: Record<string, unknown> }> {
  const langField = endpoint === "submissions" ? "lang" : "language";
  const payload = { code: body.code, [langField]: body.lang };

  const submitRes = await fetch(`${API_URL}/v1/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  expect(submitRes.ok).toBe(true);
  const { id } = (await submitRes.json()) as { id: string };
  expect(id).toBeDefined();

  // Poll for result
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pollRes = await fetch(`${API_URL}/v1/${endpoint}/${id}`, { headers });
    expect(pollRes.ok).toBe(true);

    const data = (await pollRes.json()) as {
      status: string;
      result: Record<string, unknown>;
    };
    if (data.status === "completed" || data.status === "failed") {
      return { id, ...data };
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Submission ${id} did not complete within ${timeoutMs}ms`);
}

// ─── Health ───

describe("Health", () => {
  it("GET /api/health returns ok", async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { status: string; timestamp: number };
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTypeOf("number");
  });
});

// ─── OpenAPI Spec ───

describe("OpenAPI", () => {
  it("GET /api/openapi.json returns spec", async () => {
    const res = await fetch(`${API_URL}/openapi.json`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { info: { title: string } };
    expect(body.info.title).toBe("CD Judge API");
  });
});

// ─── Auth ───

describe("Auth", () => {
  it("rejects requests without auth token", async () => {
    const res = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "print(1)", lang: "py" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects requests with invalid auth token", async () => {
    const res = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid_key_123",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: "print(1)", lang: "py" }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── Validation ───

describe("Validation", () => {
  it("rejects missing code field", async () => {
    const res = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ lang: "py" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects missing lang field", async () => {
    const res = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: "print(1)" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent submission", async () => {
    const res = await fetch(`${API_URL}/v1/submissions/999999`, { headers });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Job not found");
  });
});

// ─── Submissions — All Languages ───

const LANGUAGE_TESTS = [
  {
    lang: "py",
    name: "Python",
    code: 'print("hello python")',
    expected: "hello python",
  },
  {
    lang: "js",
    name: "JavaScript",
    code: 'console.log("hello javascript")',
    expected: "hello javascript",
  },
  {
    lang: "ts",
    name: "TypeScript",
    code: 'const msg: string = "hello typescript"; console.log(msg)',
    expected: "hello typescript",
  },
  {
    lang: "java",
    name: "Java",
    code: 'public class Main { public static void main(String[] args) { System.out.println("hello java"); } }',
    expected: "hello java",
  },
  {
    lang: "cpp",
    name: "C++",
    code: '#include <iostream>\nint main() { std::cout << "hello cpp" << std::endl; return 0; }',
    expected: "hello cpp",
  },
  {
    lang: "c",
    name: "C",
    code: '#include <stdio.h>\nint main() { printf("hello c\\n"); return 0; }',
    expected: "hello c",
  },
  {
    lang: "rs",
    name: "Rust",
    code: 'fn main() { println!("hello rust"); }',
    expected: "hello rust",
  },
  {
    lang: "go",
    name: "Go",
    code: 'package main\nimport "fmt"\nfunc main() { fmt.Println("hello go") }',
    expected: "hello go",
  },
  {
    lang: "rb",
    name: "Ruby",
    code: 'puts "hello ruby"',
    expected: "hello ruby",
  },
  {
    lang: "php",
    name: "PHP",
    code: '<?php echo "hello php\\n"; ?>',
    expected: "hello php",
  },
];

describe("POST /api/v1/submissions — all languages", () => {
  for (const t of LANGUAGE_TESTS) {
    it(`${t.name} (${t.lang}) executes and returns OK`, async () => {
      const data = await submitAndWait({ code: t.code, lang: t.lang });
      expect(data.status).toBe("completed");
      expect(data.result.verdict).toBe("OK");
      expect((data.result.stdout as string).trim()).toBe(t.expected);
    });
  }
});

// ─── Jobs endpoint (mirrors submissions) ───

describe("POST /api/v1/jobs — smoke test", () => {
  it("Python via jobs endpoint executes and returns OK", async () => {
    const data = await submitAndWait(
      { code: 'print("hello jobs")', lang: "py" },
      "jobs",
    );
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("hello jobs");
  });
});

// ─── Compilation errors ───

describe("Compilation errors", () => {
  it("C++ compile error returns CE verdict", async () => {
    const data = await submitAndWait({
      code: "int main() { undeclared; }",
      lang: "cpp",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("CE");
    expect(data.result.stderr).toBeTruthy();
  });

  it("Rust compile error returns CE verdict", async () => {
    const data = await submitAndWait({
      code: "fn main() { undeclared; }",
      lang: "rs",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("CE");
  });

  it("Java compile error returns CE verdict", async () => {
    const data = await submitAndWait({
      code: "public class Main { public static void main(String[] args) { undeclared; } }",
      lang: "java",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("CE");
  });

  it("Go compile error returns CE verdict", async () => {
    const data = await submitAndWait({
      code: "package main\nfunc main() { undeclared }",
      lang: "go",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("CE");
  });

  it("C compile error returns CE verdict", async () => {
    const data = await submitAndWait({
      code: "int main() { undeclared; }",
      lang: "c",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("CE");
  });
});

// ─── Runtime errors ───

describe("Runtime errors", () => {
  it("Python runtime error returns RE verdict", async () => {
    const data = await submitAndWait({
      code: "raise Exception('boom')",
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("C++ segfault returns SG verdict", async () => {
    const data = await submitAndWait({
      code: '#include <cstdlib>\nint main() { int *p = nullptr; *p = 42; }',
      lang: "cpp",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("SG");
  });
});
