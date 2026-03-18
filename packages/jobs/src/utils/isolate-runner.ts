import { exec as execCb } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import LANGUAGE_CONFIGS from "../config/languages";
import {
  MAX_CODE_SIZE_BYTES,
  MAX_STDIN_SIZE_BYTES,
  MAX_STDOUT_SIZE_BYTES,
} from "../config/limits";
import { SUPPORTED_LANGS } from "../constants";
import { ExecutionOptions, ExecutionResult, Language } from "../types";
import { parseErrorLineNumber } from "./line-number-parser";
import { metadataParser } from "./metadata-parser";
import { preprocessCode } from "./preprocessors";

const exec = promisify(execCb);

type FilePaths = {
  workdir: string;
  boxdir: string;
  tempDir: string;
  files: {
    stdin: string;
    stdout: string;
    stderr: string;
    metadata: string;
    compile: string;
  };
};

class IsolateRunner {
  private readonly STDIN_FILE = "stdin.txt";
  private readonly STDOUT_FILE = "stdout.txt";
  private readonly STDERR_FILE = "stderr.txt";
  private readonly METADATA_FILE = "metadata.txt";
  private readonly COMPILE_OUTPUT_FILE = "compile_output.txt";

  private rootDir: FilePaths = {
    workdir: "",
    boxdir: "",
    tempDir: "",
    files: {
      stdin: "",
      stdout: "",
      stderr: "",
      metadata: "",
      compile: "",
    },
  };

  private async initializeFile(filePath: string): Promise<void> {
    await fs.writeFile(filePath, "");
    await fs.chmod(filePath, 0o666);
  }

