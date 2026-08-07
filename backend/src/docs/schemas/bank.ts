import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `banks` row. */
export const bankSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A bank in the exchange directory.",
  example: apiExamples.bank,
  properties: {
    bank_code: { type: "string", description: 'Natural key (e.g. "ABY").' },
    bank_name: { type: "string", description: "Display name." },
    bank_type: {
      type: "string",
      enum: ["private", "state_owned"],
      description: "Ownership type.",
    },
    source_url: { type: ["string", "null"], format: "uri", description: "Official source URL." },
    is_active: { type: ["boolean", "null"], description: "Whether the bank is currently listed." },
    created_at: {
      type: ["string", "null"],
      format: "date-time",
      description: "Creation timestamp.",
    },
    total_assets: { type: ["number", "null"], description: "Total assets (ETB)." },
    total_deposite: { type: ["number", "null"], description: "Total deposits (ETB)." },
    total_branches: { type: ["number", "null"], description: "Total branches." },
    total_employee: { type: ["number", "null"], description: "Total employees." },
    loan_to_deposite_ratio: {
      type: ["number", "null"],
      description: "Loan-to-deposit ratio (0-1).",
    },
    return_on_asset: { type: ["number", "null"], description: "Return on assets (0-1)." },
    return_on_equity: { type: ["number", "null"], description: "Return on equity (0-1)." },
    profit_before_tax: { type: ["number", "null"], description: "Profit before tax (ETB)." },
    profit_after_tax: { type: ["number", "null"], description: "Profit after tax (ETB)." },
    retained_earning: { type: ["number", "null"], description: "Retained earnings (ETB)." },
    paid_up_capital: { type: ["number", "null"], description: "Paid-up capital (ETB)." },
    reserves: { type: ["number", "null"], description: "Reserves (ETB)." },
    total_liabilities: { type: ["number", "null"], description: "Total liabilities (ETB)." },
  },
  required: ["bank_code", "bank_name", "bank_type"],
};
