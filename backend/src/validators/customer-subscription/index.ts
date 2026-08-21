/**
 * Customer subscription request validation (Phase 2C).
 *
 * The customer controls ONLY the plan choice. Every other field — customer,
 * status, price, currency, billing periods — is backend-derived from the
 * selected plan row and the authenticated identity; the strict schema makes
 * mass assignment impossible.
 */

import { z } from "zod";

import { uuidSchema } from "../common";

/** Body for `POST /customer/subscription` — plan selection. */
export const createSubscriptionBodySchema = z.object({ plan_id: uuidSchema }).strict();
