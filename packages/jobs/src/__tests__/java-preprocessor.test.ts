import { describe, expect, it } from "vitest";

import { preprocessCode, renameJavaPublicClass } from "../utils/preprocessors";

describe("preprocessCode", () => {
  it("renames public class for java", () => {
    const code = `public class Solution { public static void main(String[] args) {} }`;
    const result = preprocessCode("java", code);
    expect(result).toContain("public class main");
    expect(result).not.toContain("Solution");
  });

  it("does not modify other languages", () => {
    const code = `print("hello")`;
    expect(preprocessCode("py", code)).toBe(code);
    expect(preprocessCode("js", code)).toBe(code);
  });
});

describe("renameJavaPublicClass", () => {
  it("renames a basic public class", () => {
    const code = `public class Hello {\n  public static void main(String[] args) {\n    System.out.println("hi");\n  }\n}`;
    const result = renameJavaPublicClass(code);
    expect(result).toContain("public class main");
    expect(result).not.toContain("Hello");
  });

  it("does not rename if already named main", () => {
    const code = `public class main { }`;
    expect(renameJavaPublicClass(code)).toBe(code);
  });

  it("ignores class name inside a string literal", () => {
    const code = `public class main {\n  String s = "public class Foo";\n}`;
    const result = renameJavaPublicClass(code);
    // Should remain unchanged — main is already correct, "Foo" is in a string
    expect(result).toBe(code);
    expect(result).toContain('"public class Foo"');
  });

  it("ignores class name inside a comment", () => {
    const code = `// public class WrongName\npublic class RealName { }`;
    const result = renameJavaPublicClass(code);
    expect(result).toContain("public class main");
    // The comment should remain untouched
    expect(result).toContain("// public class WrongName");
  });

  it("ignores class name inside a block comment", () => {
    const code = `/* public class Commented */\npublic class Actual { }`;
    const result = renameJavaPublicClass(code);
    expect(result).toContain("public class main");
    expect(result).toContain("/* public class Commented */");
  });

  it("handles inner classes without renaming them", () => {
    const code = `public class Outer {\n  class Inner { }\n}`;
    const result = renameJavaPublicClass(code);
    expect(result).toContain("public class main");
    expect(result).toContain("class Inner");
  });

  it("handles no public class", () => {
    const code = `class Foo { }`;
    expect(renameJavaPublicClass(code)).toBe(code);
  });

  it("handles annotations before the class", () => {
    const code = `@SuppressWarnings("unchecked")\npublic class Solution { }`;
    const result = renameJavaPublicClass(code);
    expect(result).toContain("public class main");
    expect(result).toContain("@SuppressWarnings");
  });
});
