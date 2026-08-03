import { describe, expect, it } from "vitest";

import { bankListQuerySchema } from "@/validators/banks";

describe("bankListQuerySchema", () => {
  it("accepts no query", () => {
    expect(bankListQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid filters", () => {
    expect(bankListQuerySchema.safeParse({ activeOnly: "true", bankType: "private" }).success).toBe(
      true,
    );
    expect(bankListQuerySchema.safeParse({ activeOnly: "false" }).success).toBe(true);
    expect(bankListQuerySchema.safeParse({ bankType: "state_owned" }).success).toBe(true);
  });

  it("rejects invalid booleans", () => {
    expect(bankListQuerySchema.safeParse({ activeOnly: "yes" }).success).toBe(false);
    expect(bankListQuerySchema.safeParse({ activeOnly: "TRUE" }).success).toBe(false);
  });

  it("rejects unknown bank types", () => {
    expect(bankListQuerySchema.safeParse({ bankType: "cooperative" }).success).toBe(false);
  });
});
