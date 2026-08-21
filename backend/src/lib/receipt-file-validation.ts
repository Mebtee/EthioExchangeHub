import { ValidationError } from "@/lib/errors";

/**
 * Upload validation for payment receipts (Phase 3).
 *
 * SECURITY: the client-declared MIME type is NEVER trusted alone. A file is
 * accepted only when BOTH the declared type and the actual magic bytes match
 * the allowlist — so a `.png` that is really an executable, script, or HTML
 * payload is rejected on content, not on filename.
 */

/** Hard size cap for uploaded receipts (5 MB). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

/** The only content types a payment receipt may have. */
export const RECEIPT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export type ReceiptMimeType = (typeof RECEIPT_ALLOWED_MIME_TYPES)[number];

/** File extension used in server-generated storage paths. */
const EXTENSION_BY_MIME: Record<ReceiptMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Detects the real content type from magic bytes, or null when the bytes do
 * not match any allowlisted format.
 */
export function detectReceiptMime(buffer: Buffer): ReceiptMimeType | null {
  if (buffer.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
    return "image/png";
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  // PDF: %PDF-
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  )
    return "application/pdf";
  // WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return "image/webp";
  return null;
}

/**
 * Validates an uploaded receipt (size, declared type, and actual bytes) and
 * returns the canonical extension for the storage path. Throws ValidationError
 * with a client-safe message on any violation.
 */
export function validateReceiptUpload(
  declaredMimeType: string,
  filename: string | undefined,
  buffer: Buffer,
): { extension: string; mimeType: ReceiptMimeType } {
  if (buffer.length === 0) {
    throw new ValidationError("The uploaded file is empty.");
  }
  if (buffer.length > RECEIPT_MAX_BYTES) {
    throw new ValidationError("The receipt must be 5 MB or smaller.");
  }
  const allowed = RECEIPT_ALLOWED_MIME_TYPES as readonly string[];
  if (!allowed.includes(declaredMimeType)) {
    throw new ValidationError("The receipt must be a PNG, JPEG, WEBP image or a PDF document.");
  }
  const detected = detectReceiptMime(buffer);
  if (detected !== declaredMimeType) {
    // Content does not match the declaration — treat every mismatch the same
    // way, never leaking what the file actually is.
    throw new ValidationError(
      "The file content does not match its type. Upload a genuine PNG, JPEG, WEBP or PDF receipt.",
    );
  }
  if (filename !== undefined && filename.includes("\u0000")) {
    throw new ValidationError("The filename contains invalid characters.");
  }
  return { extension: EXTENSION_BY_MIME[detected], mimeType: detected };
}
