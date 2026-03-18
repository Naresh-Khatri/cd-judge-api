export interface ComparisonResult {
  match: boolean;
  details?: string;
}

export type Comparator = (
  actual: string,
  expected: string,
) => ComparisonResult;

/**
 * Exact byte-for-byte comparison.
 */
export const exactMatch: Comparator = (actual, expected) => ({
  match: actual === expected,
});

/**
 * Whitespace-normalized token comparison.
 * Splits on whitespace and compares token-by-token.
 */
export const tokenMatch: Comparator = (actual, expected) => {
  const actualTokens = actual.trim().split(/\s+/);
  const expectedTokens = expected.trim().split(/\s+/);

  if (actualTokens.length !== expectedTokens.length) {
    return {
      match: false,
      details: `Token count mismatch: got ${actualTokens.length}, expected ${expectedTokens.length}`,
    };
  }

  for (let i = 0; i < actualTokens.length; i++) {
    if (actualTokens[i] !== expectedTokens[i]) {
      return {
        match: false,
        details: `Token ${i} mismatch: got "${actualTokens[i]}", expected "${expectedTokens[i]}"`,
      };
    }
  }

  return { match: true };
};

/**
 * Floating-point comparison with epsilon tolerance.
 * Each token is compared as a number if both sides parse as numbers,
 * otherwise falls back to exact string comparison.
 */
export function floatTolerance(epsilon: number = 1e-6): Comparator {
  return (actual, expected) => {
    const actualTokens = actual.trim().split(/\s+/);
    const expectedTokens = expected.trim().split(/\s+/);

    if (actualTokens.length !== expectedTokens.length) {
      return {
        match: false,
        details: `Token count mismatch: got ${actualTokens.length}, expected ${expectedTokens.length}`,
      };
    }

    for (let i = 0; i < actualTokens.length; i++) {
      const a = Number(actualTokens[i]);
      const e = Number(expectedTokens[i]);

      if (!isNaN(a) && !isNaN(e)) {
        if (Math.abs(a - e) > epsilon) {
          return {
            match: false,
            details: `Token ${i} float mismatch: got ${a}, expected ${e} (epsilon=${epsilon})`,
          };
        }
      } else if (actualTokens[i] !== expectedTokens[i]) {
        return {
          match: false,
          details: `Token ${i} mismatch: got "${actualTokens[i]}", expected "${expectedTokens[i]}"`,
        };
      }
    }

    return { match: true };
  };
}
