import type { Request, Response } from "express";

import { AuthenticationError } from "@/lib/errors";
import { asyncHandler } from "@/middleware/async-handler";
import type { AdminPaymentService, ReviewPaymentInput } from "@/services/AdminPaymentService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for the admin payment-review and bank-configuration endpoints
 * (Phase 3). Mounted behind `requireAuth` + `requireRole("admin","super_admin")`.
 */
export class AdminPaymentController {
  constructor(private readonly adminPaymentService: AdminPaymentService) {}

  /** Lists payments, optionally filtered by status. */
  listPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const status = (req.query.status as string | undefined) ?? undefined;
    const payments = await this.adminPaymentService.listPayments(status);
    successResponse(res, payments, "Payments retrieved.");
  });

  /** One payment by id. */
  getPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const payment = await this.adminPaymentService.getPayment(req.params.id!);
    successResponse(res, payment, "Payment retrieved.");
  });

  /** Applies a review transition; approval activates the subscription. */
  reviewPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const adminUserId = requireUserId(req);
    const body = req.body as { action: ReviewPaymentInput["action"]; rejection_reason?: string };
    const payment = await this.adminPaymentService.reviewPayment(req.params.id!, adminUserId, {
      action: body.action,
      rejectionReason: body.rejection_reason,
    });
    successResponse(res, payment, `Payment ${payment.status.replace("_", " ")}.`);
  });

  /** Short-lived signed URL to view an uploaded receipt. */
  getReceiptUrl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await this.adminPaymentService.getPayment(req.params.id!); // 404 semantics first
    const receipt = await this.adminPaymentService.getReceiptUrl(req.params.id!);
    successResponse(res, receipt, "Receipt URL generated.");
  });

  /** All bank accounts, including inactive ones. */
  listBankAccounts = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const accounts = await this.adminPaymentService.listBankAccounts();
    successResponse(res, accounts, "Bank accounts retrieved.");
  });

  /** Creates a bank account (active by default). */
  createBankAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      bank_name: string;
      account_name: string;
      account_number: string;
      branch_name?: string;
      instructions?: string;
    };
    const account = await this.adminPaymentService.createBankAccount({
      bankName: body.bank_name,
      accountName: body.account_name,
      accountNumber: body.account_number,
      branchName: body.branch_name,
      instructions: body.instructions,
    });
    successResponse(res, account, "Bank account created.", 201);
  });

  /** Updates a bank account (fields and/or is_active). */
  updateBankAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      bank_name?: string;
      account_name?: string;
      account_number?: string;
      branch_name?: string | null;
      instructions?: string | null;
      is_active?: boolean;
    };
    const account = await this.adminPaymentService.updateBankAccount(req.params.id!, {
      bankName: body.bank_name,
      accountName: body.account_name,
      accountNumber: body.account_number,
      branchName: body.branch_name,
      instructions: body.instructions,
      isActive: body.is_active,
    });
    successResponse(res, account, "Bank account updated.");
  });
}

/** `requireAuth` guarantees `req.user`; a miss means an unguarded mount. */
function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (userId === undefined) throw new AuthenticationError("Authentication required.");
  return userId;
}
