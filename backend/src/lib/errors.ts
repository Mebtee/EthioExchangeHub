/**
 * Application error hierarchy.
 *
 * Every error the API deliberately raises extends `AppError`, carrying an
 * HTTP status and a stable machine-readable code. The centralized error
 * middleware (`middleware/error-handler.ts`) converts these into the
 * standard error envelope `{ success: false, message, data: null }`.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = "APP_ERROR") {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** 422 — request failed schema/business validation. */
export class ValidationError extends AppError {
  constructor(message = "Validation failed.") {
    super(message, 422, "VALIDATION_ERROR");
  }
}

/** 401 — missing/invalid/expired credentials. */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/** 403 — authenticated but not allowed to perform the action. */
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

/** 404 — requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super(message, 404, "NOT_FOUND_ERROR");
  }
}

/** 409 — the request conflicts with the current state (e.g. duplicate). */
export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state.") {
    super(message, 409, "CONFLICT_ERROR");
  }
}

/** 500 — a database/repository operation failed (wraps the underlying error). */
export class DatabaseError extends AppError {
  constructor(message = "A database operation failed.", cause?: unknown) {
    super(message, 500, "DATABASE_ERROR");
    if (cause instanceof Error) this.cause = cause;
  }
}
