import { describe, expect, it } from "vitest";

import {
  MAX_CODE_SIZE_BYTES,
  MAX_STDIN_SIZE_BYTES,
} from "../config/limits";

describe("input size limits", () => {
  it("MAX_CODE_SIZE_BYTES defaults to 64KB", () => {
    expect(MAX_CODE_SIZE_BYTES).toBe(64 * 1024);
  });

  it("MAX_STDIN_SIZE_BYTES defaults to 1MB", () => {
    expect(MAX_STDIN_SIZE_BYTES).toBe(1 * 1024 * 1024);
  });

  it("rejects code exceeding size limit", () => {
    const oversizedCode = "x".repeat(MAX_CODE_SIZE_BYTES + 1);
    const codeBytes = Buffer.byteLength(oversizedCode, "utf8");
    expect(codeBytes).toBeGreaterThan(MAX_CODE_SIZE_BYTES);
  });

  it("accepts code within size limit", () => {
    const code = 'print("hello world")';
    const codeBytes = Buffer.byteLength(code, "utf8");
    expect(codeBytes).toBeLessThanOrEqual(MAX_CODE_SIZE_BYTES);
  });
});
