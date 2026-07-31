export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | undefined> },
): Promise<T> {
  const { params, ...requestInit } = init ?? {};
  const url = new URL(`${API_BASE_URL.replace(/\/$/, "")}${path}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: "application/json", ...(requestInit.headers ?? {}) },
      ...requestInit,
    });
  } catch {
    throw new ApiError("Unable to reach the exchange rate service.");
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}
