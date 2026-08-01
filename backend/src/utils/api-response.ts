import type { Response } from "express";

/**
 * Standard API envelope. Every endpoint response follows one of these
 * shapes:
 *
 * Success: { success: true, message: "...", data: {...} }
 * Error:   { success: false, message: "...", data: null }
 */

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Sends a standard success envelope. */
export function successResponse<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
): void {
  const body: ApiSuccessResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

/** Sends a standard error envelope. */
export function errorResponse(res: Response, message: string, statusCode = 500): void {
  const body: ApiErrorResponse = { success: false, message, data: null };
  res.status(statusCode).json(body);
}
