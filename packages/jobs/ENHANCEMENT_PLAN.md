# packages/jobs Enhancement Plan — CD Judge

## Context

`packages/jobs` is the core code execution engine for CD Judge (a judge0 alternative). It uses Linux `isolate` with cgroup v2 for sandboxing, BullMQ for job queues, and supports 4 languages. While the foundation is solid (7/10), 18 issues were identified ranging from critical safety bugs to nice-to-have improvements. This plan addresses all 18 in 5 phases, ordered by risk and dependency.

---

## Phase 1: Safety-Critical Fixes

**Issues**: #1 Box ID collision, #2 execSync no timeout, #3 No input size limits, #4 Memory limit docs, #8 No network isolation verification

**Goal**: Eliminate data corruption risks, resource exhaustion vectors, and document assumptions.

### 1.1 — Atomic Box ID Pool (Issue #1)

**Problem**: `Math.floor(Math.random() * 1000)` with concurrency 10 gives ~4% collision chance per batch. Two jobs in the same box = data corruption or sandbox escape.

**Create** `packages/jobs/src/utils/box-id-pool.ts`:
- Redis-backed pool using `RPOPLPUSH` from `isolate:box:free` → `isolate:box:used` sets
- `acquireBoxId(redis): Promise<number>` — blocks/throws if pool exhausted
- `releaseBoxId(redis, id): Promise<void>` — returns ID to free pool
- `initializeBoxPool(redis, maxBoxId): Promise<void>` — seeds pool on startup
- Pool size = `MAX_BOX_ID` (env-configurable, default = `WORKER_CONCURRENCY * 2`)
- Redis-based to support planned multi-worker deployment

**Modify** `packages/jobs/src/index.ts`:
- Acquire box ID before `runner.runCode()`, pass it in, release in `finally`
- Call `initializeBoxPool()` at worker startup

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- Accept `boxId` as parameter to `runCode()` instead of generating internally

### 1.2 — execSync Timeout (Issue #2)

**Problem**: Every `execSync` call in `isolate-runner.ts` can hang forever if isolate deadlocks.

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- `isolate --init`: `{ timeout: 10_000 }` (10s)
- Compile command: `{ timeout: 90_000 }` (90s, Java/Kotlin can be slow)
- Run command: `{ timeout: (wallTimeLimit + 5) * 1000 }` (wall time + 5s buffer)
- Metadata read: `{ timeout: 5_000 }` (5s)
- `isolate --cleanup`: `{ timeout: 10_000 }` (10s)
- On timeout (`error.killed === true`), return `XX` verdict with "Internal timeout" message

### 1.3 — Input Size Limits (Issue #3)

**Create** `packages/jobs/src/config/limits.ts`:
```
MAX_CODE_SIZE_BYTES = 64 * 1024        // 64 KB
MAX_STDIN_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB
MAX_STDOUT_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB (truncate on read)
```
- Configurable via env: `CODE_MAX_SIZE_BYTES`, `STDIN_MAX_SIZE_BYTES`

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- Validate `Buffer.byteLength(code)` and `Buffer.byteLength(stdin)` at top of `runCode()`
- Truncate stdout/stderr reads to `MAX_STDOUT_SIZE_BYTES`

### 1.4 — Memory Limit Documentation (Issue #4)

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- Add comment above `-m` flag: documents that it takes bytes per user confirmation, with default 12 MB

### 1.5 — Network Isolation Verification (Issue #8)

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- Add comment: isolate does NOT share host network by default (`--share-net` is opt-in), so network is already isolated
- No code change needed, but document the security assumption

### 1.6 — Centralized Env Config

**Create** `packages/jobs/src/config/env.ts`:
- Reads and validates all env vars with defaults:
  - `REDIS_URL` (default `redis://localhost:6379`)
  - `WORKER_CONCURRENCY` (default `10`)
  - `MAX_BOX_ID` (default `WORKER_CONCURRENCY * 2`)
  - `MAX_CODE_SIZE_BYTES`, `MAX_STDIN_SIZE_BYTES`

**Modify** `packages/jobs/src/connection.ts`:
- Import from env config instead of reading `process.env` directly

### Files touched
- **New**: `src/utils/box-id-pool.ts`, `src/config/limits.ts`, `src/config/env.ts`
- **Modified**: `src/utils/isolate-runner.ts`, `src/index.ts`, `src/connection.ts`

