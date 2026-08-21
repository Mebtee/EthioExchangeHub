import { randomUUID } from "node:crypto";

import { validateReceiptUpload } from "@/lib/receipt-file-validation";
import type { ReceiptStorage } from "@/lib/receipt-storage";
import { ConflictError, DatabaseError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generatePaymentReference } from "@/lib/payment-references";
import type { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import type { BankPaymentConfigRepository } from "@/repositories/BankPaymentConfigRepository";
import type { CustomersRepository } from "@/repositories/CustomersRepository";
import type { PaymentReceiptsRepository } from "@/repositories/PaymentReceiptsRepository";
import type { PaymentsRepository } from "@/repositories/PaymentsRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { PaymentRow } from "@/types/database";
import { nowIso } from "@/utils/date";

/** Input for `POST /customer/payments` (validated upstream by the Zod schema). */
export interface SubmitPaymentInput {
  subscriptionId: string;
  customerTransactionRef: string;
}

/** Uploaded receipt file as handed to the service by the controller. */
export interface ReceiptUploadFile {
  /** Client-declared MIME type — never trusted alone (magic bytes are checked). */
  mimeType: string;
  /** Original client filename — stored sanitized for display only. */
  originalName: string | undefined;
  /** File content. */
  buffer: Buffer;
}

/** Active bank account as shown to customers before they transfer money. */
export interface PaymentMethodView {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
  instructions: string | null;
}

/**
 * Customer-facing payment view. `reviewed_by` (admin user id) is deliberately
 * excluded — customers learn WHO reviewed via nothing; the status and reason
 * are what matters to them.
 */
export interface PaymentView {
  id: string;
  paymentReference: string;
  subscriptionId: string | null;
  planId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  customerTransactionRef: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Result of a successful receipt upload — no storage path is ever exposed. */
export interface ReceiptUploadResult {
  id: string;
  paymentId: string;
  originalFilename: string | null;
  mimeType: string;
  uploadedAt: string;
}

/** Public contract of the customer payment service (Phase 3). */
export interface PaymentService {
  /** ACTIVE bank accounts with transfer instructions. */
  getPaymentMethods(): Promise<PaymentMethodView[]>;
  /**
   * Submits a manual bank-transfer payment for one of the caller's PENDING
   * subscriptions. Amount/currency/status/reference are server-derived.
   */
  submitPayment(userId: string, input: SubmitPaymentInput): Promise<PaymentView>;
  /** The caller's payments, newest first (isolation enforced). */
  listPayments(userId: string): Promise<PaymentView[]>;
  /** Uploads the receipt image/document for one of the caller's payments. */
  uploadReceipt(
    userId: string,
    paymentId: string,
    file: ReceiptUploadFile,
  ): Promise<ReceiptUploadResult>;
}

/** Subscription statuses eligible to receive a payment right now. */
const PAYMENT_ELIGIBLE_STATUSES = new Set(["pending"]);
/** Payment statuses that BLOCK a new submission for the same subscription. */
const OPEN_PAYMENT_STATUSES = new Set(["pending", "under_review", "approved"]);
/** Payment statuses that may still RECEIVE a receipt upload. */
const RECEIPT_ELIGIBLE_STATUSES = new Set(["pending", "under_review"]);

/**
 * Manual bank-transfer payments (Phase 3) — customer side.
 *
 * SERVER-CONTROLLED MONEY FIELDS: the client supplies only the subscription
 * choice and their bank transaction reference. The amount and currency come
 * from the subscription's plan row, the status starts at "pending", and the
 * payment reference is generated here — a customer can NEVER influence what
 * they are charged.
 *
 * ISOLATION: every lookup is scoped by the JWT-resolved `customers.id`;
 * another customer's subscription or payment is indistinguishable from a
 * nonexistent one (404).
 *
 * DUPLICATE PROTECTION: at most one OPEN payment per subscription, and a
 * bank transaction reference can be used at most once per customer.
 */
export class PaymentServiceImpl implements PaymentService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly apiPlansRepository: ApiPlansRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly receiptsRepository: PaymentReceiptsRepository,
    private readonly bankConfigRepository: BankPaymentConfigRepository,
    private readonly receiptStorage: ReceiptStorage,
  ) {}

  async getPaymentMethods(): Promise<PaymentMethodView[]> {
    const accounts = await this.bankConfigRepository.findActiveOrdered();
    return accounts.map((account) => ({
      id: account.id,
      bankName: account.bank_name,
      accountName: account.account_name,
      accountNumber: account.account_number,
      branchName: account.branch_name,
      instructions: account.instructions,
    }));
  }

  async submitPayment(userId: string, input: SubmitPaymentInput): Promise<PaymentView> {
    const customer = await this.requireCustomer(userId);

    const subscription = await this.subscriptionsRepository.findByIdAndCustomer(
      input.subscriptionId,
      customer.id,
    );
    if (!subscription) throw new NotFoundError("Subscription not found.");

    if (!PAYMENT_ELIGIBLE_STATUSES.has(subscription.status)) {
      throw new ConflictError(
        subscription.status === "active"
          ? "This subscription is already active."
          : `This subscription is ${subscription.status} and cannot be paid for. Select the plan again to create a new subscription.`,
      );
    }

    const existingPayments = await this.paymentsRepository.findBySubscription(subscription.id);
    const openPayment = existingPayments.find((payment) =>
      OPEN_PAYMENT_STATUSES.has(payment.status),
    );
    if (openPayment) {
      throw new ConflictError(
        openPayment.status === "approved"
          ? "This subscription has already been paid."
          : `A payment for this subscription is already ${openPayment.status.replace("_", " ")}. Wait for its review.`,
      );
    }

    if (
      await this.paymentsRepository.customerRefExists(customer.id, input.customerTransactionRef)
    ) {
      throw new ConflictError("This bank transaction reference has already been used.");
    }

    // Money fields ALWAYS come from the plan row — never from the request.
    const plan = await this.apiPlansRepository.findById(subscription.plan_id);
    if (!plan) {
      throw new DatabaseError("The subscription plan could not be resolved.");
    }
    if (!plan.is_active) {
      throw new ConflictError("This plan is currently unavailable.");
    }

    const timestamp = nowIso();
    const created = await this.paymentsRepository.insert({
      customer_id: customer.id,
      subscription_id: subscription.id,
      plan_id: plan.id,
      amount: plan.price,
      currency: plan.currency,
      payment_reference: generatePaymentReference(),
      customer_transaction_ref: input.customerTransactionRef,
      payment_method: "bank_transfer",
      status: "pending",
      submitted_at: timestamp,
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      created_at: timestamp,
      updated_at: timestamp,
    });

    logger.info("Customer submitted a bank-transfer payment", {
      paymentId: created.id,
      customerId: customer.id,
      subscriptionId: subscription.id,
    });
    return PaymentServiceImpl.toView(created);
  }

  async listPayments(userId: string): Promise<PaymentView[]> {
    const customer = await this.requireCustomer(userId);
    const payments = await this.paymentsRepository.findByCustomer(customer.id);
    return payments.map((payment) => PaymentServiceImpl.toView(payment));
  }

  async uploadReceipt(
    userId: string,
    paymentId: string,
    file: ReceiptUploadFile,
  ): Promise<ReceiptUploadResult> {
    const customer = await this.requireCustomer(userId);

    // Isolation first: a foreign payment id is a 404, not a permission error.
    const payment = await this.paymentsRepository.findByIdAndCustomer(paymentId, customer.id);
    if (!payment) throw new NotFoundError("Payment not found.");

    // Receipts attach only while review is still possible.
    if (!RECEIPT_ELIGIBLE_STATUSES.has(payment.status)) {
      throw new ConflictError(
        `This payment is ${payment.status.replace("_", " ")} and can no longer receive receipts.`,
      );
    }

    const existing = await this.receiptsRepository.findByPayment(payment.id);
    if (existing) {
      throw new ConflictError("A receipt was already uploaded for this payment.");
    }

    // Content-based validation (size, declared type AND magic bytes).
    const validated = validateReceiptUpload(file.mimeType, file.originalName, file.buffer);
    const storagePath = `receipts/${customer.id}/${payment.id}/${randomUUID()}.${validated.extension}`;

    await this.receiptStorage.upload(storagePath, file.buffer, validated.mimeType);

    const timestamp = nowIso();
    const inserted = await this.receiptsRepository.insert({
      payment_id: payment.id,
      storage_path: storagePath,
      original_filename: sanitizeFilename(file.originalName),
      mime_type: validated.mimeType,
      uploaded_at: timestamp,
    });

    logger.info("Customer uploaded a payment receipt", {
      receiptId: inserted.id,
      paymentId: payment.id,
      customerId: customer.id,
    });
    return {
      id: inserted.id,
      paymentId: inserted.payment_id,
      originalFilename: inserted.original_filename,
      mimeType: inserted.mime_type,
      uploadedAt: inserted.uploaded_at,
    };
  }

  private async requireCustomer(userId: string) {
    const customer = await this.customersRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError("Customer profile not found.");
    return customer;
  }

  private static toView(row: PaymentRow): PaymentView {
    return {
      id: row.id,
      paymentReference: row.payment_reference,
      subscriptionId: row.subscription_id,
      planId: row.plan_id,
      amount: row.amount,
      currency: row.currency,
      paymentMethod: row.payment_method,
      status: row.status,
      customerTransactionRef: row.customer_transaction_ref ?? "",
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/** Strips any path components; keeps a short, display-only filename. */
function sanitizeFilename(filename: string | undefined): string | null {
  if (filename === undefined || filename.trim() === "") return null;
  const base = filename.split(/[\\/]/).pop()?.trim() ?? "";
  return base.slice(0, 200) === "" ? null : base.slice(0, 200);
}
