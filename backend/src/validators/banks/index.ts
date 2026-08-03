/**
 * Bank query validation. `GET /api/v1/banks` accepts the `activeOnly` boolean
 * and the `bankType` filter (live schema: private / state_owned).
 */

import { z } from "zod";

import { booleanStringSchema } from "../common";

/** Query for `GET /banks` — all filters optional. */
export const bankListQuerySchema = z.object({
  activeOnly: booleanStringSchema.optional(),
  bankType: z
    .enum(["private", "state_owned"], {
      errorMap: () => ({ message: 'must be "private" or "state_owned"' }),
    })
    .optional(),
});
