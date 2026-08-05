import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { DatabaseError } from "@/lib/errors";
import { BaseRepository } from "@/repositories/BaseRepository";
import type { Database } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { createFakeSupabaseClient } from "../../mocks/supabase-client";

/** Concrete subclass used to test the abstract base. */
class TestRepo extends BaseRepository<"banks"> {
  constructor(client: SupabaseClient<Database>) {
    super(client, "banks");
  }
}

function makeRepo(seed = { banks: [...banks] }): {
  repo: TestRepo;
  setError: (code: string) => void;
} {
  const client = createFakeSupabaseClient(seed);
  return {
    repo: new TestRepo(client as unknown as SupabaseClient<Database>),
    setError: (code: string) => {
      client.nextError = { code, message: "boom" };
    },
  };
}

describe("BaseRepository.findAll", () => {
  it("returns all rows", async () => {
    const { repo } = makeRepo();
    const rows = await repo.findAll();
    expect(rows).toHaveLength(3);
    expect(rows[0]?.bank_code).toBe("ABY");
  });

  it("orders by a column ascending and descending", async () => {
    const { repo } = makeRepo();
    const asc = await repo.findAll({ orderBy: "bank_code", ascending: true });
    expect(asc.map((r) => r.bank_code)).toEqual(["ABY", "CBE", "DASH"]);
    const desc = await repo.findAll({ orderBy: "bank_code", ascending: false });
    expect(desc.map((r) => r.bank_code)).toEqual(["DASH", "CBE", "ABY"]);
  });

  it("limits the result set", async () => {
    const { repo } = makeRepo();
    const rows = await repo.findAll({ limit: 2 });
    expect(rows).toHaveLength(2);
  });

  it("returns an empty array when there are no rows", async () => {
    const { repo } = makeRepo({ banks: [] });
    expect(await repo.findAll()).toEqual([]);
  });

  it("throws a DatabaseError when the query fails", async () => {
    const { repo, setError } = makeRepo();
    setError("PGRST116");
    await expect(repo.findAll()).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe("BaseRepository.findAll pagination", () => {
  /** Generates `count` bank rows with unique codes so pagination can be asserted. */
  function makeBankRows(count: number): Array<Record<string, unknown>> {
    return Array.from({ length: count }, (_, index) => ({
      id: `bank-${index}`,
      bank_code: `BK${String(index).padStart(4, "0")}`,
      bank_name: `Bank ${index}`,
      bank_type: "private",
      source_url: null,
      is_active: true,
      created_at: null,
    }));
  }

  it("returns all 1500 rows across multiple pages", async () => {
    const rows = makeBankRows(1500);
    const { repo } = makeRepo({ banks: rows });
    const all = await repo.findAll();
    expect(all).toHaveLength(1500);
    expect(all.map((r) => r.id)).toEqual(rows.map((r) => r.id));
  });

  it("returns exactly 1000 rows when the table holds one full page", async () => {
    const { repo } = makeRepo({ banks: makeBankRows(1000) });
    expect(await repo.findAll()).toHaveLength(1000);
  });

  it("returns 1001 rows when the table spills into a second page", async () => {
    const { repo } = makeRepo({ banks: makeBankRows(1001) });
    const all = await repo.findAll();
    expect(all).toHaveLength(1001);
    expect(all[1000]?.id).toBe("bank-1000");
  });

  it("returns every row exactly once across pages (no duplicates)", async () => {
    const { repo } = makeRepo({ banks: makeBankRows(1500) });
    const ids = (await repo.findAll()).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns an empty array when the table is empty", async () => {
    const { repo } = makeRepo({ banks: [] });
    expect(await repo.findAll()).toEqual([]);
  });

  it("respects a limit larger than one page without over-fetching", async () => {
    const { repo } = makeRepo({ banks: makeBankRows(2500) });
    const all = await repo.findAll({ limit: 1500 });
    expect(all).toHaveLength(1500);
    expect(all.map((r) => r.id)).toEqual(
      makeBankRows(2500)
        .slice(0, 1500)
        .map((r) => r.id),
    );
  });

  it("keeps ordering stable across page boundaries", async () => {
    const { repo } = makeRepo({ banks: makeBankRows(1500) });
    const all = await repo.findAll({ orderBy: "bank_code", ascending: true });
    const expected = makeBankRows(1500)
      .map((r) => r.bank_code as string)
      .sort((a, b) => a.localeCompare(b));
    expect(all.map((r) => r.bank_code)).toEqual(expected);
  });
});

describe("BaseRepository.findOneBy", () => {
  it("returns the matching row", async () => {
    const { repo } = makeRepo();
    const row = await repo.findOneBy({ bank_code: "CBE" });
    expect(row?.bank_name).toBe("Commercial Bank of Ethiopia");
  });

  it("returns null when nothing matches", async () => {
    const { repo } = makeRepo();
    expect(await repo.findOneBy({ bank_code: "NOPE" })).toBeNull();
  });

  it("throws a DatabaseError on failure", async () => {
    const { repo, setError } = makeRepo();
    setError("PGRST116");
    await expect(repo.findOneBy({ bank_code: "ABY" })).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe("BaseRepository.findManyBy", () => {
  it("filters rows", async () => {
    const { repo } = makeRepo();
    const rows = await repo.findManyBy({ bank_type: "private" });
    expect(rows.map((r) => r.bank_code)).toEqual(["ABY", "DASH"]);
  });

  it("returns an empty array when nothing matches", async () => {
    const { repo } = makeRepo();
    expect(await repo.findManyBy({ bank_code: "NOPE" })).toEqual([]);
  });
});

describe("BaseRepository.findLatestBy", () => {
  const datedSeed = {
    banks: [
      { id: "1", bank_code: "ABY", bank_name: "A", bank_type: "p", rate_date: "2026-07-01" },
      { id: "2", bank_code: "ABY", bank_name: "A", bank_type: "p", rate_date: "2026-08-01" },
      { id: "3", bank_code: "ABY", bank_name: "A", bank_type: "p", rate_date: "2026-08-01" },
    ],
  };

  it("returns the newest row by the order column", async () => {
    const { repo } = makeRepo(datedSeed as never);
    const row = await repo.findLatestBy({ bank_code: "ABY" }, "rate_date" as never);
    expect(row?.id).toBe("2");
  });

  it("applies the tie-breaker for equal order values", async () => {
    const { repo } = makeRepo(datedSeed as never);
    const row = await repo.findLatestBy({ bank_code: "ABY" }, "rate_date" as never, "id" as never);
    // ids "3" > "2" so the tie-breaker picks id 3 (descending id)
    expect(row?.id).toBe("3");
  });

  it("returns null when nothing matches", async () => {
    const { repo } = makeRepo(datedSeed as never);
    expect(await repo.findLatestBy({ bank_code: "NOPE" }, "rate_date" as never)).toBeNull();
  });
});

describe("BaseRepository.insert", () => {
  it("inserts a row and returns it with a generated id when the table has an id column", async () => {
    const idSeed = {
      banks: [{ id: "1", bank_code: "ABY", bank_name: "Awash", bank_type: "private" }],
    };
    const { repo } = makeRepo(idSeed as never);
    const created = await repo.insert({
      bank_code: "NEW",
      bank_name: "New Bank",
      bank_type: "private",
    });
    expect(created.bank_code).toBe("NEW");
    expect(created.id).toBeDefined();
    expect((await repo.findAll()).length).toBe(2);
  });

  it("throws a DatabaseError when the insert fails", async () => {
    const { repo, setError } = makeRepo();
    setError("23505");
    await expect(
      repo.insert({ bank_code: "X", bank_name: "X", bank_type: "private" }),
    ).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe("BaseRepository.updateBy", () => {
  it("updates the matching row and returns it", async () => {
    const { repo } = makeRepo();
    const updated = await repo.updateBy({ bank_code: "ABY" }, { is_active: false });
    expect(updated?.is_active).toBe(false);
  });

  it("returns null when nothing matches", async () => {
    const { repo } = makeRepo();
    expect(await repo.updateBy({ bank_code: "NOPE" }, { is_active: false })).toBeNull();
  });

  it("throws a DatabaseError on failure", async () => {
    const { repo, setError } = makeRepo();
    setError("PGRST116");
    await expect(repo.updateBy({ bank_code: "ABY" }, { is_active: false })).rejects.toBeInstanceOf(
      DatabaseError,
    );
  });
});

describe("BaseRepository.deleteBy", () => {
  it("deletes matching rows and returns true", async () => {
    const { repo } = makeRepo();
    const deleted = await repo.deleteBy({ bank_code: "DASH" });
    expect(deleted).toBe(true);
    expect(await repo.findAll()).toHaveLength(2);
  });

  it("returns false when nothing matches", async () => {
    const { repo } = makeRepo();
    expect(await repo.deleteBy({ bank_code: "NOPE" })).toBe(false);
  });

  it("throws a DatabaseError on failure", async () => {
    const { repo, setError } = makeRepo();
    setError("PGRST116");
    await expect(repo.deleteBy({ bank_code: "ABY" })).rejects.toBeInstanceOf(DatabaseError);
  });
});
