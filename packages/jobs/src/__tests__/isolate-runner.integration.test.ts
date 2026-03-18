import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "child_process";

import IsolateRunner from "../utils/isolate-runner";

/**
 * Integration tests — require `isolate` to be installed on the host.
 * Run with: pnpm test:integration
 */

let isolateAvailable = false;

try {
  execSync("which isolate", { stdio: "ignore" });
  isolateAvailable = true;
} catch {
  // isolate not available
}

const describeIf = isolateAvailable ? describe : describe.skip;

describeIf("IsolateRunner integration", () => {
  let runner: IsolateRunner;
  let boxId = 900; // use high box IDs to avoid conflicts

  beforeAll(() => {
    runner = new IsolateRunner();
  });

  afterAll(() => {
    try {
      execSync(`isolate -b ${boxId} --cleanup`, { stdio: "ignore" });
    } catch {
      // ignore
    }
  });

  const nextBoxId = () => boxId++;

  it("runs Python hello world", async () => {
    const result = await runner.runCode({
      lang: "py",
      code: 'print("Hello, World!")',
      boxId: nextBoxId(),
    });
    expect(result.verdict).toBe("OK");
    expect(result.stdout?.trim()).toBe("Hello, World!");
  });

  it("runs JavaScript hello world", async () => {
    const result = await runner.runCode({
      lang: "js",
      code: 'console.log("Hello, World!");',
      boxId: nextBoxId(),
    });
    expect(result.verdict).toBe("OK");
    expect(result.stdout?.trim()).toBe("Hello, World!");
  });

  it("returns CE for Python syntax error", async () => {
    const result = await runner.runCode({
      lang: "py",
      code: "def foo(\n",
      boxId: nextBoxId(),
    });
    // Python syntax errors show up as RE since Python is interpreted
    expect(["CE", "RE"]).toContain(result.verdict);
  });

  it("returns CE for C++ compile error", async () => {
    const result = await runner.runCode({
      lang: "cpp",
      code: "int main() { undeclared_var; }",
      boxId: nextBoxId(),
    });
    expect(result.verdict).toBe("CE");
  });

  it("reads stdin correctly", async () => {
    const result = await runner.runCode({
      lang: "py",
      code: "print(input())",
      stdin: "test input",
      boxId: nextBoxId(),
    });
    expect(result.verdict).toBe("OK");
    expect(result.stdout?.trim()).toBe("test input");
  });

  it("rejects oversized code", async () => {
    const bigCode = "x".repeat(65 * 1024);
    await expect(
      runner.runCode({
        lang: "py",
        code: bigCode,
        boxId: nextBoxId(),
      }),
    ).rejects.toThrow("Code size");
  });

  it("rejects empty code", async () => {
    await expect(
      runner.runCode({
        lang: "py",
        code: "   ",
        boxId: nextBoxId(),
      }),
    ).rejects.toThrow("Code is required");
  });
});
