"use client";

import { useCallback, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  Download,
  Key,
  MemoryStick,
  Play,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useTRPC } from "~/trpc/react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExecutionResult {
  verdict: "OK" | "CE" | "RE" | "SG" | "TO" | "XX";
  time: number;
  memory: number;
  lineNumber?: number | null;
  stdout?: string;
  stderr?: string;
  errorType?: string;
  exitCode?: number;
  exitSignal?: number;
}

interface TestResult {
  id: string;
  language: string;
  status: string;
  verdict: string;
  submissionLatency: number;
  queueTime: number;
  executionTime: number;
  totalTime: number;
  memory: number;
  cpuTime: number;
  submittedAt: number;
  processedAt: number;
  finishedAt: number;
  result: ExecutionResult | null;
}

interface AggregatedStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  avgMemory: number;
  maxMemory: number;
  avgCpuTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { id: "py", name: "Python 3.10", icon: "🐍" },
  { id: "js", name: "Node.js 18", icon: "📜" },
  { id: "java", name: "Java 17", icon: "☕" },
  { id: "cpp", name: "C++ 17", icon: "⚙️" },
];

const BENCHMARK_CODE: Record<string, string> = {
  py: `# Fibonacci benchmark
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

result = fib(20)
print(f"Fibonacci(20) = {result}")`,
  js: `// Fibonacci benchmark
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

const result = fib(20);
console.log(\`Fibonacci(20) = \${result}\`);`,
  java: `public class Main {
    public static int fib(int n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    }
    
    public static void main(String[] args) {
        int result = fib(20);
        System.out.println("Fibonacci(20) = " + result);
    }
}`,
  cpp: `#include <iostream>

int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    int result = fib(20);
    std::cout << "Fibonacci(20) = " << result << std::endl;
    return 0;
}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function calculateStats(results: TestResult[]): AggregatedStats {
  if (results.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      avgMemory: 0,
      maxMemory: 0,
      avgCpuTime: 0,
    };
  }

  const successful = results.filter((r) => r.verdict === "OK");
  const latencies = results.map((r) => r.totalTime);
  const memories = results.map((r) => r.memory).filter((m) => m > 0);
  const cpuTimes = results.map((r) => r.cpuTime).filter((t) => t > 0);

  return {
    total: results.length,
    successful: successful.length,
    failed: results.length - successful.length,
    successRate: (successful.length / results.length) * 100,
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    minLatency: Math.min(...latencies),
    maxLatency: Math.max(...latencies),
    p50Latency: percentile(latencies, 50),
    p95Latency: percentile(latencies, 95),
    avgMemory:
      memories.length > 0
        ? memories.reduce((a, b) => a + b, 0) / memories.length
        : 0,
    maxMemory: memories.length > 0 ? Math.max(...memories) : 0,
    avgCpuTime:
      cpuTimes.length > 0
        ? cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length
        : 0,
  };
}

function exportToJSON(results: TestResult[], stats: AggregatedStats) {
  const data = { results, stats, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `perf-results-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToCSV(results: TestResult[]) {
  const headers = [
    "id",
    "language",
    "status",
    "verdict",
    "time_ms",
    "memory_kb",
    "queue_time_ms",
    "exec_time_ms",
    "total_time_ms",
  ];
  const rows = results.map((r) =>
    [
      r.id,
      r.language,
      r.status,
      r.verdict,
      r.cpuTime.toFixed(2),
      r.memory,
      r.queueTime.toFixed(2),
      r.executionTime.toFixed(2),
      r.totalTime.toFixed(2),
    ].join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `perf-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PerformanceView() {
  const trpc = useTRPC();
  const { data: apiKeys } = useSuspenseQuery(trpc.apiKey.list.queryOptions());

  // Config State
  const [language, setLanguage] = useState<string>("py");
  const [code, setCode] = useState<string>(BENCHMARK_CODE.py ?? "");
  const [iterations, setIterations] = useState(5);
  const [concurrency, setConcurrency] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [compareMode, setCompareMode] = useState(false);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);

  const activeKeys = apiKeys.filter((k) => k.status === "active");
  const [selectedKeyId, setSelectedKeyId] = useState<string>(
    activeKeys.length > 0 ? activeKeys[0]!.id : "",
  );

  const stats = calculateStats(results);

  // ─────────────────────────────────────────────────────────────────────────
  // Execution Logic
  // ─────────────────────────────────────────────────────────────────────────

  const runSingleTest = useCallback(
    async (lang: string, testCode: string): Promise<TestResult> => {
      const key = activeKeys.find((k) => k.id === selectedKeyId);
      if (!key) throw new Error("No API key selected");

      const startTime = performance.now();

      // Submit job
      const res = await fetch("/api/v1/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key.id}`,
        },
        body: JSON.stringify({ code: testCode, lang }),
      });

      const submissionLatency = performance.now() - startTime;

      if (!res.ok) throw new Error(`Submit failed: ${res.statusText}`);
      const { id } = await res.json();

      // Poll for result
      let jobData: {
        id: string;
        status: string;
        result: ExecutionResult | null;
        submittedAt: number;
        processedAt: number;
        finishedAt: number;
      } | null = null;

      while (true) {
        const pollRes = await fetch(`/api/v1/submissions/${id}`, {
          headers: { Authorization: `Bearer ${key.id}` },
        });

        if (!pollRes.ok) throw new Error(`Poll failed: ${pollRes.statusText}`);

        jobData = await pollRes.json();

        if (jobData!.status === "completed" || jobData!.status === "failed") {
          break;
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      const totalTime = performance.now() - startTime;
      const queueTime = jobData!.processedAt
        ? jobData!.processedAt - jobData!.submittedAt
        : 0;
      const executionTime =
        jobData!.finishedAt && jobData!.processedAt
          ? jobData!.finishedAt - jobData!.processedAt
          : 0;

      return {
        id: jobData!.id,
        language: lang,
        status: jobData!.status,
        verdict: jobData!.result?.verdict || "XX",
        submissionLatency,
        queueTime,
        executionTime,
        totalTime,
        memory: jobData!.result?.memory || 0,
        cpuTime: jobData!.result?.time || 0,
        submittedAt: jobData!.submittedAt,
        processedAt: jobData!.processedAt,
        finishedAt: jobData!.finishedAt,
        result: jobData!.result,
      };
    },
    [activeKeys, selectedKeyId],
  );

  const handleRun = useCallback(async () => {
    if (!selectedKeyId) return;

    setIsRunning(true);
    setResults([]);
    setCurrentRun(0);

    try {
      const langsToTest = compareMode ? LANGUAGES.map((l) => l.id) : [language];

      for (const lang of langsToTest) {
        const benchmarkCode = BENCHMARK_CODE[lang];
        let testCode = code;
        if (compareMode && benchmarkCode !== undefined) {
          testCode = benchmarkCode;
        }

        if (concurrency === "sequential") {
          for (let i = 0; i < iterations; i++) {
            setCurrentRun((prev) => prev + 1);
            const result = await runSingleTest(lang, testCode);
            setResults((prev) => [...prev, result]);
          }
        } else {
          // Parallel execution
          const promises = Array(iterations)
            .fill(null)
            .map(() => {
              setCurrentRun((prev) => prev + 1);
              return runSingleTest(lang, testCode);
            });

          const parallelResults = await Promise.all(promises);
          setResults((prev) => [...prev, ...parallelResults]);
        }
      }
    } catch (error) {
      console.error("Test run failed:", error);
    } finally {
      setIsRunning(false);
    }
  }, [
    selectedKeyId,
    compareMode,
    language,
    code,
    iterations,
    concurrency,
    runSingleTest,
  ]);

  const handleReset = () => {
    setResults([]);
    setCurrentRun(0);
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(BENCHMARK_CODE[lang] || "");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Chart Data
  // ─────────────────────────────────────────────────────────────────────────

  const latencyChartData = results.map((r, idx) => ({
    run: idx + 1,
    latency: Math.round(r.totalTime),
    language: r.language,
  }));

  const memoryChartData = results.map((r, idx) => ({
    run: idx + 1,
    memory: Math.round(r.memory),
    language: r.language,
  }));

  const totalRuns = compareMode ? LANGUAGES.length * iterations : iterations;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Zap className="text-primary" />
            Performance Testing
          </h2>
          <p className="text-muted-foreground text-sm">
            Benchmark and stress-test the code execution engine
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
          </div>

          <div className="bg-border mx-1 hidden h-8 w-px sm:block" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            title="Reset Results"
            disabled={isRunning}
          >
            <RotateCcw size={20} />
          </Button>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Config Options */}
          <div className="space-y-4">
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Test Configuration
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Language */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={compareMode}
                  className="bg-muted border-border text-foreground focus:border-primary w-full rounded-lg border p-2 text-sm focus:outline-none disabled:opacity-50"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.icon} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Iterations */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Iterations: {iterations}
                </label>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={iterations}
                  onChange={(e) => setIterations(parseInt(e.target.value))}
                  className="w-full accent-[hsl(var(--primary))]"
                />
              </div>

              {/* Concurrency */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Concurrency</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConcurrency("sequential")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      concurrency === "sequential"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted hover:bg-muted/80"
                    }`}
                  >
                    Sequential
                  </button>
                  <button
                    onClick={() => setConcurrency("parallel")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      concurrency === "parallel"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted hover:bg-muted/80"
                    }`}
                  >
                    Parallel
                  </button>
                </div>
              </div>

              {/* Compare Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Compare Mode</label>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors ${
                    compareMode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted hover:bg-muted/80"
                  }`}
                >
                  {compareMode
                    ? "✓ Comparing All Languages"
                    : "Compare Languages"}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={handleRun}
                disabled={isRunning || !selectedKeyId || iterations < 1}
                className="shadow-lg"
              >
                <Play size={18} fill={isRunning ? "none" : "currentColor"} />
                {isRunning
                  ? `Running ${currentRun}/${totalRuns}...`
                  : "Run Test"}
              </Button>

              {results.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(results)}
                  >
                    <Download size={16} />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToJSON(results, stats)}
                  >
                    <Download size={16} />
                    Export JSON
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right: Code Editor */}
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Benchmark Code
            </label>
            <div className="group relative font-mono text-sm">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={compareMode}
                rows={10}
                className="bg-muted border-border text-foreground w-full resize-none rounded-lg border p-4 leading-relaxed focus:outline-none disabled:opacity-50"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="text-primary" size={18} />
              <span className="text-muted-foreground text-xs uppercase">
                Runs
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-emerald-500" size={18} />
              <span className="text-muted-foreground text-xs uppercase">
                Success
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {stats.successRate.toFixed(1)}%
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="text-amber-500" size={18} />
              <span className="text-muted-foreground text-xs uppercase">
                Avg Latency
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {Math.round(stats.avgLatency)}ms
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="text-red-500" size={18} />
              <span className="text-muted-foreground text-xs uppercase">
                P95
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {Math.round(stats.p95Latency)}ms
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <MemoryStick className="text-blue-500" size={18} />
              <span className="text-muted-foreground text-xs uppercase">
                Avg Mem
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {(stats.avgMemory / 1024).toFixed(1)}MB
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Cpu className="text-purple-500" size={18} />
              <span className="text-muted-foreground text-xs uppercase">
                Avg CPU
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {stats.avgCpuTime.toFixed(2)}ms
            </p>
          </Card>
        </div>
      )}

      {/* Charts */}
      {results.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Latency Chart */}
          <Card className="h-[350px] p-6">
            <h3 className="mb-4 text-lg font-semibold">Latency Over Runs</h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={latencyChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="run"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit="ms"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ fill: "var(--primary)", r: 3 }}
                  name="Total Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Memory Chart */}
          <Card className="h-[350px] p-6">
            <h3 className="mb-4 text-lg font-semibold">Memory Usage</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={memoryChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="run"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  unit="KB"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="memory"
                  fill="var(--chart-2)"
                  name="Memory (KB)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-muted/50 border-b px-6 py-4">
            <h3 className="text-lg font-semibold">Detailed Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Lang</th>
                  <th className="px-4 py-3 text-left font-medium">Verdict</th>
                  <th className="px-4 py-3 text-left font-medium">CPU Time</th>
                  <th className="px-4 py-3 text-left font-medium">Memory</th>
                  <th className="px-4 py-3 text-left font-medium">Queue</th>
                  <th className="px-4 py-3 text-left font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/20 border-b transition-colors"
                  >
                    <td className="text-muted-foreground px-4 py-3">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-muted rounded px-2 py-0.5 text-xs">
                        {r.language}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          r.verdict === "OK"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {r.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.cpuTime.toFixed(2)}ms</td>
                    <td className="px-4 py-3">
                      {(r.memory / 1024).toFixed(2)}MB
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {r.queueTime.toFixed(0)}ms
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.totalTime.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {results.length === 0 && !isRunning && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Zap className="text-muted-foreground mb-4" size={48} />
          <h3 className="mb-2 text-lg font-semibold">No Results Yet</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            Configure your test parameters above and click &quot;Run Test&quot;
            to start benchmarking the code execution engine.
          </p>
        </Card>
      )}
    </div>
  );
}