### Verification
- Start 10 concurrent `runCode` calls → no box ID collision (log box IDs)
- Submit code >64KB → rejected before sandbox creation
- Submit infinite-loop code → worker doesn't hang (execSync timeout fires)
- Grep for `execSync` → all calls have `timeout` option

---

## Phase 2: Testing, Job Lifecycle & Cleanup

**Issues**: #5 No test suite, #6 No job TTL, #13 Email stub, #15 No graceful shutdown, #17 Observability (logging)

**Goal**: Establish regression safety, fix Redis memory leak, remove dead code, add structured logging.

### 2.1 — Test Suite (Issue #5)

**Add devDependency**: `vitest` to `packages/jobs/package.json`

**Create** `packages/jobs/vitest.config.ts`

**Extract for testability** (currently private methods on IsolateRunner):
- `src/utils/line-number-parser.ts` ← `parseErrorLineNumber()`
- `src/utils/preprocessors.ts` ← `preprocessCode()`

**Create test files**:
| Test File | Coverage |
|-----------|----------|
| `src/__tests__/metadata-parser.test.ts` | All status codes, malformed input, type parsing |
| `src/__tests__/line-number-parser.test.ts` | All 4 language regex patterns, edge cases |
| `src/__tests__/java-preprocessor.test.ts` | Basic rename, already "main", edge cases |
| `src/__tests__/box-id-pool.test.ts` | Acquire/release, pool exhaustion, concurrency |
| `src/__tests__/input-validation.test.ts` | Code/stdin size limits |
| `src/__tests__/isolate-runner.integration.test.ts` | Each verdict type × each language (requires isolate) |

**Add scripts** to `package.json`: `test`, `test:watch`, `test:integration`
**Add** `test` task to `turbo.json`

### 2.2 — Job TTL/Retention (Issue #6)

**Modify** `packages/jobs/src/index.ts`:
- Add `defaultJobOptions` to Queue:
  ```
  removeOnComplete: { age: 3600, count: 1000 }    // 1 hour / max 1000
  removeOnFail: { age: 86400, count: 5000 }        // 24 hours / max 5000
  ```
- TTL values configurable via `src/config/env.ts`

### 2.3 — Remove Email Stub (Issue #13)

**Modify** `packages/jobs/src/index.ts`:
- Delete `emailQueue`, `emailWorker`, and `EMAIL` from `QUEUE_NAMES`
- Verify no external imports (only `codeExecutionQueue` is used by hono-api)

### 2.4 — Graceful Shutdown (Issue #15)

**Create** `packages/jobs/src/utils/shutdown.ts`:
- `setupGracefulShutdown(workers: Worker[])`
- Listens for `SIGTERM` / `SIGINT`
- Calls `worker.close()` (BullMQ waits for in-flight jobs)
- Hard timeout after 30s → `process.exit(1)`

**Modify** `packages/jobs/src/index.ts`:
- Call `setupGracefulShutdown([codeExecutionWorker])`

### 2.5 — Structured Logging (Issue #17)

**Create** `packages/jobs/src/utils/logger.ts`:
- Wraps `console` methods, outputs JSON in production, pretty-printed in dev
- Standard fields: `timestamp`, `level`, `message`, `jobId`, `boxId`, `lang`, `duration`
- Zero external dependencies

**Modify** all `console.log` / `console.error` calls → use logger

### Files touched
- **New**: `vitest.config.ts`, `src/utils/logger.ts`, `src/utils/shutdown.ts`, `src/utils/line-number-parser.ts`, `src/utils/preprocessors.ts`, 6 test files
- **Modified**: `src/index.ts`, `src/utils/isolate-runner.ts`, `package.json`, `turbo.json`

### Verification
- `pnpm test` passes all unit tests
- `pnpm test:integration` passes on isolate-equipped machine
- Redis `DBSIZE` stabilizes over time (jobs cleaned up)
- `kill -TERM <worker_pid>` → in-flight jobs complete, then exit
- Log output is valid JSON in `NODE_ENV=production`

---

## Phase 3: Worker Hardening & Rate Limiting

**Issues**: #7 Rate limiting, #14 Resource reporting, #16 Dead letter queue, #18 Fragile Java renaming

**Goal**: Production-ready multi-user workloads.

### 3.1 — Rate Limiting (Issue #7)

**Two layers**:

**Layer 1 — API-level** (per-user, primary defense):

**Create** `packages/hono-api/src/middleware/rate-limit.ts`:
- Redis sliding window: `ratelimit:<userId>:<window>`
- Defaults: 10/minute, 100/hour (env-configurable)
- Returns 429 + `Retry-After` header

