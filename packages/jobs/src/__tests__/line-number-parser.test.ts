import { describe, expect, it } from "vitest";

import { parseErrorLineNumber } from "../utils/line-number-parser";

describe("parseErrorLineNumber", () => {
  it("parses Java error line", () => {
    const stderr = `main.java:5: error: ';' expected`;
    expect(parseErrorLineNumber(stderr, "java")).toBe(5);
  });

  it("parses JavaScript error line", () => {
    const stderr = `TypeError: x is not a function\n    at Object.<anonymous> (main.js:3:1)`;
    expect(parseErrorLineNumber(stderr, "js")).toBe(3);
  });

  it("parses Python error line", () => {
    const stderr = `  File "main.py", line 7, in <module>`;
    expect(parseErrorLineNumber(stderr, "py")).toBe(7);
  });

  it("parses C++ error line", () => {
    const stderr = `main.cpp:10:5: error: expected ';'`;
    expect(parseErrorLineNumber(stderr, "cpp")).toBe(10);
  });

  it("parses C error line (same as C++)", () => {
    const stderr = `main.c:2:10: fatal error: missing.h: No such file`;
    expect(parseErrorLineNumber(stderr, "c")).toBe(2);
  });

  it("parses Rust error line", () => {
    const stderr = `error[E0308]: mismatched types\n --> main.rs:4:5`;
    expect(parseErrorLineNumber(stderr, "rs")).toBe(4);
  });

  it("parses Go error line", () => {
    const stderr = `./main.go:8:2: undefined: fmt.Printlnx`;
    expect(parseErrorLineNumber(stderr, "go")).toBe(8);
  });

  it("parses TypeScript error line (same as JS)", () => {
    const stderr = `TypeError: x is not a function\n    at Object.<anonymous> (main.ts:12:1)`;
    expect(parseErrorLineNumber(stderr, "ts")).toBe(12);
  });

  it("parses Ruby error line", () => {
    const stderr = `main.rb:3:in '<main>': undefined local variable`;
    expect(parseErrorLineNumber(stderr, "rb")).toBe(3);
  });

  it("parses PHP error line", () => {
    const stderr = `Parse error: syntax error in /box/main.php on line 5`;
    expect(parseErrorLineNumber(stderr, "php")).toBe(5);
  });

  it("returns null for empty stderr", () => {
    expect(parseErrorLineNumber("", "py")).toBeNull();
  });

  it("returns null for unrecognized format", () => {
    expect(parseErrorLineNumber("some random error", "js")).toBeNull();
  });
});
