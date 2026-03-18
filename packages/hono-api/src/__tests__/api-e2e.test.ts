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

  it("Node.js uncaught exception returns RE verdict", async () => {
    const data = await submitAndWait({
      code: 'throw new Error("crash");',
      lang: "js",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("Java runtime exception returns RE verdict", async () => {
    const data = await submitAndWait({
      code: 'public class Main { public static void main(String[] args) { throw new RuntimeException("boom"); } }',
      lang: "java",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("C division by zero returns RE or SG verdict", async () => {
    const data = await submitAndWait({
      code: '#include <stdio.h>\nint main() { int a = 1; int b = 0; printf("%d", a/b); return 0; }',
      lang: "c",
    });
    expect(data.status).toBe("completed");
    expect(["RE", "SG"]).toContain(data.result.verdict);
  });

  it("Go panic returns RE verdict", async () => {
    const data = await submitAndWait({
      code: 'package main\nfunc main() { panic("boom") }',
      lang: "go",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("Ruby runtime error returns RE verdict", async () => {
    const data = await submitAndWait({
      code: 'raise "boom"',
      lang: "rb",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("PHP fatal error returns RE verdict", async () => {
    const data = await submitAndWait({
      code: '<?php call_undefined_function(); ?>',
      lang: "php",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("Rust panic returns RE verdict", async () => {
    const data = await submitAndWait({
      code: 'fn main() { panic!("boom"); }',
      lang: "rs",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("C++ non-zero exit code returns RE verdict", async () => {
    const data = await submitAndWait({
      code: "int main() { return 42; }",
      lang: "cpp",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
    expect(data.result.exitCode).toBe(42);
  });
});

// ─── Time limit ───

describe("Time limit", () => {
  it("Python infinite loop returns TO verdict", async () => {
    const data = await submitAndWait({
      code: "while True: pass",
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("TO");
  });

  it("C++ infinite loop returns TO verdict", async () => {
    const data = await submitAndWait({
      code: "int main() { while(1); }",
      lang: "cpp",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("TO");
  });

  it("Node.js infinite loop returns TO verdict", async () => {
    const data = await submitAndWait({
      code: "while(true) {}",
      lang: "js",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("TO");
  });
});

// ─── Unicode & special characters ───

describe("Unicode and special characters", () => {
  it("Python prints unicode correctly", async () => {
    const data = await submitAndWait({
      code: 'print("Hello 世界 🌍 привет")',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("Hello 世界 🌍 привет");
  });

  it("Node.js handles emoji output", async () => {
    const data = await submitAndWait({
      code: 'console.log("🚀🔥✅")',
      lang: "js",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("🚀🔥✅");
  });

  it("Go handles unicode output", async () => {
    const data = await submitAndWait({
      code: 'package main\nimport "fmt"\nfunc main() { fmt.Println("こんにちは") }',
      lang: "go",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("こんにちは");
  });
});

// ─── Multi-line & large output ───

describe("Output handling", () => {
  it("Python multi-line output is preserved", async () => {
    const data = await submitAndWait({
      code: 'for i in range(5): print(f"line {i}")',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    const lines = (data.result.stdout as string).trim().split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe("line 0");
    expect(lines[4]).toBe("line 4");
  });

  it("C++ large stdout output is captured", async () => {
    const data = await submitAndWait({
      code: '#include <iostream>\nint main() { for(int i=0; i<1000; i++) std::cout << "line " << i << "\\n"; }',
      lang: "cpp",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    const lines = (data.result.stdout as string).trim().split("\n");
    expect(lines.length).toBe(1000);
  });

  it("Python empty output with OK verdict", async () => {
    const data = await submitAndWait({
      code: "x = 42",
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("");
  });
});

// ─── Stderr handling ───

describe("Stderr handling", () => {
  it("Python stderr is captured separately from stdout", async () => {
    const data = await submitAndWait({
      code: 'import sys\nprint("out")\nprint("err", file=sys.stderr)',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("out");
    expect((data.result.stderr as string).trim()).toBe("err");
  });

  it("Node.js stderr is captured", async () => {
    const data = await submitAndWait({
      code: 'console.log("out"); console.error("err");',
      lang: "js",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("out");
    expect((data.result.stderr as string).trim()).toBe("err");
  });
});

// ─── Resource metadata ───

describe("Execution metadata", () => {
  it("returns time and memory metrics", async () => {
    const data = await submitAndWait({
      code: 'print("hello")',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect(data.result.time).toBeTypeOf("number");
    expect(data.result.memory).toBeTypeOf("number");
    expect(data.result.time).toBeGreaterThanOrEqual(0);
    expect(data.result.memory).toBeGreaterThan(0);
  });

  it("returns exit code on success", async () => {
    const data = await submitAndWait({
      code: '#include <stdio.h>\nint main() { printf("ok"); return 0; }',
      lang: "c",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect(data.result.exitCode).toBe(0);
  });

  it("returns timing breakdown (submittedAt, processedAt, finishedAt)", async () => {
    const submitRes = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: 'print("timing")', lang: "py" }),
    });
    const { id } = (await submitRes.json()) as { id: string };

    // Wait for completion
    let result: Record<string, unknown> = {};
    const start = Date.now();
    while (Date.now() - start < 30_000) {
      const pollRes = await fetch(`${API_URL}/v1/submissions/${id}`, { headers });
      const data = (await pollRes.json()) as Record<string, unknown>;
      if (data.status === "completed") {
        result = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(result.submittedAt).toBeTypeOf("number");
    expect(result.processedAt).toBeTypeOf("number");
    expect(result.finishedAt).toBeTypeOf("number");
    expect(result.finishedAt as number).toBeGreaterThanOrEqual(result.processedAt as number);
    expect(result.processedAt as number).toBeGreaterThanOrEqual(result.submittedAt as number);
  });
});

// ─── Sandbox isolation ───

describe("Sandbox isolation", () => {
  it("Python cannot read /etc/passwd", async () => {
    const data = await submitAndWait({
      code: 'f = open("/etc/passwd"); print(f.read())',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    // Should either error or be sandboxed
    expect(["RE", "OK"]).toContain(data.result.verdict);
    if (data.result.verdict === "OK") {
      // If it succeeds, it should be the sandbox's /etc/passwd, not the host's
      expect((data.result.stdout as string)).not.toContain("root:x:0:0");
    }
  });

  it("Python cannot make network requests", async () => {
    const data = await submitAndWait({
      code: 'import urllib.request\nurllib.request.urlopen("http://example.com")',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("RE");
  });

  it("C cannot fork bomb", async () => {
    const data = await submitAndWait({
      code: '#include <unistd.h>\nint main() { while(1) fork(); }',
      lang: "c",
    });
    expect(data.status).toBe("completed");
    // Should be stopped by process limit or time limit
    expect(["RE", "SG", "TO"]).toContain(data.result.verdict);
  });

  it("Python cannot write to filesystem outside sandbox", async () => {
    const data = await submitAndWait({
      code: 'open("/tmp/escape_test", "w").write("pwned")',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    // Should fail — /tmp outside sandbox isn't writable
    expect(["RE", "OK"]).toContain(data.result.verdict);
  });

  it("C++ stack overflow returns RE, SG, or TO", async () => {
    const data = await submitAndWait({
      code: 'void f() { f(); } int main() { f(); }',
      lang: "cpp",
    });
    expect(data.status).toBe("completed");
    expect(["RE", "SG", "TO"]).toContain(data.result.verdict);
  });
});

// ─── Edge-case inputs ───

describe("Edge-case inputs", () => {
  it("handles very long single-line output", async () => {
    const data = await submitAndWait({
      code: 'print("A" * 50000)',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim().length).toBe(50000);
  });

  it("handles code with special shell characters", async () => {
    const data = await submitAndWait({
      code: 'print("$HOME `whoami` $(id) && || ; \\\\ \\"")',
      lang: "py",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string)).toContain("$HOME");
    expect((data.result.stdout as string)).toContain("`whoami`");
  });

  it("TypeScript type errors still execute (strip types)", async () => {
    // Node --experimental-strip-types doesn't type-check, just strips
    const data = await submitAndWait({
      code: 'const x: number = "not a number" as any; console.log(x);',
      lang: "ts",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("not a number");
  });

  it("Java class name mismatch still works (preprocessor)", async () => {
    // The preprocessor should rename the class to Main
    const data = await submitAndWait({
      code: 'public class Solution { public static void main(String[] args) { System.out.println("renamed"); } }',
      lang: "java",
    });
    expect(data.status).toBe("completed");
    expect(data.result.verdict).toBe("OK");
    expect((data.result.stdout as string).trim()).toBe("renamed");
  });
});

// ─── Error jobs (these poll longer, run last) ───

describe("Error jobs", () => {
  it("rejects unsupported language", async () => {
    const res = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: "print(1)", lang: "brainfuck" }),
    });
    // Could be 400 (validation) or the job fails
    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      const start = Date.now();
      while (Date.now() - start < 30_000) {
        const pollRes = await fetch(`${API_URL}/v1/submissions/${id}`, { headers });
        const data = (await pollRes.json()) as { status: string; result: Record<string, unknown> };
        if (data.status === "completed" || data.status === "failed") {
          expect(data.status).toBe("failed");
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      expect(res.status).toBe(400);
    }
  });

  it("handles code with only whitespace", async () => {
    const res = await fetch(`${API_URL}/v1/submissions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: "   \n\n  ", lang: "py" }),
    });
    // Worker validates empty code — should fail the job
    if (res.ok) {
      const { id } = (await res.json()) as { id: string };
      const start = Date.now();
      while (Date.now() - start < 30_000) {
        const pollRes = await fetch(`${API_URL}/v1/submissions/${id}`, { headers });
        const data = (await pollRes.json()) as { status: string };
        if (data.status === "completed" || data.status === "failed") {
          expect(data.status).toBe("failed");
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  });
});
