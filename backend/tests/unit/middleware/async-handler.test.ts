import { describe, expect, it } from "vitest";

import { NotFoundError } from "@/lib/errors";
import { asyncHandler } from "@/middleware/async-handler";

import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";

describe("asyncHandler", () => {
  it("forwards rejected promises to next(error)", async () => {
    const handler = asyncHandler(async () => {
      throw new NotFoundError("nope");
    });
    const next = createMockNext();
    handler(createMockRequest(), createMockResponse(), next);
    await flushPromises();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  it("forwards synchronous throws to next(error)", async () => {
    const handler = asyncHandler(() => {
      throw new Error("sync throw");
    });
    const next = createMockNext();
    handler(createMockRequest(), createMockResponse(), next);
    await flushPromises();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((next.mock.calls[0][0] as Error).message).toBe("sync throw");
  });

  it("does not call next when the handler resolves", async () => {
    const handler = asyncHandler(async () => undefined);
    const next = createMockNext();
    handler(createMockRequest(), createMockResponse(), next);
    await flushPromises();
    expect(next).not.toHaveBeenCalled();
  });
});
