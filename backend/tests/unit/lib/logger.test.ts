import { afterEach, describe, expect, it, vi } from "vitest";

import { getRequestId, logger, logStream, requestContext } from "@/lib/logger";
import { env } from "@/utils/validate-env";

const ORIGINAL_LOG_LEVEL = env.LOG_LEVEL;

afterEach(() => {
  vi.restoreAllMocks();
  env.LOG_LEVEL = ORIGINAL_LOG_LEVEL;
});

describe("logger level filtering", () => {
  it("writes a timestamped INFO line to stdout when the level allows", () => {
    env.LOG_LEVEL = "info";
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    logger.info("hello world");

    const line = String(writeSpy.mock.calls[0]?.[0]);
    expect(line).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO/);
    expect(line).toContain("hello world");
  });

  it("suppresses messages below the configured level", () => {
    env.LOG_LEVEL = "error";
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    logger.info("hidden");
    logger.warn("also hidden");
    logger.error("shown");

    expect(writeSpy).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(String(stderrSpy.mock.calls[0]?.[0])).toContain("shown");
  });

  it("writes ERROR and FATAL to stderr", () => {
    env.LOG_LEVEL = "debug";
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    logger.error("boom", { code: 500 });

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const line = String(stderrSpy.mock.calls[0]?.[0]);
    expect(line).toContain("ERROR");
    expect(line).toContain("boom");
    expect(line).toContain('{"code":500}');
  });
});

describe("logger request context", () => {
  it("includes the request id in every line while inside a request context", () => {
    env.LOG_LEVEL = "info";
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    requestContext.run({ requestId: "req-123" }, () => {
      logger.info("inside request");
    });

    const line = String(writeSpy.mock.calls[0]?.[0]);
    expect(line).toContain("[requestId=req-123]");
    expect(line).toContain("inside request");
  });

  it("omits the request id outside a request context", () => {
    env.LOG_LEVEL = "info";
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    logger.info("no context");

    const line = String(writeSpy.mock.calls[0]?.[0]);
    expect(line).not.toContain("requestId");
  });

  it("getRequestId returns undefined outside a request context", () => {
    expect(getRequestId()).toBeUndefined();
  });
});

describe("logStream (morgan integration)", () => {
  it("trims the trailing newline and forwards to the http level", () => {
    env.LOG_LEVEL = "debug";
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    logStream.write("GET /api/v1/banks 200 5.2 ms\n");

    const line = String(writeSpy.mock.calls[0]?.[0]);
    expect(line).toContain("HTTP");
    expect(line).toContain("GET /api/v1/banks 200 5.2 ms");
  });

  it("skips blank lines", () => {
    env.LOG_LEVEL = "debug";
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    logStream.write("   \n");

    expect(writeSpy).not.toHaveBeenCalled();
  });
});
