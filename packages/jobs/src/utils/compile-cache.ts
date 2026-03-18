import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { env } from "../config/env";

const CACHE_DIR = env.COMPILE_CACHE_DIR;
const MAX_ENTRIES = env.COMPILE_CACHE_MAX_ENTRIES;

// Compiled languages that benefit from caching
const CACHEABLE_LANGS = new Set(["cpp", "c", "java", "rs", "go"]);

/**
 * Compute a cache key from code content and language.
 */
function cacheKey(code: string, lang: string): string {
  return createHash("sha256").update(`${lang}:${code}`).digest("hex");
}

function cachePath(key: string): string {
  return path.join(CACHE_DIR, key);
}

/**
 * Ensure the cache directory exists.
 */
async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

/**
 * Check if a cached compiled artifact exists for the given code + language.
 * Returns the path to the cached artifact, or null if not cached.
 */
export async function getCachedArtifact(
  code: string,
  lang: string,
): Promise<string | null> {
  if (!CACHEABLE_LANGS.has(lang)) return null;

  const key = cacheKey(code, lang);
  const p = cachePath(key);

  try {
    await fs.access(p);
    // Touch the file to update mtime for LRU
    const now = new Date();
    await fs.utimes(p, now, now);
    return p;
  } catch {
    return null;
  }
}

/**
 * Store a compiled artifact in the cache.
 * Performs LRU eviction if the cache exceeds MAX_ENTRIES.
 */
export async function storeArtifact(
  code: string,
  lang: string,
  artifactPath: string,
): Promise<void> {
  if (!CACHEABLE_LANGS.has(lang)) return;

  await ensureCacheDir();

  const key = cacheKey(code, lang);
  const dest = cachePath(key);

  await fs.copyFile(artifactPath, dest);

  // LRU eviction
  await evictIfNeeded();
}

/**
 * Evict oldest entries (by mtime) if cache exceeds MAX_ENTRIES.
 */
async function evictIfNeeded(): Promise<void> {
  try {
    const entries = await fs.readdir(CACHE_DIR);
    if (entries.length <= MAX_ENTRIES) return;

    const stats = await Promise.all(
      entries.map(async (name) => {
        const fullPath = path.join(CACHE_DIR, name);
        const stat = await fs.stat(fullPath);
        return { path: fullPath, mtime: stat.mtimeMs };
      }),
    );

    // Sort oldest first
    stats.sort((a, b) => a.mtime - b.mtime);

    const toEvict = stats.length - MAX_ENTRIES;
    for (let i = 0; i < toEvict; i++) {
      await fs.unlink(stats[i]!.path);
    }
  } catch {
    // Non-fatal — cache eviction failure shouldn't break execution
  }
}
