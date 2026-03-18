import { Language } from "../types";

/**
 * Parse the error line number from stderr output for a given language.
 */
export const parseErrorLineNumber = (
  stderr: string,
  lang: Language,
): number | null => {
  let regex: RegExp;

  switch (lang) {
    case "java":
      // Java: "ClassName.java:lineNumber"
      regex = /([^:]+):(\d+)(?::\d+)?(?:\)|:)/;
      break;
    case "js":
    case "ts":
      // JavaScript/TypeScript: "at Object.<anonymous> (file.js:lineNumber:column)"
      regex = /at .+\((.*\.(?:js|ts)):(\d+):\d+\)/;
      break;
    case "py":
      // Python: 'File "file.py", line lineNumber'
      regex = /File "([^"]+)", line (\d+)/;
      break;
    case "cpp":
    case "c":
      // C/C++: "file.cpp:lineNumber:column:"
      regex = /([^:]+):(\d+):\d+:/;
      break;
    case "rs":
      // Rust: " --> file.rs:lineNumber:column"
      regex = /--> ([^:]+):(\d+):\d+/;
      break;
    case "go":
      // Go: "./main.go:lineNumber:column:"
      regex = /([^:]+):(\d+):\d+:/;
      break;
    case "rb":
      // Ruby: "file.rb:lineNumber:in `method'"
      regex = /([^:]+):(\d+):/;
      break;
    case "php":
      // PHP: "in /path/file.php on line lineNumber"
      regex = /in ([^\s]+) on line (\d+)/;
      break;
    default:
      return null;
  }

  const match = stderr.match(regex);
  if (match?.[2]) {
    return parseInt(match[2], 10);
  }

  return null;
};
