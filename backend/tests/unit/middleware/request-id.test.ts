import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { getRequestId } from "@/lib/logger";
import { REQUEST_ID_HEADER, requestIdMiddleware } from "@/middleware/request-id";

import { createMockNext, createMockRequest } from "../../helpers/http";

/** Mock Response with a `setHeader` spy (the shared mock only has status/json). */
function makeMockResponse() {
  return {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as Response & { setHeader: ReturnType<typeof vi.fn> };
}

describe("requestIdMiddleware", () => {
  it("generates a UUID, attaches it to the request, and sets the X-Request-ID header", () => {
    const req = createMockRequest();
    const res = makeMockResponse();
    const next = createMockNext();

    requestIdMiddleware(req, res, next);

    const id = (req as unknown as { id: string }).id;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("honors a safe incoming X-Request-ID for end-to-end correlation", () => {
    const req = createMockRequest({ headers: { "x-request-id": "proxy-abc-123" } });
    const res = makeMockResponse();
    const next = createMockNext();

    requestIdMiddleware(req, res, next);

    const id = (req as unknown as { id: string }).id;
    expect(id).toBe("proxy-abc-123");
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });

  it("ignores an unsafe incoming X-Request-ID and generates a UUID instead", () => {
    const req = createMockRequest({ headers: { "x-request-id": "bad id with spaces" } });
    const res = makeMockResponse();
    const next = createMockNext();

    requestIdMiddleware(req, res, next);

    const id = (req as unknown as { id: string }).id;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("runs next inside the request context so the logger sees the request id", () => {
    const req = createMockRequest();
    const res = makeMockResponse();
    const next = vi.fn(() => {
      expect(getRequestId()).toBe((req as unknown as { id: string }).id);
    });

    requestIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