**Modify** `packages/hono-api/src/routes/submissions.ts`:
- Apply rate limit middleware to POST route

**Layer 2 — Queue-level** (global safety net):

**Modify** `packages/jobs/src/index.ts`:
- Add BullMQ `limiter: { max: 200, duration: 60_000 }` to queue config
- Make `concurrency` read from `env.WORKER_CONCURRENCY`

### 3.2 — Resource Usage Reporting (Issue #14)

**Modify** `packages/jobs/src/types/index.ts`:
- Extend `ExecutionResult`:
  ```ts
  cgMemory?: number       // cg-mem (KB)
  wallTime?: number       // time-wall (ms)
  cswForced?: number      // forced context switches
  cswVoluntary?: number   // voluntary context switches
  cgOomKilled?: boolean
  ```

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- Populate new fields from metadata in both success and error paths
- Ensure `--cg` flag is passed to isolate for cgroup memory tracking

**Modify** Hono API response schemas to include new fields (backward-compatible)

### 3.3 — Dead Letter Queue (Issue #16)

**Create** `packages/jobs/src/queues/dead-letter.ts`:
- `deadLetterQueue` — BullMQ Queue named `code-execution-dlq`
- `moveToDeadLetter(job, error)` — copies job data + error to DLQ

**Modify** `packages/jobs/src/index.ts`:
- Add `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }` to job options
- Add `worker.on('failed', ...)` handler → call `moveToDeadLetter` on final failure

### 3.4 — Java Class Renaming Fix (Issue #18)

**Modify** `packages/jobs/src/utils/preprocessors.ts` (created in Phase 2):
- Strip comments (`//`, `/* */`) and string literals before searching for `public class`
- Java allows exactly one `public class` per file — find it in stripped text, replace at that offset in original
- Add tests: class name in string literal, class in comment, inner classes, annotations

### Files touched
- **New**: `packages/hono-api/src/middleware/rate-limit.ts`, `src/queues/dead-letter.ts`
- **Modified**: `src/index.ts`, `src/types/index.ts`, `src/utils/isolate-runner.ts`, `src/utils/preprocessors.ts`, hono-api route + schema files

### Verification
- Load test: 50 requests/second from one user → 429 after limit
- Verify `cgMemory`, `wallTime` fields in API responses
- Trigger 3+ failures → job appears in DLQ
- Java code with `"public class Foo"` in a string → compiles correctly

---

## Phase 4: Language Expansion

**Issues**: #9 Only 4 languages

**Goal**: Add 7 new languages — Rust, Go, C, TypeScript, Ruby, PHP, Kotlin.

### 4.1 — New Language Configs

**Modify** `packages/jobs/src/types/index.ts`:
```ts
type Language = "py" | "js" | "java" | "cpp" | "rs" | "go" | "c" | "ts" | "rb" | "php" | "kt"
```

**Modify** `packages/jobs/src/constants/index.ts`:
- Add all new languages to `SUPPORTED_LANGS`

**Modify** `packages/jobs/src/config/languages.ts`:

| Lang | Ext | Compile | Run | Special Opts |
|------|-----|---------|-----|-------------|
| Rust | rs | `rustc -o program main.rs` | `./program` | — |
| Go | go | `go build -o program main.go` | `./program` | `--dir=/usr/local/go` |
| C | c | `gcc -o program main.c -lm` | `./program` | — |
| TypeScript | ts | — | `node --experimental-strip-types main.ts` | — |
| Ruby | rb | — | `ruby main.rb` | — |
| PHP | php | — | `php main.php` | — |
| Kotlin | kt | `kotlinc main.kt -include-runtime -d program.jar` | `java -jar program.jar` | Same as Java |

### 4.2 — Error Line Parsing for New Languages

**Modify** `packages/jobs/src/utils/line-number-parser.ts`:
- Add regex patterns for Rust, Go, C (same as C++), TypeScript (same as JS), Ruby, PHP, Kotlin (same as Java)

### 4.3 — Tests

**Create** `packages/jobs/src/__tests__/languages.integration.test.ts`:
- Per language: hello world, compile error (compiled langs), runtime error, stdin test
- Skip if runtime binary not found on test machine

### 4.4 — API & Infra Updates

- Update Hono API Zod schemas to accept new language values
- Update `install-isolate.sh` or create companion script for runtime installation

