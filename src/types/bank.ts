export type BankType = "State Owned" | "Private Bank";

export interface Bank {
  slug: string;
  name: string;
  short: string;
  type: BankType;
  /** Tailwind background class used for the bank's avatar/badge. */
  color: string;
  buy: number;
  sell: number;
  /** Percent change, used by trend indicators. */
  trend: number;
  lastUpdate: string;
  established?: number;
  description?: string;
  phone?: string;
  email?: string;
  hq?: string;
  rating?: number;
  reviews?: number;
  branches?: number;
}
