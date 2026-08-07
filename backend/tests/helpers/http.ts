/**
 * Mock Express request/response/next objects for controller and middleware
 * unit tests (no Express server required).
 */

import type { Request, Response } from "express";
import { vi } from "vitest";

/** A mock response: `status` is chainable, `json` records the body. */
export function createMockResponse(): Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

/** A mock request with the given overrides (params/query/body/headers). */
export function createMockRequest(
  overrides: Partial<Pick<Request, "params" | "query" | "body" | "headers">> = {},
): Request {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

/** A `vi.fn()` cast as `NextFunction`. */
export function createMockNext(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

/** Flushes pending microtasks (asyncHandler runs handlers on the microtask queue). */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
