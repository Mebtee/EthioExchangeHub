import { ConflictError, DatabaseError, NotFoundError } from "@/lib/errors";
import type { ReceiptStorage } from "@/lib/receipt-storage";
import { RECEIPT_URL_TTL_SECONDS } from "@/lib/receipt-storage";
import { logger } from "@/lib/logger";
import type { BankPaymentConfigRepository } from "@/repositories/BankPaymentConfigRepository";
import type { PaymentReceiptsRepository } from "@/repositories/PaymentReceiptsRepository";
import type { PaymentsRepository } from "@/repositories/PaymentsRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { BankPaymentConfigRow, PaymentRow } from "@/types/database";
import { addOneMonthIso, nowIso } from "@/utils/date";

/** Review decision carried by `POST /admin/payments/:id/review`. */
export interface ReviewPaymentInput {
  action: "under_review" | "approve" | "reject";
  rejectionReason?: string;
}

/** Admin payment view — includes reviewer identity (admins may see it). */
export interface AdminPaymentView {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  planId: string;
  amount: number;
  currency: string;
  paymentReference: string;
  customerTransactionRef: string | null;
  paymentMethod: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Bank account as seen by admins (full row, including inactive ones). */
export interface AdminBankAccountView {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a bank account (validated upstream). */
export interface CreateBankAccountInput {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string;
  instructions?: string;
}

/** Partial update for a bank account; presence of a key means "change it". */
export interface UpdateBankAccountInput {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branchName?: string | null;
  instructions?: string | null;
  isActive?: boolean;
}

/** Public contract of the admin payments service (Phase 3). */
export interface AdminPaymentService {
  /** All payments, newest first, optionally filtered by status. */
  listPayments(status?: string): Promise<AdminPaymentView[]>;
  /** One payment by id. */
  getPayment(paymentId: string): Promise<AdminPaymentView>;
  /**
   * Applies a review transition. Approving an ELIGIBLE payment activates its
   * subscription exactly once; re-approving is refused without side effects.
   */
  reviewPayment(
    paymentId: string,
    adminUserId: string,
    input: ReviewPaymentInput,
  ): Promise<AdminPaymentView>;
  /** Short-lived signed URL for the receipt attached to a payment. */
  getReceiptUrl(paymentId: string): Promise<{ url: string; expiresInSeconds: number }>;
  /** All bank accounts, including inactive ones. */
  listBankAccounts(): Promise<AdminBankAccountView[]>;
  createBankAccount(input: CreateBankAccountInput): Promise<AdminBankAccountView>;
  updateBankAccount(id: string, input: UpdateBankAccountInput): Promise<AdminBankAccountView>;
}

/**
 * Admin payment review + bank configuration (Phase 3).
 *
 * ACTIVATION RULE (the heart of Phase 3): moving a payment from
 * pending/under_review to approved stamps the associated subscription
 * `active` with a fresh one-month billing period derived from server time
 * and the plan's monthly interval — never from client input. Approval is
 * guarded: an already-approved payment answers 409 WITHOUT re-activating or
 * extending anything, so double approval can never corrupt billing.
 *
 * NOTE ON ATOMICITY: supabase-js performs the two writes (payment +
 * subscription) as separate statements; if the second fails the admin sees a
 * 500 while the payment stays approved (guarded against re-activation).
 * Recovery is manual support — accepted for this phase, documented in the
 * Phase 3 report.
 */
export class AdminPaymentServiceImpl implements AdminPaymentService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly receiptsRepository: PaymentReceiptsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly bankConfigRepository: BankPaymentConfigRepository,
    private readonly receiptStorage: ReceiptStorage,
  ) {}

  async listPayments(status?: string): Promise<AdminPaymentView[]> {
    const payments = await this.paymentsRepository.findAllOrdered(status);
    return payments.map((payment) => AdminPaymentServiceImpl.toView(payment));
  }

  async getPayment(paymentId: string): Promise<AdminPaymentView> {
    const payment = await this.requirePayment(paymentId);
    return AdminPaymentServiceImpl.toView(payment);
  }

  async reviewPayment(
    paymentId: string,
    adminUserId: string,
    input: ReviewPaymentInput,
  ): Promise<AdminPaymentView> {
    const payment = await this.requirePayment(paymentId);

    // Terminal states never move again.
    if (
      payment.status === "approved" ||
      payment.status === "rejected" ||
      payment.status === "cancelled"
    ) {
      throw new ConflictError(
        payment.status === "approved"
          ? "This payment has already been approved."
          : `This payment is ${payment.status} and can no longer be reviewed.`,
      );
    }

    const timestamp = nowIso();

    if (input.action === "under_review") {
      if (payment.status !== "pending") {
        throw new ConflictError("Only pending payments can be moved under review.");
      }
      const updated = await this.paymentsRepository.updateBy(
        { id: payment.id },
        { status: "under_review", updated_at: timestamp },
      );
      if (!updated) throw new DatabaseError("The payment could not be updated.");
      logger.info("Admin moved payment under review", {
        paymentId: payment.id,
        reviewedBy: adminUserId,
      });
      return AdminPaymentServiceImpl.toView(updated);
    }

    // approve / reject share the same review stamping…
    const updated = await this.paymentsRepository.updateBy(
      { id: payment.id },
      input.action === "approve"
        ? {
            status: "approved",
            reviewed_at: timestamp,
            reviewed_by: adminUserId,
            updated_at: timestamp,
          }
        : {
            status: "rejected",
            reviewed_at: timestamp,
            reviewed_by: adminUserId,
            rejection_reason: input.rejectionReason!,
            updated_at: timestamp,
          },
    );
    if (!updated) throw new DatabaseError("The payment could not be updated.");

    if (input.action === "reject") {
      logger.info("Admin rejected a payment", {
        paymentId: payment.id,
        reviewedBy: adminUserId,
      });
      return AdminPaymentServiceImpl.toView(updated);
    }

    // …and approval additionally activates the subscription EXACTLY ONCE.
    await this.activateSubscriptionForPayment(updated, timestamp);

    logger.info("Admin approved a payment", {
      paymentId: payment.id,
      reviewedBy: adminUserId,
    });
    return AdminPaymentServiceImpl.toView(updated);
  }