### Files touched
- **New**: `src/__tests__/languages.integration.test.ts`
- **Modified**: `src/types/index.ts`, `src/constants/index.ts`, `src/config/languages.ts`, `src/utils/line-number-parser.ts`, hono-api schemas, `install-isolate.sh`

### Verification
- Each language: hello world → `OK`, syntax error → `CE`/`RE`, infinite loop → `TO`
- OpenAPI spec reflects new language enum values

---

## Phase 5: Future Architecture Prep

**Issues**: #10 Multi-file support (prep), #11 Output comparison (prep), #12 Compilation caching

**Goal**: Lay groundwork for future features without breaking current interface.

### 5.1 — Multi-File Types (Issue #10)

**Modify** `packages/jobs/src/types/index.ts`:
```ts
interface SourceFile { name: string; content: string; }
// Future: runCode accepts files: SourceFile[] as alternative to code: string
```
- No runtime changes — type-only prep

### 5.2 — Output Comparators (Issue #11)

**Create** `packages/jobs/src/utils/comparators.ts`:
- `Comparator` interface: `(actual: string, expected: string) => { match: boolean; details?: string }`
- Implementations: `exactMatch`, `tokenMatch` (whitespace-normalized), `floatTolerance(epsilon)`
- Not wired into execution flow yet

**Modify** `packages/jobs/src/types/index.ts`:
- Add optional `expectedOutput?: string` and `comparisonMode?: "exact" | "token" | "float"` to `ExecutionOptions`

### 5.3 — Compilation Caching (Issue #12)

**Create** `packages/jobs/src/utils/compile-cache.ts`:
- Key: `sha256(code + lang)`
- Cache dir: `/tmp/cd-judge-compile-cache/` (env-configurable)
- On cache hit: copy compiled artifact to box, skip compilation
- On cache miss: compile normally, store artifact
- LRU eviction: max 500 entries (env-configurable)
- Only for compiled languages (cpp, c, java, rs, go, kt)

**Modify** `packages/jobs/src/utils/isolate-runner.ts`:
- Before compile step → check cache
- After successful compile → store in cache

### Files touched
- **New**: `src/utils/comparators.ts`, `src/utils/compile-cache.ts`
- **Modified**: `src/types/index.ts`, `src/utils/isolate-runner.ts`

### Verification
- Submit same C++ code twice → second run skips compilation (check logs)
- Comparator unit tests pass
- TypeScript compiles with new types

---

## Phase Dependencies

```
Phase 1 (Safety)
    ↓
Phase 2 (Testing + Lifecycle)  ← depends on Phase 1 (tests validate Phase 1 changes)
    ↓
Phase 3 (Hardening) ←──┐       ← depends on Phase 2 (needs test infra + logger)
Phase 4 (Languages) ←──┘       ← depends on Phase 2 (needs test infra); independent of Phase 3
    ↓
Phase 5 (Future Prep)          ← depends on stable foundation from Phases 1-3
```

Phases 3 and 4 can be worked on in parallel.

---

## New Files Summary

| Phase | File | Purpose |
|-------|------|---------|
| 1 | `src/utils/box-id-pool.ts` | Redis-backed atomic box ID allocation |
| 1 | `src/config/limits.ts` | Input size limit constants |
| 1 | `src/config/env.ts` | Centralized env var config |
| 2 | `vitest.config.ts` | Test configuration |
| 2 | `src/utils/logger.ts` | Structured JSON logger |
| 2 | `src/utils/shutdown.ts` | Graceful SIGTERM handler |
| 2 | `src/utils/line-number-parser.ts` | Extracted from IsolateRunner |
| 2 | `src/utils/preprocessors.ts` | Extracted from IsolateRunner |
| 2 | `src/__tests__/*.test.ts` (×6) | Unit + integration tests |
| 3 | `packages/hono-api/src/middleware/rate-limit.ts` | Per-user Redis rate limiter |
| 3 | `src/queues/dead-letter.ts` | Dead letter queue |
| 4 | `src/__tests__/languages.integration.test.ts` | New language tests |
| 5 | `src/utils/comparators.ts` | Output comparison (prep) |
| 5 | `src/utils/compile-cache.ts` | SHA-256 compilation cache |

## Most Modified Files

1. `src/utils/isolate-runner.ts` — touched in Phases 1, 2, 3, 5
2. `src/index.ts` — touched in Phases 1, 2, 3
3. `src/types/index.ts` — touched in Phases 3, 4, 5
4. `src/config/languages.ts` — touched in Phase 4
