import type { BankRow } from "@/types/database";

/** Typed bank fixtures matching the live schema. */
export const banks: BankRow[] = [
  {
    bank_code: "ABY",
    bank_name: "Awash Bank",
    bank_type: "private",
    source_url: "https://www.awashbank.com/exchange-rate",
    is_active: true,
    created_at: "2026-01-15T09:30:00.000Z",
  },
  {
    bank_code: "CBE",
    bank_name: "Commercial Bank of Ethiopia",
    bank_type: "state_owned",
    source_url: null,
    is_active: true,
    created_at: "2026-01-10T08:00:00.000Z",
  },
  {
    bank_code: "DASH",
    bank_name: "Dashin Bank",
    bank_type: "private",
    source_url: null,
    is_active: false,
    created_at: "2026-02-01T12:00:00.000Z",
  },
];
