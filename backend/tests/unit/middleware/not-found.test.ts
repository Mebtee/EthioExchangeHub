import { describe, expect, it } from "vitest";

import { NotFoundError } from "@/lib/errors";
import { notFoundHandler } from "@/middleware/not-found";

import { createMockNext, createMockRequest, createMockResponse } from "../../mocks/express";

describe("notFoundHandler", () => {
  it("forwards a NotFoundError with 'Route not found.'", () => {
    const next = createMockNext();
    notFoundHandler(createMockRequest(), createMockResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as NotFoundError;
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.message).toBe("Route not found.");
  });
});
