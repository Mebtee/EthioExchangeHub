import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import { validateBody, validateParams, validateQuery } from "@/middleware/validation";
import { bankListQuerySchema } from "@/validators/banks";
import { bankCodeParamsSchema } from "@/validators/common";
import { createManualRateBodySchema } from "@/validators/manual-rates";

import { createMockNext, createMockRequest, createMockResponse } from "../../mocks/express";

describe("validateParams", () => {
  it("passes valid params and replaces req.params with parsed values", () => {
    const req = createMockRequest({ params: { bankCode: "  ABY  " } });
    const next = createMockNext();
    validateParams(bankCodeParamsSchema)(req, createMockResponse(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ bankCode: "ABY" });
  });

  it("forwards a ValidationError for invalid params", () => {
    const req = createMockRequest({ params: { bankCode: "   " } });
    const next = createMockNext();
    validateParams(bankCodeParamsSchema)(req, createMockResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });
});

describe("validateQuery", () => {
  it("passes valid query and replaces req.query", () => {
    const req = createMockRequest({ query: { activeOnly: "true" } });
    const next = createMockNext();
    validateQuery(bankListQuerySchema)(req, createMockResponse(), next);
    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ activeOnly: "true" });
  });

  it("forwards a ValidationError for invalid query values", () => {
    const req = createMockRequest({ query: { activeOnly: "yes" } });
    const next = createMockNext();
    validateQuery(bankListQuerySchema)(req, createMockResponse(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });
});

describe("validateBody", () => {
  it("passes a valid body and replaces req.body with the parsed result", () => {
    const req = createMockRequest({
      body: {
        bank_code: "ABY",
        currency_code: "USD",
        buying_rate: 10,
        selling_rate: 11,
        rate_date: "2026-08-02",
        note: "   ",
      },
    });
    const next = createMockNext();
    validateBody(createManualRateBodySchema)(req, createMockResponse(), next);
    expect(next).toHaveBeenCalledWith();
    const body = req.body as { note: unknown };
    expect(body.note).toBeNull();
  });

  it("forwards a ValidationError for an invalid body", () => {
    const req = createMockRequest({ body: { bank_code: "ABY" } });
    const next = createMockNext();
    validateBody(createManualRateBodySchema)(req, createMockResponse(), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });
});
