import { describe, expect, it } from "vitest";

import { errorResponse, successResponse } from "@/utils/api-response";

import { createMockResponse } from "../../mocks/express";

describe("successResponse", () => {
  it("writes a 200 success envelope by default", () => {
    const res = createMockResponse();
    successResponse(res, { a: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Success",
      data: { a: 1 },
    });
  });

  it("uses the custom message and status code", () => {
    const res = createMockResponse();
    successResponse(res, null, "Created.", 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Created.",
      data: null,
    });
  });
});

describe("errorResponse", () => {
  it("writes an error envelope with data null and default 500", () => {
    const res = createMockResponse();
    errorResponse(res, "Boom.");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Boom.", data: null });
  });

  it("uses the given status code", () => {
    const res = createMockResponse();
    errorResponse(res, "Nope.", 422);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Nope.", data: null });
  });
});
