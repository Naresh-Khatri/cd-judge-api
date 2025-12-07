"use client";

import { useState } from "react";
import { Key, Play, RotateCcw, Save, Terminal } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Card } from "@acme/ui/card";

import { INITIAL_KEYS } from "~/lib/mock-data";

const LANGUAGES = [
  { id: "python", name: "Python 3.10", icon: "🐍" },
  { id: "javascript", name: "Node.js 18", icon: "📜" },
  { id: "go", name: "Go 1.20", icon: "🐹" },
  { id: "rust", name: "Rust 1.68", icon: "🦀" },
];

const DEFAULT_CODE = {
  python: `import sys

def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

print("Starting calculation...")
result = fibonacci(10)
print(f"Fibonacci(10) = {result}")
print("Done!")`,
  javascript: `console.log("Starting calculation...");

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(\`Fibonacci(10) = \${result}\`);
console.log("Done!");`,
  go: `package main

import "fmt"

func fibonacci(n int) int {
\tif n <= 1 {
\t\treturn n
\t}
\treturn fibonacci(n-1) + fibonacci(n-2)
}

func main() {
\tfmt.Println("Starting calculation...")
\tresult := fibonacci(10)
\tfmt.Printf("Fibonacci(10) = %d\\n", result)
\tfmt.Println("Done!")
}`,
  rust: `fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn main() {
    println!("Starting calculation...");
    let result = fibonacci(10);
    println!("Fibonacci(10) = {}", result);
    println!("Done!");
}`,
};

type LanguageType = keyof typeof DEFAULT_CODE;

export default function PlaygroundView() {
  const [language, setLanguage] = useState<LanguageType>("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [output, setOutput] = useState<string>("Ready to execute...");
  const [isRunning, setIsRunning] = useState(false);

  const activeKeys = INITIAL_KEYS.filter((k) => k.status === "active");
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    activeKeys.length > 0 ? activeKeys[0]!.id : "",
  );

  const handleLanguageChange = (lang: LanguageType) => {
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang]);
    setOutput("Ready to execute...");
  };

  const handleRun = () => {
    if (!selectedKeyId) {
      setOutput("Error: Please select a valid API Key to run code.");
      return;
    }

    setIsRunning(true);
    setOutput("Running...");

    setTimeout(() => {
      const key = INITIAL_KEYS.find((k) => k.id === selectedKeyId);
      setOutput(
        `> Executing ${language} script with key ${key?.prefix.slice(0, 10)}...\n> Allocating sandbox...\nStarting calculation...\nFibonacci(10) = 55\nDone!\n\nProcess exited with code 0\nExecution time: 45ms`,
      );
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-4">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Terminal className="text-primary" />
            Playground
          </h2>
          <p className="text-muted-foreground text-sm">
            Test your code in a secure, ephemeral sandbox environment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* API Key Selector */}
          <div className="group relative">
            <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              <Key size={14} />
            </div>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="bg-muted border-border text-foreground focus:border-primary focus:ring-ring min-w-[200px] appearance-none rounded-lg border py-2 pr-8 pl-9 text-sm focus:ring-1 focus:outline-none"
            >
              {activeKeys.length === 0 && (
                <option value="">No Active Keys</option>
              )}
              {activeKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} ({key.prefix.slice(0, 8)}...)
                </option>
              ))}
            </select>
            <div className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
              <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 1L5 5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="bg-border mx-1 hidden h-8 w-[1px] sm:block"></div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleLanguageChange(language)}
            title="Reset Code"
          >
            <RotateCcw size={20} />
          </Button>
          <Button variant="ghost" size="icon" title="Save Snippet">
            <Save size={20} />
          </Button>

          <Button
            onClick={handleRun}
            disabled={isRunning || !selectedKeyId}
            className="ml-2 shadow-lg"
          >
            <Play size={18} fill={isRunning ? "none" : "currentColor"} />
            {isRunning ? "Running..." : "Run Code"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Editor Pane */}
        <Card className="flex flex-col overflow-hidden p-0 shadow-sm lg:col-span-2">
          {/* Editor Header */}
          <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) =>
                    handleLanguageChange(e.target.value as LanguageType)
                  }
                  className="bg-muted border-border text-foreground focus:border-primary cursor-pointer appearance-none rounded-lg border py-1.5 pr-8 pl-3 text-sm focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.icon} {lang.name}
                    </option>
                  ))}
                </select>
                <div className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <span className="text-muted-foreground text-xs">
                main.
                {language === "python"
                  ? "py"
                  : language === "javascript"
                    ? "js"
                    : language === "rust"
                      ? "rs"
                      : "go"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground px-2 text-xs">
                Autosaved
              </span>
            </div>
          </div>

          {/* Editor Body */}
          <div className="group relative flex-1 font-mono text-sm">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-background text-foreground h-full w-full resize-none p-4 pl-12 leading-relaxed focus:outline-none"
              spellCheck={false}
            />
            {/* Line Numbers */}
            <div className="bg-muted/20 text-muted-foreground border-border/50 pointer-events-none absolute top-0 bottom-0 left-0 w-10 border-r pt-4 pr-3 text-right select-none">
              {code.split("\n").map((_, i) => (
                <div key={i} className="leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Output Pane */}
        <Card className="flex flex-col overflow-hidden p-0 shadow-sm">
          <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-3">
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Console Output
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOutput("")}
                title="Clear Console"
              >
                <RotateCcw size={14} />
              </Button>
            </div>
          </div>
          <div className="bg-background flex-1 overflow-auto p-4 font-mono text-sm">
            <pre className="text-muted-foreground whitespace-pre-wrap">
              {output.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={`${line.startsWith(">") ? "text-primary" : "text-foreground"} mb-1`}
                >
                  {line}
                </div>
              ))}
              {isRunning && <div className="text-primary animate-pulse">_</div>}
            </pre>
          </div>
          <div className="bg-muted/30 text-muted-foreground flex justify-between border-t p-3 text-xs">
            <span>Memory: 12MB</span>
            <span>CPU: 0.04s</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
