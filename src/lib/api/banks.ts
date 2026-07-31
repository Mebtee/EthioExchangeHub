import { banks, currencies } from "@/lib/demo-data";
import type { Bank } from "@/types/bank";
import type { Currency } from "@/types/currency";

// TODO(backend): Replace these mocks with real API calls (e.g. GET /banks).
// Only the implementations below need to change — hooks, keys and UI stay the same.

export async function fetchBanks(): Promise<Bank[]> {
  return banks;
}

export async function fetchBankBySlug(slug?: string): Promise<Bank | undefined> {
  return banks.find((bank) => bank.slug === slug);
}

export async function fetchCurrencies(): Promise<Currency[]> {
  return currencies;
}
