import { describe, expect, it } from "vitest";

import { metadataParser } from "../utils/metadata-parser";

describe("metadataParser", () => {
  it("parses a successful execution", () => {
    const input = `time:0.005
time-wall:0.010
max-rss:3456
exitcode:0`;
    const result = metadataParser(input);
    expect(result.time).toBe(0.005);
    expect(result["time-wall"]).toBe(0.01);
    expect(result["max-rss"]).toBe(3456);
    expect(result.exitcode).toBe(0);
    expect(result.status).toBeUndefined();
  });

  it("parses a timeout", () => {
    const input = `time:1.000
time-wall:2.000
max-rss:5000
exitcode:0
status:TO
message:Time limit exceeded (wall clock)`;
    const result = metadataParser(input);
    expect(result.status).toBe("TO");
    expect(result.message).toBe("Time limit exceeded (wall clock)");
  });

  it("parses a runtime error", () => {
    const input = `time:0.001
exitcode:1
status:RE
message:Exited with error status 1`;
    const result = metadataParser(input);
    expect(result.status).toBe("RE");
    expect(result.exitcode).toBe(1);
  });

  it("parses signal death (SG)", () => {
    const input = `time:0.010
exitsig:9
killed:1
status:SG
message:Caught fatal signal 9`;
    const result = metadataParser(input);
    expect(result.status).toBe("SG");
    expect(result.exitsig).toBe(9);
    expect(result.killed).toBe(true);
  });

  it("parses internal error (XX)", () => {
    const input = `status:XX
message:Internal error of the sandbox`;
    const result = metadataParser(input);
    expect(result.status).toBe("XX");
  });

  it("parses cgroup fields", () => {
    const input = `time:0.005
exitcode:0
cg-mem:12345
cg-oom-killed:1
csw-forced:5
csw-voluntary:10`;
    const result = metadataParser(input);
    expect(result["cg-mem"]).toBe(12345);
    expect(result["cg-oom-killed"]).toBe(true);
    expect(result["csw-forced"]).toBe(5);
    expect(result["csw-voluntary"]).toBe(10);
  });

  it("throws on invalid metadata line", () => {
    expect(() => metadataParser("badline")).toThrow("Invalid metadata line");
  });

  it("throws on invalid status code", () => {
    expect(() => metadataParser("status:INVALID")).toThrow(
      "Invalid status code",
    );
  });
});
