import { describe, expect, it } from "vitest";

import { createContactMessageBodySchema } from "@/validators/contact";

const validBody = {
  name: "Abebe Kebede",
  email: "abebe@example.com",
  subject: "Question about historical rates",
  message: "Hello, could you share how far back the historical rate data goes?",
};

describe("createContactMessageBodySchema", () => {
  it("accepts a valid body", () => {
    expect(createContactMessageBodySchema.safeParse(validBody).success).toBe(true);
  });

  it("trims whitespace from all fields", () => {
    const result = createContactMessageBodySchema.safeParse({
      name: "  Abebe Kebede  ",
      email: "  abebe@example.com  ",
      subject: "  Question  ",
      message: "  Hello, this is a long enough message.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Abebe Kebede");
      expect(result.data.email).toBe("abebe@example.com");
      expect(result.data.subject).toBe("Question");
      expect(result.data.message).toBe("Hello, this is a long enough message.");
    }
  });

  it("rejects a missing body", () => {
    expect(createContactMessageBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(
      createContactMessageBodySchema.safeParse({ name: "A", email: "a@b.com", subject: "S" })
        .success,
    ).toBe(false);
    expect(
      createContactMessageBodySchema.safeParse({
        name: "Abebe",
        email: "a@b.com",
        message: "This is a long enough message",
      }).success,
    ).toBe(false);
    expect(
      createContactMessageBodySchema.safeParse({
        name: "Abebe",
        subject: "S",
        message: "This is a long enough message",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      createContactMessageBodySchema.safeParse({ ...validBody, email: "not-an-email" }).success,
    ).toBe(false);
    expect(createContactMessageBodySchema.safeParse({ ...validBody, email: "" }).success).toBe(
      false,
    );
  });

  it("rejects a too-short name", () => {
    expect(createContactMessageBodySchema.safeParse({ ...validBody, name: "A" }).success).toBe(
      false,
    );
    expect(createContactMessageBodySchema.safeParse({ ...validBody, name: "" }).success).toBe(
      false,
    );
  });

  it("rejects a too-short message", () => {
    expect(
      createContactMessageBodySchema.safeParse({ ...validBody, message: "Too short" }).success,
    ).toBe(false);
  });

  it("rejects an empty subject", () => {
    expect(createContactMessageBodySchema.safeParse({ ...validBody, subject: " " }).success).toBe(
      false,
    );
  });

  it("rejects over-long fields", () => {
    expect(
      createContactMessageBodySchema.safeParse({ ...validBody, name: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      createContactMessageBodySchema.safeParse({
        ...validBody,
        message: "x".repeat(5001),
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(createContactMessageBodySchema.safeParse({ ...validBody, typo_field: 1 }).success).toBe(
      false,
    );
  });

  it("rejects non-string values", () => {
    expect(createContactMessageBodySchema.safeParse({ ...validBody, name: 123 }).success).toBe(
      false,
    );
    expect(createContactMessageBodySchema.safeParse({ ...validBody, message: null }).success).toBe(
      false,
    );
  });
});