  async getReceiptUrl(paymentId: string): Promise<{ url: string; expiresInSeconds: number }> {
    const payment = await this.requirePayment(paymentId);
    const receipt = await this.receiptsRepository.findByPayment(payment.id);
    if (!receipt) throw new NotFoundError("No receipt has been uploaded for this payment.");
    const url = await this.receiptStorage.signedUrl(receipt.storage_path, RECEIPT_URL_TTL_SECONDS);
    return { url, expiresInSeconds: RECEIPT_URL_TTL_SECONDS };
  }

  async listBankAccounts(): Promise<AdminBankAccountView[]> {
    const accounts = await this.bankConfigRepository.findAllOrdered();
    return accounts.map((account) => AdminPaymentServiceImpl.toBankView(account));
  }

  async createBankAccount(input: CreateBankAccountInput): Promise<AdminBankAccountView> {
    const timestamp = nowIso();
    const created = await this.bankConfigRepository.insert({
      bank_name: input.bankName,
      account_name: input.accountName,
      account_number: input.accountNumber,
      branch_name: input.branchName ?? null,
      instructions: input.instructions ?? null,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp,
    });
    logger.info("Admin created a bank account", { bankConfigId: created.id });
    return AdminPaymentServiceImpl.toBankView(created);
  }

  async updateBankAccount(
    id: string,
    input: UpdateBankAccountInput,
  ): Promise<AdminBankAccountView> {
    const existing = await this.bankConfigRepository.findById(id);
    if (!existing) throw new NotFoundError("Bank account not found.");

    const payload: Record<string, unknown> = { updated_at: nowIso() };
    if (input.bankName !== undefined) payload.bank_name = input.bankName;
    if (input.accountName !== undefined) payload.account_name = input.accountName;
    if (input.accountNumber !== undefined) payload.account_number = input.accountNumber;
    if (input.branchName !== undefined) payload.branch_name = input.branchName;
    if (input.instructions !== undefined) payload.instructions = input.instructions;
    if (input.isActive !== undefined) payload.is_active = input.isActive;

    const updated = await this.bankConfigRepository.updateBy({ id }, payload);
    if (!updated) throw new DatabaseError("The bank account could not be updated.");
    logger.info("Admin updated a bank account", {
      bankConfigId: id,
      isActive: updated.is_active,
    });
    return AdminPaymentServiceImpl.toBankView(updated);
  }

  /**
   * Stamps the payment's subscription active with a one-month period starting
   * NOW (server time). Called only on the approved transition — never on
   * resubmission, rejection, or repeated approval.
   */
  private async activateSubscriptionForPayment(
    approvedPayment: PaymentRow,
    timestamp: string,
  ): Promise<void> {
    if (approvedPayment.subscription_id === null) {
      // Every Phase 3 payment targets a subscription; a missing link is a
      // data-integrity problem, not a client problem.
      throw new DatabaseError("The payment has no associated subscription to activate.");
    }
    const updated = await this.subscriptionsRepository.updateBy(
      { id: approvedPayment.subscription_id },
      {
        status: "active",
        starts_at: timestamp,
        current_period_start: timestamp,
        current_period_end: addOneMonthIso(timestamp),
        ends_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        updated_at: timestamp,
      },
    );
    if (!updated) {
      throw new DatabaseError("The associated subscription could not be activated.");
    }
  }

  private async requirePayment(paymentId: string): Promise<PaymentRow> {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment) throw new NotFoundError("Payment not found.");
    return payment;
  }

  private static toView(row: PaymentRow): AdminPaymentView {
    return {
      id: row.id,
      customerId: row.customer_id,
      subscriptionId: row.subscription_id,
      planId: row.plan_id,
      amount: row.amount,
      currency: row.currency,
      paymentReference: row.payment_reference,
      customerTransactionRef: row.customer_transaction_ref,
      paymentMethod: row.payment_method,
      status: row.status,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static toBankView(row: BankPaymentConfigRow): AdminBankAccountView {
    return {
      id: row.id,
      bankName: row.bank_name,
      accountName: row.account_name,
      accountNumber: row.account_number,
      branchName: row.branch_name,
      instructions: row.instructions,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
