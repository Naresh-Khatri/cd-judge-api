/**
 * Preprocess source code before writing to the sandbox.
 * Currently handles Java class renaming to "main".
 */
export function preprocessCode(lang: string, code: string): string {
  if (lang === "java") {
    return renameJavaPublicClass(code);
  }
  return code;
}

/**
 * Rename the public class in Java code to "main" so it matches the
 * expected filename (main.java).
 *
 * Strips comments and string literals before searching to avoid false matches
 * like `"public class Foo"` inside a string or `// public class Bar` in a comment.
 */
export function renameJavaPublicClass(code: string): string {
  // Build a "stripped" version where comments and strings are replaced with
  // same-length whitespace so character offsets stay aligned.
  const stripped = code
    // Block comments
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    // Line comments
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    // String literals (double-quoted, handling escapes)
    .replace(/"(?:[^"\\]|\\.)*"/g, (m) => " ".repeat(m.length))
    // Char literals
    .replace(/'(?:[^'\\]|\\.)*'/g, (m) => " ".repeat(m.length));

  // Find `public class <Name>` in the stripped text
  const match = /public\s+class\s+(\w+)/.exec(stripped);
  const className = match?.[1];
  if (!match || !className || className === "main") {
    return code;
  }

  // Replace at the exact offset in the original code
  const classNameStart = match.index + match[0].length - className.length;
  const classNameEnd = classNameStart + className.length;

  return code.slice(0, classNameStart) + "main" + code.slice(classNameEnd);
}
