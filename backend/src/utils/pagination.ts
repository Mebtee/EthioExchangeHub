/** Pagination helpers shared by repositories and controllers. */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Parses raw query values into a clamped (page, limit) pair. */
export function parsePagination(
  rawPage: unknown,
  rawLimit: unknown,
  defaultLimit = DEFAULT_LIMIT,
): PaginationParams {
  const page = toPositiveInt(rawPage, 1);
  const requested = toPositiveInt(rawLimit, defaultLimit);
  return { page, limit: Math.min(requested, MAX_LIMIT) };
}

/** Computes a SQL offset for the given page/limit. */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/** Computes pagination metadata from a total row count. */
export function getPaginationMeta(
  total: number,
  { page, limit }: PaginationParams,
): PaginationMeta {
  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (parsed > 0) return parsed;
  }
  return fallback;
}
