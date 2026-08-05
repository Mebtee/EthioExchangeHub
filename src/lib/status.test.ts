import { describe, expect, it } from "vitest";

import { logStatusTone, scraperStatusTone } from "./status";

describe("logStatusTone (D3)", () => {
  it("maps success to success and failed to danger", () => {
    expect(logStatusTone("success")).toBe("success");
    expect(logStatusTone("failed")).toBe("danger");
  });
});

describe("scraperStatusTone (D3)", () => {
  it("maps every canonical bucket to its tone", () => {
    expect(scraperStatusTone("healthy")).toBe("success");
    expect(scraperStatusTone("degraded")).toBe("warning");
    expect(scraperStatusTone("failed")).toBe("danger");
    expect(scraperStatusTone("unknown")).toBe("neutral");
  });
});
