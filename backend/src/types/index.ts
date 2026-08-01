/** Shared domain types used across the application. */

export type Maybe<T> = T | null | undefined;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Request "actor" metadata attached by future auth middleware. */
export interface RequestActor {
  userId: number;
  role: string;
}
