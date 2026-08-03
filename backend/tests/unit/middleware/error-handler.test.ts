import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import { errorHandler } from "@/middleware/error-handler";

import { createMockRequest, createMockResponse } from "../../mocks/express";

describe("errorHandler", () => {
  it("formats AppError with its own status and message", () => {
    const res = createMockResponse();
    errorHandler(new ValidationError("Bad input."), createMockRequest(), res, () => undefined);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Bad input.",
      data: null,
    });
  });

  it("formats unknown errors as 500 (non-production leaks the message)", () => {
    const res = createMockResponse();
    errorHandler(new Error("boom"), createMockRequest(), res, () => undefined);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "boom",
      data: null,
    });
  });

  it("does not write a response for an error without a status", () => {
    const res = createMockResponse();
    errorHandler(new Error("plain"), createMockRequest(), res, () => undefined);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
