import { describe, expect, it } from "vitest";

import am from "../../messages/am.json";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

type Json = Record<string, unknown>;

/** Collects every leaf-key path (dot-joined) of a nested translation tree. */
function leafKeys(value: Json, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === "object" && !Array.isArray(child)) {
      for (const leaf of leafKeys(child as Json, path)) keys.add(leaf);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

describe("translation catalogs", () => {
  it("keeps EN, AM, and ZH structurally identical (no missing keys)", () => {
    const enKeys = leafKeys(en);
    expect(enKeys.size).toBeGreaterThan(0);

    for (const [locale, catalog] of [
      ["am", am],
      ["zh", zh],
    ] as const) {
      const localeKeys = leafKeys(catalog);
      const missing = [...enKeys].filter((key) => !localeKeys.has(key));
      const extra = [...localeKeys].filter((key) => !enKeys.has(key));
      expect({ locale, missing, extra }).toEqual({ locale, missing: [], extra: [] });
    }
  });

  it("provides the commercial entry-point strings in every locale", () => {
    for (const catalog of [en, am, zh] as const) {
      const login = ((catalog as Json).auth as Json).login as Json;
      expect(typeof login.noAccount).toBe("string");
      expect(typeof login.createAccount).toBe("string");
    }
  });
});
