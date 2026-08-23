import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Landmark, ReceiptText, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCustomerPaymentMethods,
  useCustomerPayments,
  useCustomerPlans,
  useCustomerSubscription,
  useSubmitCustomerPayment,
  useUploadCustomerReceipt,
} from "@/hooks/use-customer";
import { formatDateTime, formatInt } from "@/lib/format";
import { paymentStatusTone } from "@/lib/status";

/**
 * Manual bank-transfer payments (Phase 6 over the Phase 3 backend).
 *
 * The customer controls exactly two things — which pending subscription is
 * being paid and their bank transaction reference — plus the receipt upload.
 * Amounts, status, and activation are always backend-controlled. Storage
 * paths never reach this UI; only short-lived admin-side signed URLs exist.
 */

/** Mirrors the backend's receipt validation (magic bytes + size). */
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf";

export default function CustomerPaymentsPage() {
  const { t } = useTranslation();
  const subscription = useCustomerSubscription();
  const methods = useCustomerPaymentMethods();
  const payments = useCustomerPayments();
  const plans = useCustomerPlans();
  const submitPayment = useSubmitCustomerPayment();
  const uploadReceipt = useUploadCustomerReceipt();

  /**
   * Only a PENDING subscription can be paid for (backend re-checks anyway).
   * An ACTIVE subscription can carry a `pendingUpgrade` — the unpaid plan
   * selection the backend keeps blocking other selections against.
   */
  const sub = subscription.data ?? null;
  const pendingSubscription = sub?.pendingUpgrade ?? (sub?.status === "pending" ? sub : null);

  /** Resolve the payable plan for display; catalog lookups stay read-only. */
  const pendingPlan = plans.data?.find((p) => p.id === pendingSubscription?.planId) ?? null;

  const [transactionRef, setTransactionRef] = useState("");
  const [receiptTargetId, setReceiptTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pendingSubscription || !transactionRef.trim()) return;
    try {
      await submitPayment.mutateAsync({
        subscriptionId: pendingSubscription.id,
        customerTransactionRef: transactionRef.trim(),
      });
      setTransactionRef("");
      toast.success(t("customer.payments.submittedToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unableToLoad"));
    }
  }

  function openFilePicker(paymentId: string) {
    setReceiptTargetId(paymentId);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !receiptTargetId) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      toast.error(t("customer.payments.receiptTooLarge"));
      return;
    }
    try {
      await uploadReceipt.mutateAsync({ paymentId: receiptTargetId, file });
      toast.success(t("customer.payments.receiptUploadedToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unableToLoad"));
    } finally {
      setReceiptTargetId(null);
    }
  }

  /** Receipt upload stays available until review starts (backend enforces). */
  const receiptEditable = (status: string) => status === "pending" || status === "under_review";

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("customer.payments.title")}
        description={t("customer.payments.subtitle")}
      />

      {/* STEP 1–2: amount + bank accounts */}
      <SurfaceCard className="p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <Landmark className="size-4 text-primary" />
          {t("customer.payments.transferTitle")}
        </h3>

        {pendingSubscription ? (
          <p className="mt-2 text-sm">
            {t("customer.payments.pendingPlanNote")}{" "}
            <span className="font-semibold">
              {pendingPlan
                ? `${pendingPlan.name} — ${formatInt(pendingPlan.price)} ${pendingPlan.currency}/${t("customer.plans.perMonth")}`
                : t("customer.subscription.planFallback")}
            </span>
          </p>
        ) : (
          <EmptyState
            title={t("customer.payments.noPendingTitle")}
            message={t("customer.payments.noPendingMessage")}
          />
        )}

        {methods.isError ? (
          <ErrorState
            message={methods.error instanceof Error ? methods.error.message : undefined}
            onRetry={() => void methods.refetch()}
          />
        ) : methods.isLoading ? (
          <LoadingState />
        ) : (methods.data ?? []).length === 0 ? (
          <EmptyState title={t("customer.payments.noBankAccounts")} />
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {(methods.data ?? []).map((method) => (
              <li key={method.id} className="rounded-xl border border-border/60 p-4">
                <p className="font-semibold">{method.bankName}</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">{t("customer.payments.accountName")}:</dt>
                    <dd className="font-medium">{method.accountName}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">
                      {t("customer.payments.accountNumber")}:
                    </dt>
                    <dd className="font-mono font-medium">{method.accountNumber}</dd>
                  </div>
                  {method.branchName && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">{t("customer.payments.branch")}:</dt>
                      <dd>{method.branchName}</dd>
                    </div>
                  )}
                </dl>
                {method.instructions && (
                  <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                    {method.instructions}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      {/* STEP 4: submit reference */}
      {pendingSubscription && (
        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.payments.submitTitle")}</h3>
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-4 flex flex-wrap gap-3"
            noValidate
          >
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="txn-ref">{t("customer.payments.refLabel")}</Label>
              <Input
                id="txn-ref"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder={t("customer.payments.refPlaceholder")}
                minLength={4}
                maxLength={100}
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={submitPayment.isPending || transactionRef.trim().length < 4}
              >
                {submitPayment.isPending
                  ? t("common.loading")
                  : t("customer.payments.submitAction")}
              </Button>
            </div>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t("customer.payments.submitNote")}</p>
        </SurfaceCard>
      )}

      {/* STEP 6: payment history + receipt upload */}
      <SurfaceCard>
        <div className="border-b border-border/60 px-6 py-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <ReceiptText className="size-4 text-primary" />
            {t("customer.payments.historyTitle")}
          </h3>
        </div>

        {payments.isError ? (
          <ErrorState
            message={payments.error instanceof Error ? payments.error.message : undefined}
            onRetry={() => void payments.refetch()}
          />
        ) : payments.isLoading ? (
          <LoadingState />
        ) : (payments.data ?? []).length === 0 ? (
          <EmptyState
            title={t("customer.dashboard.noPaymentsYet")}
            message={t("customer.payments.emptyMessage")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customer.payments.colReference")}</TableHead>
                <TableHead>{t("customer.payments.colAmount")}</TableHead>
                <TableHead>{t("customer.payments.colTxnRef")}</TableHead>
                <TableHead>{t("customer.payments.colSubmitted")}</TableHead>
                <TableHead>{t("customer.apiKeys.colStatus")}</TableHead>
                <TableHead className="text-right">{t("customer.apiKeys.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments.data ?? []).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.paymentReference}</TableCell>
                  <TableCell className="font-medium">
                    {formatInt(payment.amount)} {payment.currency}
                  </TableCell>
                  <TableCell className="text-sm">{payment.customerTransactionRef}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(payment.submittedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={paymentStatusTone(payment.status)}>
                      {t(`customer.payment.status.${payment.status}`, payment.status)}
                    </StatusBadge>
                    {payment.status === "rejected" && payment.rejectionReason && (
                      <p className="mt-1 max-w-56 text-xs text-destructive">
                        {payment.rejectionReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {receiptEditable(payment.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploadReceipt.isPending}
                        onClick={() => openFilePicker(payment.id)}
                      >
                        <Upload className="size-3.5" />
                        {t("customer.payments.uploadReceipt")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SurfaceCard>

      <p className="max-w-3xl rounded-xl bg-surface-low px-4 py-3 text-xs text-muted-foreground">
        {t("customer.payments.manualNote")}
      </p>

      {/* Hidden input drives the multipart upload; field name must be `receipt`. */}
      <input
        ref={fileInputRef}
        type="file"
        accept={RECEIPT_ACCEPT}
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
