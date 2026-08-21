import multer from "multer";
import type { NextFunction, Request, Response } from "express";

import { ValidationError } from "@/lib/errors";
import { RECEIPT_MAX_BYTES } from "@/lib/receipt-file-validation";

/**
 * Multipart handling for payment-receipt uploads (Phase 3).
 *
 * Files are held IN MEMORY only and never written to disk by Express itself;
 * content-type/size validation and storage happen in the service layer
 * (magic-byte sniffing + private-bucket upload). Multer's own errors are
 * translated into the standard 422 validation envelope.
 */
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RECEIPT_MAX_BYTES, files: 1 },
});

/** Single-file middleware for `POST /customer/payments/:id/receipt`. */
export function requireSingleUpload(field: string) {
  const handler = receiptUpload.single(field);
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        next(
          error.code === "LIMIT_FILE_SIZE"
            ? new ValidationError("The receipt must be 5 MB or smaller.")
            : new ValidationError("The receipt could not be processed."),
        );
        return;
      }
      if (error !== undefined && error !== null) {
        next(error);
        return;
      }
      next();
    });
  };
}