  private async initializeWorkdir(boxId: number): Promise<void> {
    const { stdout } = await exec(`isolate -b ${boxId} --init`, {
      timeout: 10_000,
    });
    const workdir = stdout.trim();
    const boxdir = path.join(workdir, "box");

    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `isolate-${boxId}-`),
    );

    const files = {
      stdin: path.join(tempDir, this.STDIN_FILE),
      stdout: path.join(tempDir, this.STDOUT_FILE),
      stderr: path.join(tempDir, this.STDERR_FILE),
      metadata: path.join(tempDir, this.METADATA_FILE),
      compile: path.join(tempDir, this.COMPILE_OUTPUT_FILE),
    };

    await Promise.all(
      Object.values(files).map((file) => this.initializeFile(file)),
    );

    this.rootDir = { workdir, boxdir, tempDir, files };
  }

  /**
   * Read a file, truncating to maxBytes if it exceeds the limit.
   */
  private async readTruncated(
    filePath: string,
    maxBytes: number = MAX_STDOUT_SIZE_BYTES,
  ): Promise<string> {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) return "";
    if (stat.size <= maxBytes) {
      return fs.readFile(filePath, "utf8");
    }
    const buf = Buffer.alloc(maxBytes);
    const fh = await fs.open(filePath, "r");
    try {
      await fh.read(buf, 0, maxBytes, 0);
      return buf.toString("utf8") + "\n...[output truncated]";
    } finally {
      await fh.close();
    }
  }

  async runCode({
    lang,
    code,
    stdin = "",
    boxId,
    options = {},
  }: {
    lang: Language;
    code: string;
    stdin?: string;
    /** Box ID allocated from the pool. */
    boxId: number;
    options?: ExecutionOptions;
  }): Promise<ExecutionResult> {
    if (!SUPPORTED_LANGS.includes(lang)) {
      throw new Error(`Invalid language: ${lang}`);
    }
    if (code.trim().length === 0) {
      throw new Error(`Code is required`);
    }

    // Input size validation
    const codeBytes = Buffer.byteLength(code, "utf8");
    if (codeBytes > MAX_CODE_SIZE_BYTES) {
      throw new Error(
        `Code size (${codeBytes} bytes) exceeds limit (${MAX_CODE_SIZE_BYTES} bytes)`,
      );
    }
    const stdinBytes = Buffer.byteLength(stdin, "utf8");
    if (stdinBytes > MAX_STDIN_SIZE_BYTES) {
      throw new Error(
        `Stdin size (${stdinBytes} bytes) exceeds limit (${MAX_STDIN_SIZE_BYTES} bytes)`,
      );
    }

    try {
      await this.initializeWorkdir(boxId);

      const langConfig = LANGUAGE_CONFIGS[lang];
      const sourceFile = path.join(this.rootDir.boxdir, langConfig.fileName);
      await fs.writeFile(sourceFile, preprocessCode(lang, code));

      await fs.writeFile(this.rootDir.files.stdin, stdin, "utf8");

      // Compile if needed
      if (langConfig.compileCommand) {
        const compileCmd = `isolate -s -b ${boxId} -M ${this.rootDir.files.metadata} \
          -t 30 -w 60 -k 64000 \
          -p30 \
          -f 4096 \
          -E PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
        ${langConfig.opts} \
          --run \
        -- ${langConfig.compileCommand} 2> ${this.rootDir.files.compile}`;

        try {
          await exec(compileCmd, { timeout: 90_000 });
          const compileOutput = await fs.readFile(
            this.rootDir.files.compile,
            "utf8",
          );
          if (compileOutput.length > 0) {
            return {
              verdict: "CE",
              time: 0,
              memory: 0,
              stdout: "",
              stderr: compileOutput,
              lineNumber: parseErrorLineNumber(compileOutput, lang),
            };
          }
        } catch (error) {
          // Check if this was an internal timeout
          if (error instanceof Error && "killed" in error && error.killed) {
            return {
              verdict: "XX",
              time: 0,
              memory: 0,
              stdout: "",
              stderr: "Internal timeout: compilation took too long",
            };
          }
          const compileOutput = await fs.readFile(
            this.rootDir.files.compile,
            "utf8",
          );
          return {
            verdict: "CE",
            time: 0,
            memory: 0,
            stdout: "",
            stderr: compileOutput,
            lineNumber: parseErrorLineNumber(compileOutput, lang),
          };
        }
      }

      const wallTimeLimit = (options.timeLimit || 1) + 1;

      // Run the code
      // -m flag: memory limit in KB (default 12 MB = 12 * 1024 * 1024 KB).
      // isolate's -m takes the value in KB.
      const runCmd = `isolate -b ${boxId} -M ${this.rootDir.files.metadata} -s \
        -t ${options.timeLimit || 1} \
        -p${options.subProcessLimit || 20} \
        -w ${wallTimeLimit} \
        -m ${options.memoryLimit || 12 * 1024 * 1024} \
        ${langConfig.opts} \
        --run \
        -- ${langConfig.runCommand} < ${this.rootDir.files.stdin} > ${this.rootDir.files.stdout} 2> ${this.rootDir.files.stderr}`;

      await exec(runCmd, { timeout: (wallTimeLimit + 5) * 1000 });

      // Read metadata file
      const metadataContent = await fs.readFile(
        this.rootDir.files.metadata,
        "utf8",
      );
      const metadata = metadataParser(metadataContent);

      const stdout = await this.readTruncated(this.rootDir.files.stdout);
      const stderr = await this.readTruncated(this.rootDir.files.stderr);

      return {
        verdict: metadata.exitcode === 0 ? "OK" : metadata.status || "RE",
        time: (metadata.time || 0) * 1000,
        memory: metadata["max-rss"] || 0,
        exitCode: metadata.exitcode,
        exitSignal: metadata.exitsig,
        errorType: metadata.status,
        stdout,
        stderr,
        cgMemory: metadata["cg-mem"],
        wallTime: metadata["time-wall"]
          ? metadata["time-wall"] * 1000
          : undefined,
        cswForced: metadata["csw-forced"],
        cswVoluntary: metadata["csw-voluntary"],
        cgOomKilled: metadata["cg-oom-killed"],
      };
    } catch (error) {
      // Check if this was an internal timeout
      if (error instanceof Error && "killed" in error && error.killed) {
        return {
          verdict: "XX",
          time: 0,
          memory: 0,
          stdout: "",
          stderr: "Internal timeout: sandbox process exceeded system time limit",
        };
      }

      let metadataContent = "";
      try {
        metadataContent = await fs.readFile(
          this.rootDir.files.metadata,
          "utf8",
        );
      } catch {
        // metadata file may not exist if init failed
      }

      if (!metadataContent.trim()) {
        return {
          verdict: "XX",
          time: 0,
          memory: 0,
          stdout: "",
          stderr: "Internal error: failed to read execution metadata",
        };
      }

      const metadata = metadataParser(metadataContent);

      let stdout = await this.readTruncated(this.rootDir.files.stdout);
      let stderr = await this.readTruncated(this.rootDir.files.stderr);

      if (metadata.status === "RE") {
        stderr = stderr || metadata.message || "Runtime Error";
      } else if (metadata.status === "TO") {
        stderr = metadata.message || "Time limit exceeded";
      } else if (metadata.status === "SG") {
        stderr = "Memory limit exceeded";
      } else if (metadata.status === "XX") {
        stderr = metadata.message || "Internal Error";
      }

      return {
        verdict: metadata.exitcode === 0 ? "OK" : metadata.status || "RE",
        time: (metadata.time || 0) * 1000,
        memory: metadata["max-rss"] || 0,
        exitCode: metadata.exitcode || 0,
        exitSignal: metadata.exitsig || 0,
        errorType: "Runtime Error",
        stdout,
        stderr: stderr || "",
        lineNumber: parseErrorLineNumber(stderr, lang),
        cgMemory: metadata["cg-mem"],
        wallTime: metadata["time-wall"]
          ? metadata["time-wall"] * 1000
          : undefined,
        cswForced: metadata["csw-forced"],
        cswVoluntary: metadata["csw-voluntary"],
        cgOomKilled: metadata["cg-oom-killed"],
      };
    } finally {
      // Cleanup isolate box
      try {
        await exec(`isolate -b ${boxId} --cleanup`, { timeout: 10_000 });
      } catch (error) {
        console.error("Cleanup failed:", error);
      }
      // Cleanup temp directory
      if (this.rootDir.tempDir) {
        try {
          await fs.rm(this.rootDir.tempDir, { recursive: true, force: true });
        } catch (error) {
          console.error("Temp dir cleanup failed:", error);
        }
      }
    }
  }
}

export default IsolateRunner;
