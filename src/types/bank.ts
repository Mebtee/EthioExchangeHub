export type BankType = "State Owned" | "Private Bank";

/**
 * Bank directory record from the /banks API.
 * Note: exchange rates are NOT part of this type — they come from the
 * exchange-rate records returned by /exchange-rates.
 */
export interface Bank {
  slug: string;
  name: string;
  short: string;
  type: BankType;
  /** Tailwind background class used for the bank's avatar/badge. */
  color: string;
  established?: number;
  description?: string;
  phone?: string;
  email?: string;
  hq?: string;
  rating?: number;
  reviews?: number;
  branches?: number;
}
