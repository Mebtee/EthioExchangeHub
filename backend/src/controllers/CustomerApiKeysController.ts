import type { Request, Response } from "express";

import { AuthenticationError } from "@/lib/errors";
import { asyncHandler } from "@/middleware/async-handler";
import type { CustomerApiKeysService } from "@/services/CustomerApiKeysService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for the customer API-key endpoints. Reads validated fields,
 * delegates to the service, and returns the standard envelope. No business
 * logic here.
 *
 * The full key secret appears ONLY in the creation response body — never in
 * list responses, never in logs. `key_hash` is stripped by the service's view
 * mapping before anything reaches this layer.
 */
export class CustomerApiKeysController {
  constructor(private readonly apiKeysService: CustomerApiKeysService) {}

  /** Creates a key for the authenticated customer (secret shown exactly once). */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const { name, expires_at } = req.body as { name: string; expires_at?: string };
    const created = await this.apiKeysService.createKey(userId, {
      name,
      expiresAt: expires_at,
    });
    successResponse(res, created, "API key created successfully.", 201);
  });

  /** Lists the authenticated customer's keys — prefixes only, no secrets. */
  list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const keys = await this.apiKeysService.listKeys(userId);
    successResponse(res, keys, "API keys retrieved.");
  });

  /** Revokes one owned key (`revoked_at = now()`); rows are never deleted. */
  revoke = asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const key = await this.apiKeysService.revokeKey(userId, req.params.id);
    successResponse(res, key, "API key revoked.");
  });
}

/** `requireAuth` guarantees `req.user`; a miss means an unguarded mount. */
function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (userId === undefined) throw new AuthenticationError("Authentication required.");
  return userId;
}
