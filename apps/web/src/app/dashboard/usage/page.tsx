"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, Key, ShieldCheck, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "~/components/ui/card";
import { USAGE_DATA } from "~/lib/mock-data";
import { useTRPC } from "~/trpc/react";

const languageData = [
  { name: "Python", value: 5400 },
  { name: "JavaScript", value: 3200 },
  { name: "C++", value: 1200 },
  { name: "Go", value: 800 },
];

const COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

export default function UsageView() {
  const trpc = useTRPC();
  const { data: apiKeys } = useSuspenseQuery(trpc.apiKey.list.queryOptions());

  const [selectedKeyId, setSelectedKeyId] = useState<string>("all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 text-2xl font-bold">Usage & Limits</h2>
          <p className="text-muted-foreground text-sm">
            Monitor your execution quotas and system health.
          </p>
        </div>

        {/* API Key Filter */}
        <div className="group relative">
          <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
            <Key size={14} />
          </div>
          <select
            value={selectedKeyId}
            onChange={(e) => setSelectedKeyId(e.target.value)}
            className="bg-card border-border text-foreground focus:border-primary focus:ring-ring w-full min-w-[200px] appearance-none rounded-lg border py-2 pr-8 pl-9 text-sm focus:ring-1 focus:outline-none sm:w-auto"
          >
            <option value="all">All API Keys</option>
            {apiKeys.map((key) => (
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
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Limit Card */}
        <Card className="relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={60} className="text-primary" />
          </div>
          <h3 className="text-muted-foreground mb-4 text-sm font-medium uppercase">
            Monthly Quota
          </h3>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-3xl font-bold">
              {selectedKeyId === "all" ? "124.5k" : "42.1k"}
            </span>
            <span className="text-muted-foreground mb-1">/ 500k</span>
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: selectedKeyId === "all" ? "25%" : "8%" }}
            ></div>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Resets on Nov 1st
          </p>
        </Card>

        {/* Rate Limit Card */}
        <Card className="p-6">
          <h3 className="text-muted-foreground mb-4 text-sm font-medium uppercase">
            Current Rate Limit
          </h3>
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={24} />
            <span className="text-xl font-bold">600 req / min</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Your plan allows for bursts up to 1000 requests.{" "}
            <span className="text-primary cursor-pointer hover:underline">
              Upgrade
            </span>{" "}
            for more.
          </p>
        </Card>

        {/* Error Rate Card */}
        <Card className="p-6">
          <h3 className="text-muted-foreground mb-4 text-sm font-medium uppercase">
            Error Rate (24h)
          </h3>
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="text-amber-500" size={24} />
            <span className="text-xl font-bold">
              {selectedKeyId === "all" ? "0.4%" : "0.1%"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Most errors are{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              400 Bad Request
            </code>{" "}
            due to syntax errors in submitted code.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request Breakdown Chart */}
        <Card className="h-[400px] p-6">
          <h3 className="mb-6 text-lg font-semibold">Execution Status (24h)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={USAGE_DATA} barSize={20}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground)",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
              <Bar
                dataKey="successful"
                stackId="a"
                fill="var(--primary)"
                name="Successful"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="failed"
                stackId="a"
                fill="var(--destructive)"
                name="Failed"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Language Distribution */}
        <Card className="h-[400px] p-6">
          <h3 className="mb-2 text-lg font-semibold">Top Languages</h3>
          <p className="text-muted-foreground mb-6 text-sm">
            Distribution of runtimes used in your requests.
          </p>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={languageData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {languageData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="rgba(0,0,0,0)"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  borderRadius: "8px",
                  color: "var(--popover-foreground)",
                }}
              />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
