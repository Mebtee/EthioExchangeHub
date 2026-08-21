import type { ReceiptStorage } from "@/lib/receipt-storage";

/**
 * In-memory replacement for `SupabaseReceiptStorage` used by integration
 * tests (vi.mock of `@/lib/receipt-storage`). Captures uploads so tests can
 * assert on server-generated paths without touching network or disk.
 */
export class FakeReceiptStorage implements ReceiptStorage {
  readonly objects = new Map<string, { content: Buffer; mimeType: string }>();

  async upload(path: string, content: Buffer, mimeType: string): Promise<void> {
    this.objects.set(path, { content, mimeType });
  }

  async signedUrl(path: string): Promise<string> {
    return `https://signed.test/${path}?token=fake`;
  }
}
