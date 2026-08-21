import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import { DatabaseError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/database";

/**
 * Secure storage for payment receipts (Phase 3).
 *
 * Files live in a PRIVATE Supabase Storage bucket — never publicly readable.
 * Access happens exclusively through this module:
 *   - uploads use server-generated paths (customers never choose locations);
 *   - reads are short-lived signed URLs handed only to reviewing admins.
 *
 * The interface exists so tests can inject an in-memory fake without touching
 * network or disk.
 */
export interface ReceiptStorage {
  /** Stores the bytes at the given server-generated path. */
  upload(path: string, content: Buffer, mimeType: string): Promise<void>;
  /** Short-lived read URL for an admin reviewing a receipt. */
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}

/** Name of the private bucket holding uploaded receipts. */
export const RECEIPT_BUCKET = "payment-receipts";

/** How long an admin's signed receipt URL stays valid. */
export const RECEIPT_URL_TTL_SECONDS = 300;

/**
 * Production implementation over Supabase Storage. The bucket is ensured
 * lazily (created once, private) so no out-of-band dashboard step or extra
 * migration is required.
 */
export class SupabaseReceiptStorage implements ReceiptStorage {
  constructor(private readonly client: SupabaseClient<Database> = getSupabase()) {}

  async upload(path: string, content: Buffer, mimeType: string): Promise<void> {
    await this.ensureBucket();
    const { error } = await this.client.storage
      .from(RECEIPT_BUCKET)
      .upload(path, content, { contentType: mimeType, upsert: false });
    if (error !== null) {
      logger.error("Receipt upload failed", { path, message: error.message });
      throw new DatabaseError("The receipt could not be stored. Please try again.");
    }
  }

  async signedUrl(path: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(RECEIPT_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error !== null || data === null) {
      logger.error("Receipt signing failed", { path, message: error?.message });
      throw new DatabaseError("The receipt could not be opened. Please try again.");
    }
    return data.signedUrl;
  }

  /** Creates the PRIVATE bucket once; concurrent creation races are benign. */
  private async ensureBucket(): Promise<void> {
    const { data: buckets } = await this.client.storage.listBuckets();
    if (buckets?.some((bucket) => bucket.name === RECEIPT_BUCKET)) return;
    const { error } = await this.client.storage.createBucket(RECEIPT_BUCKET, { public: false });
    if (error !== null && !/exists/i.test(error.message)) {
      logger.error("Receipt bucket creation failed", { message: error.message });
    }
  }
}
