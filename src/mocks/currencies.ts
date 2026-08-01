/**
 * Mock currency constants used by the public UI.
 *
 * These previously lived inline in components. They are isolated here so
 * components contain no hardcoded financial data; when the backend's
 * `/currencies` endpoint is available, these can be replaced by API data.
 */

/** Currencies offered in the admin settings "default currency" selector. */
export const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "KES"];

/** Preferred tab order for the home rankings; filtered to currencies actually returned by the API. */
export const PREFERRED_TABS = ["USD", "EUR", "GBP"];
