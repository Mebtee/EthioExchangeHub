/**
 * Exchange-rate validation. All routes are read-only; the only inputs are
 * route params (bank/currency) and the optional `from`/`to` date range.
 */

import { bankAndCurrencyParamsSchema, bankCodeParamsSchema, dateRangeQuerySchema } from "../common";

/** Query for `GET /rates/latest` (and `/latest/:bankCode`, `/history/:bankCode/:currencyCode`). */
export const latestRatesQuerySchema = dateRangeQuerySchema;

/** Params for `GET /rates/latest/:bankCode`. */
export const latestByBankParamsSchema = bankCodeParamsSchema;

/** Params for `GET /rates/latest/:bankCode/:currencyCode`. */
export const ratePairParamsSchema = bankAndCurrencyParamsSchema;

/** Params for `GET /rates/history/:bankCode/:currencyCode`. */
export const historyParamsSchema = bankAndCurrencyParamsSchema;
