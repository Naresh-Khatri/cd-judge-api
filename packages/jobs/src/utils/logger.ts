type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

import { env } from "../config/env";

const isProd = env.NODE_ENV === "production";

function formatEntry(level: LogLevel, message: string, extra?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  };
}

function log(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
  const entry = formatEntry(level, message, extra);
  const output = isProd ? JSON.stringify(entry) : `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}${extra ? " " + JSON.stringify(extra) : ""}`;

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  info: (message: string, extra?: Record<string, unknown>) => log("info", message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => log("warn", message, extra),
  error: (message: string, extra?: Record<string, unknown>) => log("error", message, extra),
  debug: (message: string, extra?: Record<string, unknown>) => log("debug", message, extra),
};
