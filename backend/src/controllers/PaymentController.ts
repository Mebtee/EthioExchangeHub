import type { Request, Response } from "express";

import { AuthenticationError, ValidationError } from "@/lib/errors";
import { asyncHandler } from "@/middleware/async-handler";
import type { PaymentService, ReceiptUploadFile } from "@/services/PaymentService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for the customer payment endpoints (Phase 3): bank account
 * listing, payment submission, payment history, receipt upload. Reads
 * validated fields, delegates to the service, returns the standard envelope.
 */
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** ACTIVE bank accounts for manual transfers. */
  getPaymentMethods = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const methods = await this.paymentService.getPaymentMethods();
    successResponse(res, methods, "Payment methods retrieved.");
  });

  /** Submits a bank-transfer payment for one of the caller's subscriptions. */
  submitPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const body = req.body as { subscription_id: string; customer_transaction_ref: string };
    const payment = await this.paymentService.submitPayment(userId, {
      subscriptionId: body.subscription_id,
      customerTransactionRef: body.customer_transaction_ref,
    });
    successResponse(res, payment, "Payment submitted.", 201);
  });

  /** The caller's payments, newest first. */
  listPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const payments = await this.paymentService.listPayments(userId);
    successResponse(res, payments, "Payments retrieved.");
  });

  /**
   * Uploads the receipt for one of the caller's payments. The multipart
   * middleware has already placed the validated file on `req.file`.
   */
  uploadReceipt = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const file = requireReceiptFile(req);
    const result = await this.paymentService.uploadReceipt(userId, req.params.id!, file);
    successResponse(res, result, "Receipt uploaded.", 201);
  });
}

/** `requireAuth` guarantees `req.user`; a miss means an unguarded mount. */
function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (userId === undefined) throw new AuthenticationError("Authentication required.");
  return userId;
}

/** Extracts the uploaded file or rejects clearly when it is missing. */
function requireReceiptFile(req: Request): ReceiptUploadFile {
  const file = req.file;
  if (!file) throw new ValidationError("A receipt file is required in the 'receipt' field.");
  return {
    mimeType: file.mimetype,
    originalName: file.originalname,
    buffer: file.buffer,
  };
}
