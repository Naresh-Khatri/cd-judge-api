import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "child_process";

import IsolateRunner from "../utils/isolate-runner";

/**
 * Integration tests for all supported languages.
 * Requires `isolate` and language runtimes to be installed.
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

function isRuntimeAvailable(binary: string): boolean {
  try {
    execSync(`which ${binary}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describeIf("Language integration tests", () => {
  let runner: IsolateRunner;
  let boxId = 800;

  beforeAll(() => {
    runner = new IsolateRunner();
  });

  afterAll(() => {
    // cleanup any remaining boxes
    for (let i = 800; i <= boxId; i++) {
      try {
        execSync(`isolate -b ${i} --cleanup`, { stdio: "ignore" });
      } catch {
        // ignore
      }
    }
  });

  const nextBoxId = () => boxId++;

  const langTests: Array<{
    lang: string;
    binary: string;
    hello: string;
    compileError?: string;
    stdinCode: string;
  }> = [
    {
      lang: "py",
      binary: "python3",
      hello: 'print("Hello")',
      stdinCode: "print(input())",
    },
    {
      lang: "js",
      binary: "node",
      hello: 'console.log("Hello")',
      stdinCode:
        'const lines = require("fs").readFileSync("/dev/stdin","utf8"); console.log(lines.trim());',
    },
    {
      lang: "cpp",
      binary: "g++",
      hello: '#include <iostream>\nint main() { std::cout << "Hello"; }',
      compileError: "int main() { undeclared; }",
      stdinCode:
        '#include <iostream>\n#include <string>\nint main() { std::string s; std::getline(std::cin, s); std::cout << s; }',
    },
    {
      lang: "c",
      binary: "gcc",
      hello: '#include <stdio.h>\nint main() { printf("Hello"); }',
      compileError: "int main() { undeclared; }",
      stdinCode:
        '#include <stdio.h>\nint main() { char s[256]; fgets(s, 256, stdin); printf("%s", s); }',
    },
    {
      lang: "java",
      binary: "javac",
      hello: 'public class main { public static void main(String[] args) { System.out.print("Hello"); } }',
      compileError:
        "public class main { public static void main(String[] args) { undeclared; } }",
      stdinCode:
        'import java.util.Scanner; public class main { public static void main(String[] args) { Scanner sc = new Scanner(System.in); System.out.print(sc.nextLine()); } }',
    },
    {
      lang: "rs",
      binary: "rustc",
      hello: 'fn main() { print!("Hello"); }',
      compileError: "fn main() { undeclared; }",
      stdinCode:
        'use std::io; fn main() { let mut s = String::new(); io::stdin().read_line(&mut s).unwrap(); print!("{}", s.trim()); }',
    },
    {
      lang: "go",
      binary: "go",
      hello: 'package main\nimport "fmt"\nfunc main() { fmt.Print("Hello") }',
      compileError: "package main\nfunc main() { undeclared }",
      stdinCode:
        'package main\nimport ("bufio"; "fmt"; "os")\nfunc main() { scanner := bufio.NewScanner(os.Stdin); scanner.Scan(); fmt.Print(scanner.Text()) }',
    },
    {
      lang: "rb",
      binary: "ruby",
      hello: 'print "Hello"',
      stdinCode: "print gets.chomp",
    },
    {
      lang: "php",
      binary: "php",
      hello: '<?php echo "Hello"; ?>',
      stdinCode: "<?php echo trim(fgets(STDIN)); ?>",
    },
  ];

  for (const t of langTests) {
    const available = isRuntimeAvailable(t.binary);
    const d = available ? describe : describe.skip;

    d(`${t.lang}`, () => {
      it("hello world", async () => {
        const result = await runner.runCode({
          lang: t.lang as any,
          code: t.hello,
          boxId: nextBoxId(),
        });
        expect(result.verdict).toBe("OK");
        expect(result.stdout?.trim()).toBe("Hello");
      });

      if (t.compileError) {
        it("compile error", async () => {
          const result = await runner.runCode({
            lang: t.lang as any,
            code: t.compileError!,
            boxId: nextBoxId(),
          });
          expect(result.verdict).toBe("CE");
        });
      }

      it("reads stdin", async () => {
        const result = await runner.runCode({
          lang: t.lang as any,
          code: t.stdinCode,
          stdin: "test_input",
          boxId: nextBoxId(),
        });
        expect(result.verdict).toBe("OK");
        expect(result.stdout?.trim()).toBe("test_input");
      });
    });
  }
});
