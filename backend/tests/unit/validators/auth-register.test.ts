import { describe, expect, it } from "vitest";

import { registerBodySchema } from "@/validators/auth";

const VALID = {
  email: "customer@example.com",
  password: "StrongPassword123!",
};

describe("registerBodySchema", () => {
  it("accepts email + password only (optional fields omitted)", () => {
    const parsed = registerBodySchema.safeParse(VALID);
    expect(parsed.success).toBe(true);
  });

  it("accepts optional company_name and phone and trims them", () => {
    const parsed = registerBodySchema.safeParse({
      ...VALID,
      company_name: "  Example Company  ",
      phone: " +251911000000 ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.company_name).toBe("Example Company");
      expect(parsed.data.phone).toBe("+251911000000");
    }
  });

  it("rejects a missing email", () => {
    expect(registerBodySchema.safeParse({ password: VALID.password }).success).toBe(false);
  });

  it("rejects a missing password", () => {
    expect(registerBodySchema.safeParse({ email: VALID.email }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerBodySchema.safeParse({ ...VALID, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a password shorter than 12 characters", () => {
    expect(registerBodySchema.safeParse({ ...VALID, password: "Short1!a" }).success).toBe(false);
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(registerBodySchema.safeParse({ ...VALID, password: "alllowercase123!" }).success).toBe(
      false,
    );
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(registerBodySchema.safeParse({ ...VALID, password: "ALLUPPERCASE123!" }).success).toBe(
      false,
    );
  });

  it("rejects a password missing a number", () => {
    expect(registerBodySchema.safeParse({ ...VALID, password: "NoNumbersHere!!" }).success).toBe(
      false,
    );
  });

  it("rejects a password missing a special character", () => {
    expect(registerBodySchema.safeParse({ ...VALID, password: "NoSpecialChars123" }).success).toBe(
      false,
    );
  });

  it("rejects unknown keys (strict)", () => {
    const result = registerBodySchema.safeParse({ ...VALID, role: "admin" });
    expect(result.success).toBe(false);
  });
});
