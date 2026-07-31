import axios from "axios";

import { getAccessToken } from "@/lib/auth-token";
import { config } from "@/lib/config";
import type { ApiResponse } from "@/types/exchange-rate";

/** Normalized API error carrying an optional HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The shared Axios instance for the Express REST API. */
export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeoutMs,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ---- Request interceptor: attach the bearer token when present ----
apiClient.interceptors.request.use(
  (request) => {
    const token = getAccessToken();
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
    return request;
  },
  (error) => Promise.reject(error),
);

function isApiEnvelope(body: unknown): body is ApiResponse<unknown> {
  return typeof body === "object" && body !== null && "success" in body && "data" in body;
}

/** Normalizes any error (network, timeout, HTTP, envelope) into an ApiError. */
function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data;
    const serverMessage =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : undefined;

    let message = serverMessage;
    if (!message) {
      if (error.code === "ECONNABORTED") {
        message = "The request timed out. Please try again.";
      } else if (status === 401) {
        message = "Your session has expired. Please sign in again.";
      } else if (status === 403) {
        message = "You do not have permission to perform this action.";
      } else if (status === 404) {
        message = "The requested resource was not found.";
      } else if (status != null && status >= 500) {
        message = "The server encountered an error. Please try again later.";
      } else {
        message = error.message || "Unable to reach the API service.";
      }
    }
    return new ApiError(message, status);
  }

  return error instanceof Error
    ? new ApiError(error.message)
    : new ApiError("An unexpected error occurred.");
}

// ---- Response interceptor: unwrap the envelope + normalize errors ----
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    // Every endpoint returns { success, message, data } — unwrap to `data`.
    if (isApiEnvelope(body)) {
      if (body.success === false) {
        return Promise.reject(new ApiError(body.message || "Request failed.", response.status));
      }
      response.data = body.data;
    }
    return response;
  },
  (error: unknown) => Promise.reject(toApiError(error)),
);
