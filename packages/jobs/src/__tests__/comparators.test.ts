import { describe, expect, it } from "vitest";

import { exactMatch, floatTolerance, tokenMatch } from "../utils/comparators";

describe("exactMatch", () => {
  it("matches identical strings", () => {
    expect(exactMatch("hello\n", "hello\n").match).toBe(true);
  });

  it("fails on different strings", () => {
    expect(exactMatch("hello\n", "world\n").match).toBe(false);
  });

  it("fails on whitespace differences", () => {
    expect(exactMatch("hello ", "hello").match).toBe(false);
  });
});

describe("tokenMatch", () => {
  it("matches when whitespace differs", () => {
    expect(tokenMatch("1  2\n3\n", "1 2 3").match).toBe(true);
  });

  it("fails on token mismatch", () => {
    const result = tokenMatch("1 2 3", "1 2 4");
    expect(result.match).toBe(false);
    expect(result.details).toContain("Token 2 mismatch");
  });

  it("fails on token count mismatch", () => {
    const result = tokenMatch("1 2", "1 2 3");
    expect(result.match).toBe(false);
    expect(result.details).toContain("Token count mismatch");
  });
});

describe("floatTolerance", () => {
  it("matches within epsilon", () => {
    const cmp = floatTolerance(0.01);
    expect(cmp("3.14159", "3.14160").match).toBe(true);
  });

  it("fails outside epsilon", () => {
    const cmp = floatTolerance(0.001);
    const result = cmp("3.14", "3.15");
    expect(result.match).toBe(false);
  });

  it("handles mixed numbers and strings", () => {
    const cmp = floatTolerance(0.01);
    expect(cmp("hello 3.14", "hello 3.14").match).toBe(true);
  });

  it("fails on non-numeric string mismatch", () => {
    const cmp = floatTolerance(0.01);
    const result = cmp("hello 3.14", "world 3.14");
    expect(result.match).toBe(false);
  });

  it("handles multiple tokens", () => {
    const cmp = floatTolerance(1e-5);
    expect(cmp("1.000001 2.000001", "1.0 2.0").match).toBe(true);
  });
});
