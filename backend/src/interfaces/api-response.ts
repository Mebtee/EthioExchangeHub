/**
 * Shared API envelope types.
 *
 * Single source of truth lives in `utils/api-response.ts` (the helpers that
 * send these envelopes); this module re-exports them so layers that want
 * types only (e.g. controllers, services) can import from `@/interfaces`.
 */
export {
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type ApiResponse,
} from "@/utils/api-response";
