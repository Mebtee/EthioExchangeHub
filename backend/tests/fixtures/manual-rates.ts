import type { ManualRateRow } from "@/types/database";

/** Typed manual-rate fixtures. */
export const manualRates: ManualRateRow[] = [
  {
    id: "manual-1",
    bank_code: "ABY",
    currency_code: "USD",
    buying_rate: 121.4,
    selling_rate: 122.2,
    transactional_buying: 125.1,
    transactional_selling: 126.2,
    rate_date: "2026-08-02",
    entered_by: null,
    note: "Adjusted after market open.",
    created_at: "2026-08-02T09:05:00.000Z",
  },
  {
    id: "manual-2",
    bank_code: "CBE",
    currency_code: "EUR",
    buying_rate: 139.0,
    selling_rate: 140.0,
    transactional_buying: null,
    transactional_selling: null,
    rate_date: "2026-08-01",
    entered_by: "user-1",
    note: null,
    created_at: "2026-08-01T10:00:00.000Z",
  },
];
