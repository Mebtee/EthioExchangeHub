import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { ConflictError, DatabaseError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import type { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import type { CustomersRepository } from "@/repositories/CustomersRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { ApiKeyRow } from "@/types/database";
import { nowIso } from "@/utils/date";

/** Input for creating an API key (validated upstream by the Zod schema). */
export interface CreateApiKeyInput {
  name: string;
  /** Optional ISO-8601 expiration; must be in the future when supplied. */
  expiresAt?: string;
}

/** Public API-key shape — NEVER includes `key_hash` or the full secret. */
export interface ApiKeyView {
  id: string;
  name: string;
  /** Public identifier (`eeh_live_` + first secret chars) — not the key. */
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Creation response: the view PLUS the full key, shown exactly once. */
export interface CreatedApiKey extends ApiKeyView {
  /** The complete API key secret — only ever present on creation. */
  key: string;
}

/** Public contract of the customer API-key service. */
export interface CustomerApiKeysService {
  /** Creates a scoped key for the authenticated customer and returns the secret once. */
  createKey(userId: string, input: CreateApiKeyInput): Promise<CreatedApiKey>;
  /** Lists ONLY the authenticated customer's keys (no secrets). */
  listKeys(userId: string): Promise<ApiKeyView[]>;
  /** Secure revocation of an owned key (idempotent). Never deletes rows. */
  revokeKey(userId: string, keyId: string): Promise<ApiKeyView>;
}

/**
 * Customer API-key management business logic (Phase 2B).
 *
 * ISOLATION: every operation resolves `customers.id` from the authenticated
 * `users.id` (JWT subject) and scopes all repository calls by it. A client
 * cannot pass a customer or key owner anywhere — ids in URLs can only ever
 * match keys already scoped to the caller.
 *
 * SECRET HANDLING: the full key exists exactly once — in the value returned
 * by {@link createKey}. Only `key_prefix` and its SHA-256 digest are stored,
 * and logs never receive more than the key id. There is deliberately no
 * "show key again" path: revocation + re-creation is the recovery story.
 *
 * PLAN LIMIT ENFORCEMENT (completed in Phase 2C): key creation REQUIRES an
 * ACTIVE subscription. Pending/cancelled/expired/suspended subscriptions are
 * not active and never grant quota; without an active subscription creation
 * answers 409 — no subscription record is ever invented here. With an active
 * subscription, the plan's `max_api_keys` caps the number of NON-REVOKED keys
 * (revocation is this phase's delete, so freed slots are immediately
 * reusable). Customers can always self-serve a free plan via the Phase 2C
 * subscription endpoint to reach an active state legitimately.
 */
export class CustomerApiKeysServiceImpl implements CustomerApiKeysService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly apiPlansRepository: ApiPlansRepository,
  ) {}

  async createKey(userId: string, input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const customer = await this.requireCustomer(userId);

    const expiresAt = input.expiresAt;
    if (expiresAt !== undefined && new Date(expiresAt).getTime() <= Date.now()) {
      throw new ValidationError("expires_at: must be a timestamp in the future.");
    }
    // Normalize to a canonical UTC ISO string BEFORE persisting: expiry is
    // enforced by string comparison against nowIso() in the commercial auth
    // middleware, so date-only or timezone-offset inputs ("2027-01-01",
    // "…+03:00") would compare incorrectly. Invalid timestamps are rejected
    // here rather than poisoning the stored row.
    let normalizedExpiresAt: string | null = null;
    if (expiresAt !== undefined) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new ValidationError("expires_at: must be a valid ISO 8601 timestamp.");
      }
      normalizedExpiresAt = parsed.toISOString();
    }

    await this.enforcePlanLimit(customer.id);

    // The generated plaintext lives in this local only — returned once below,
    // never persisted, never logged.
    const { key, keyPrefix } = generateApiKey();
    const timestamp = nowIso();
    const created = await this.apiKeysRepository.insert({
      customer_id: customer.id,
      name: input.name.trim(),
      key_prefix: keyPrefix,
      key_hash: hashApiKey(key),
      expires_at: normalizedExpiresAt,
      // No database trigger maintains these columns, so both are stamped
      // here (same convention as settings/manual-rates updates).
      revoked_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    });

    logger.info("Created a customer API key", { keyId: created.id, customerId: customer.id });
    return { ...CustomerApiKeysServiceImpl.toView(created), key };
  }

  async listKeys(userId: string): Promise<ApiKeyView[]> {
    const customer = await this.requireCustomer(userId);
    const rows = await this.apiKeysRepository.findByCustomer(customer.id);
    return rows.map((row) => CustomerApiKeysServiceImpl.toView(row));
  }

  async revokeKey(userId: string, keyId: string): Promise<ApiKeyView> {
    const customer = await this.requireCustomer(userId);

    // Ownership filter is part of the lookup itself: another customer's key
    // (or an unknown id) is indistinguishable — both answer 404.
    const existing = await this.apiKeysRepository.findByIdAndCustomer(keyId, customer.id);
    if (!existing) throw new NotFoundError("API key not found.");

    // Idempotent: revoking an already-revoked key keeps the original stamp.
    if (existing.revoked_at !== null) return CustomerApiKeysServiceImpl.toView(existing);

    const revokedAt = nowIso();
    const revoked = await this.apiKeysRepository.revokeByIdAndCustomer(
      existing.id,
      customer.id,
      revokedAt,
    );
    logger.info("Revoked a customer API key", { keyId: existing.id, customerId: customer.id });
    return CustomerApiKeysServiceImpl.toView(revoked ?? existing);
  }

  /** Resolves the caller's customer profile; every service operation needs it. */
  private async requireCustomer(userId: string) {
    const customer = await this.customersRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError("Customer profile not found.");
    return customer;
  }

  /**
   * Caps non-revoked keys at the active plan's `max_api_keys`. An active
   * subscription is REQUIRED (Phase 2C): any other state — none, pending,
   * cancelled, expired, suspended — refuses creation without inventing
   * records; see the class-level note.
   */
  private async enforcePlanLimit(customerId: string): Promise<void> {
    const subscription = await this.subscriptionsRepository.findLatestActiveByCustomer(customerId);
    if (!subscription) {
      throw new ConflictError(
        "An active subscription is required to create API keys. Select a plan first.",
      );
    }
    const plan = await this.apiPlansRepository.findById(subscription.plan_id);
    if (!plan) {
      // FK-integrity violation — a subscription pointing at a missing plan is
      // a data problem, not a client problem.
      throw new DatabaseError("The subscription plan could not be resolved.");
    }

    const keys = await this.apiKeysRepository.findByCustomer(customerId);
    const activeCount = keys.filter((key) => key.revoked_at === null).length;
    if (activeCount >= plan.max_api_keys) {
      throw new ConflictError(
        `The maximum number of API keys for your plan (${plan.max_api_keys}) has been reached.`,
      );
    }
  }

  /** Maps a row to the public view — strips `key_hash` and `customer_id`. */
  private static toView(row: ApiKeyRow): ApiKeyView {
    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.key_prefix,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
