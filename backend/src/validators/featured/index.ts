/**
 * Featured-content validation — public click body, admin create body, and
 * admin update body.
 *
 * Body schemas are strict: unknown keys are rejected so typos surface as 422
 * instead of being silently ignored. Security rules live HERE, at the API
 * boundary:
 *   - image and external destination URLs must be absolute http(s) URLs;
 *   - `javascript:`/`data:`/etc. schemes are rejected by the URL checks;
 *   - internal destinations must be client-side route paths (start with `/`);
 *   - end date cannot be before start date.
 */

import { z } from "zod";

/** Destination type: a client-side route or an external website. */
export const destinationTypeSchema = z.enum(["internal", "external"]);
export type DestinationType = z.infer<typeof destinationTypeSchema>;

const maxLengthMessage = (max: number): string => `must be at most ${max} characters`;

/** Empty/whitespace-only strings normalize to null (mirrors the service). */
function emptyToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

/** Optional trimmed text; empty/whitespace normalizes to null. */
function nullishText(max: number) {
  return z.preprocess(emptyToNull, z.string().trim().max(max, maxLengthMessage(max)).nullish());
}

/** Optional ISO-8601 date-time; empty/whitespace normalizes to null. */
function nullishDatetime() {
  return z.preprocess(
    emptyToNull,
    z.string().datetime({ offset: true, message: "must be a valid ISO-8601 date-time" }).nullish(),
  );
}

/** Parses a URL safely; returns null when malformed. */
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** True when the URL uses the http or https scheme. */
function isHttpUrl(value: string): boolean {
  const parsed = parseUrl(value);
  return parsed !== null && (parsed.protocol === "http:" || parsed.protocol === "https:");
}

/** True for protocol-relative URLs such as `//evil.com`. */
function isProtocolRelativeUrl(value: string): boolean {
  return value.startsWith("//");
}

/**
 * Validates a `destination_url`/`destination_type` pair and returns the first
 * problem, or null when valid.
 *
 * External destinations must be absolute http(s) URLs — `javascript:`,
 * `data:`, `vbscript:` and every other scheme is rejected because the URL
 * parser only accepts `http:`/`https:`. Internal destinations must be a
 * client-side route path (leading `/`); protocol-relative URLs (`//host`)
 * are rejected explicitly even though they start with `/`.
 *
 * When the type is unknown (PATCH with only `destination_url`), any value that
 * could be valid for EITHER stored type is accepted here — unsafe schemes and
 * protocol-relative URLs still fail. The service re-validates the MERGED final
 * pair against the stored type, so the exact rule always wins.
 */
export function validateDestinationPair(
  url: string,
  type: DestinationType | undefined,
): string | null {
  if (type === "external") {
    return isHttpUrl(url) ? null : "external destinations must be a valid http:// or https:// URL";
  }
  if (type === "internal") {
    if (isProtocolRelativeUrl(url)) {
      return "internal destinations must not use protocol-relative URLs";
    }
    if (!url.startsWith("/")) {
      return "internal destinations must be a route path starting with /";
    }
    return null;
  }
  if (isHttpUrl(url)) return null;
  if (isProtocolRelativeUrl(url)) {
    return "destinations must not use protocol-relative URLs";
  }
  if (url.startsWith("/")) return null;
  return "destinations must be a route path starting with / or an absolute http(s) URL";
}

/** Attaches the pair validation result as a Zod issue on `destination_url`. */
function validateDestinationUrl(
  url: string,
  type: DestinationType | undefined,
  ctx: z.RefinementCtx,
): void {
  const message = validateDestinationPair(url, type);
  if (message !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["destination_url"],
      message,
    });
  }
}

/** Validates the schedule window: end_at cannot precede start_at. */
function validateSchedule(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  ctx: z.RefinementCtx,
): void {
  if (startAt && endAt && endAt < startAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_at"],
      message: "end date cannot be before start date",
    });
  }
}

/** Absolute http(s) URL for image assets. */
const httpUrlSchema = z
  .string()
  .url("must be a valid URL")
  .max(2048, maxLengthMessage(2048))
  .refine(isHttpUrl, "must use http:// or https://");

/** Every admin-controlled field (shared by create and update). */
const featuredContentFields = {
  title: z.string().trim().min(1, "must not be empty").max(200, maxLengthMessage(200)),
  description: nullishText(1000),
  image_url: httpUrlSchema,
  advertiser_name: nullishText(200),
  badge_text: z.preprocess(
    emptyToNull,
    z.string().trim().min(1, "must not be empty").max(40, maxLengthMessage(40)).nullish(),
  ),
  cta_text: z.preprocess(
    emptyToNull,
    z.string().trim().min(1, "must not be empty").max(60, maxLengthMessage(60)).nullish(),
  ),
  destination_url: z.string().trim().min(1, "must not be empty").max(2048, maxLengthMessage(2048)),
  destination_type: destinationTypeSchema,
  image_alt: nullishText(200),
  is_active: z.boolean().optional(),
  display_order: z
    .number()
    .int("must be an integer")
    .min(0, "must be 0 or greater")
    .max(9999, maxLengthMessage(9999))
    .optional(),
  start_at: nullishDatetime(),
  end_at: nullishDatetime(),
  feature_1_icon: nullishText(200),
  feature_1_title: nullishText(100),
  feature_1_description: nullishText(200),
  feature_2_icon: nullishText(200),
  feature_2_title: nullishText(100),
  feature_2_description: nullishText(200),
  feature_3_icon: nullishText(200),
  feature_3_title: nullishText(100),
  feature_3_description: nullishText(200),
};

/** Body for `POST /admin/featured`. */
export const createFeaturedContentBodySchema = z
  .object(featuredContentFields)
  .strict()
  .superRefine((value, ctx) => {
    validateDestinationUrl(value.destination_url, value.destination_type, ctx);
    validateSchedule(value.start_at, value.end_at, ctx);
  });

/** Body for `PATCH /admin/featured/:id` — any subset, at least one field. */
export const updateFeaturedContentBodySchema = z
  .object(featuredContentFields)
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  })
  .superRefine((value, ctx) => {
    if (value.destination_url !== undefined) {
      validateDestinationUrl(value.destination_url, value.destination_type, ctx);
    }
    validateSchedule(value.start_at, value.end_at, ctx);
  });

/** Body for `POST /featured/:id/click`. */
export const recordFeaturedClickBodySchema = z
  .object({
    destination_type: destinationTypeSchema.optional(),
  })
  .strict();
