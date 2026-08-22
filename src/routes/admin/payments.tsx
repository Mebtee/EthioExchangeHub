import { useState } from "react";
import { Landmark, Plus, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable } from "@/components/admin/data-table";
import { SurfaceCard } from "@/components/shared/surface-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { fetchAdminReceiptUrl, type AdminPaymentStatusFilter } from "@/lib/api/admin";
import { formatAmount, formatRelativeTime } from "@/lib/format";
import { paymentStatusTone } from "@/lib/status";
import {
  useAdminBankAccounts,
  useAdminPayments,
  useCreateAdminBankAccount,
  useReviewAdminPayment,
  useUpdateAdminBankAccount,
} from "@/hooks/use-admin";
import type { AdminPaymentView } from "@/types/admin";

const STATUS_FILTERS: Array<"ALL" | AdminPaymentStatusFilter> = [
  "ALL",
  "pending",
  "under_review",
  "approved",
  "rejected",
];

/** Literal i18n keys keep the strict t() key typing happy. */
const STATUS_KEYS = {
  pending: "admin.payments.filters.pending",
  under_review: "admin.payments.filters.underReview",
  approved: "admin.payments.filters.approved",
  rejected: "admin.payments.filters.rejected",
  cancelled: "admin.payments.filters.cancelled",
} as const;

function statusLabelKey(status: string): (typeof STATUS_KEYS)[keyof typeof STATUS_KEYS] {
  return STATUS_KEYS[status as keyof typeof STATUS_KEYS];
}

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<"ALL" | AdminPaymentStatusFilter>("ALL");
  const { data, isLoading, isError, error, refetch } = useAdminPayments(
    statusFilter === "ALL" ? undefined : statusFilter,
  );
  const review = useReviewAdminPayment();

  const [approveTarget, setApproveTarget] = useState<AdminPaymentView | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminPaymentView | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  function openReceipt(payment: AdminPaymentView) {
    fetchAdminReceiptUrl(payment.id)
      .then(({ url }) => {
        window.open(url, "_blank", "noopener,noreferrer");
      })
      .catch(() => {
        toast.error(t("admin.payments.receiptError"));
      });
  }

  function markUnderReview(payment: AdminPaymentView) {
    review.mutate(
      { paymentId: payment.id, action: "under_review" },
      {
        onSuccess: () => toast.success(t("admin.payments.toasts.underReview")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("admin.payments.toasts.actionError")),
      },
    );
  }

  function confirmApprove() {
    if (!approveTarget) return;
    review.mutate(
      { paymentId: approveTarget.id, action: "approve" },
      {
        onSuccess: () => toast.success(t("admin.payments.toasts.approved")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("admin.payments.toasts.actionError")),
      },
    );
    setApproveTarget(null);
  }

  function confirmReject() {
    const reason = rejectionReason.trim();
    if (!rejectTarget || !reason) return;
    review.mutate(
      { paymentId: rejectTarget.id, action: "reject", rejectionReason: reason },
      {
        onSuccess: () => toast.success(t("admin.payments.toasts.rejected")),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("admin.payments.toasts.actionError")),
      },
    );
    setRejectTarget(null);
    setRejectionReason("");
  }

  const payments = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.payments.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("admin.payments.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl bg-surface-low p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL" ? t("admin.payments.filters.all") : t(statusLabelKey(s))}
            </button>
          ))}
        </div>
      </div>

      <SurfaceCard className="overflow-hidden">
        <DataTable
          rows={payments}
          rowKey={(payment) => payment.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
          emptyTitle={t("admin.payments.emptyTitle")}
          emptyMessage={t("admin.payments.emptyMessage")}
          footer={t("admin.payments.showing", { count: payments.length })}
          columns={[
            {
              key: "reference",
              header: t("admin.payments.reference"),
              cell: (payment) => <span className="font-medium">{payment.paymentReference}</span>,
            },
            {
              key: "amount",
              header: t("admin.payments.amount"),
              cell: (payment) => (
                <span className="whitespace-nowrap tabular">
                  {formatAmount(payment.amount)} {payment.currency}
                </span>
              ),
            },
            {
              key: "txnRef",
              header: t("admin.payments.txnRef"),
              cell: (payment) => (
                <span
                  className="block max-w-[180px] truncate text-muted-foreground"
                  title={payment.customerTransactionRef ?? ""}
                >
                  {payment.customerTransactionRef ?? t("admin.payments.noTxnRef")}
                </span>
              ),
            },
            {
              key: "submittedAt",
              header: t("admin.payments.submitted"),
              cell: (payment) => (
                <span className="whitespace-nowrap tabular text-muted-foreground">
                  {payment.submittedAt ? formatRelativeTime(payment.submittedAt) : "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: t("admin.payments.status"),
              cell: (payment) => (
                <StatusBadge tone={paymentStatusTone(payment.status)}>
                  {t(statusLabelKey(payment.status))}
                </StatusBadge>
              ),
            },
            {
              key: "actions",
              header: t("admin.payments.actions"),
              cell: (payment) => <RowActions payment={payment} />,
            },
          ]}
        />
      </SurfaceCard>

      <BankAccountsSection />

      {/* Approve confirmation — approving is a terminal transition. */}
      <AlertDialog
        open={approveTarget !== null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.payments.approveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.payments.approveDescription", {
                reference: approveTarget?.paymentReference ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>
              {t("admin.payments.actionsApprove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection requires a customer-visible reason. */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.payments.rejectTitle", { reference: rejectTarget?.paymentReference ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("admin.payments.rejectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">{t("admin.payments.rejectReasonLabel")}</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder={t("admin.payments.rejectReasonPlaceholder")}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={confirmReject}
            >
              {t("admin.payments.actionsReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function RowActions({ payment }: { payment: AdminPaymentView }) {
    const busy = review.isPending && review.variables?.paymentId === payment.id;
    const canReview = payment.status === "pending" || payment.status === "under_review";

    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => openReceipt(payment)}>
          <ReceiptText className="size-4" />
          {t("admin.payments.receipt")}
        </Button>
        {canReview && (
          <>
            {payment.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => markUnderReview(payment)}
              >
                {t("admin.payments.actionsUnderReview")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setApproveTarget(payment)}
            >
              {t("admin.payments.actionsApprove")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => {
                setRejectionReason("");
                setRejectTarget(payment);
              }}
            >
              {t("admin.payments.actionsReject")}
            </Button>
          </>
        )}
      </div>
    );
  }
}

/** Bank transfer destinations shown to customers during payment submission. */
function BankAccountsSection() {
  const { t } = useTranslation();
  const { data } = useAdminBankAccounts();
  const create = useCreateAdminBankAccount();
  const update = useUpdateAdminBankAccount();

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchName, setBranchName] = useState("");
  const [instructions, setInstructions] = useState("");

  const accounts = data ?? [];
  const canSubmit =
    bankName.trim().length > 0 && accountName.trim().length > 0 && accountNumber.trim().length >= 4;

  function handleCreate() {
    create.mutate(
      {
        bank_name: bankName.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        ...(branchName.trim() ? { branch_name: branchName.trim() } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      },
      {
        onSuccess: () => {
          setBankName("");
          setAccountName("");
          setAccountNumber("");
          setBranchName("");
          setInstructions("");
          toast.success(t("admin.payments.bank.createdToast"));
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : t("admin.payments.bank.createError")),
      },
    );
  }

  function toggleActive(id: string, isActive: boolean) {
    update.mutate(
      { id, payload: { is_active: isActive } },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("admin.payments.bank.updateError"));
        },
      },
    );
  }

  return (
    <SurfaceCard className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Landmark className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t("admin.payments.bank.title")}</h2>
      </div>

      {accounts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.payments.bank.bankName")}</TableHead>
              <TableHead>{t("admin.payments.bank.accountName")}</TableHead>
              <TableHead>{t("admin.payments.bank.accountNumber")}</TableHead>
              <TableHead>{t("admin.payments.bank.branchName")}</TableHead>
              <TableHead className="text-right">{t("admin.payments.bank.active")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.bankName}</TableCell>
                <TableCell>{account.accountName}</TableCell>
                <TableCell className="tabular">{account.accountNumber}</TableCell>
                <TableCell className="text-muted-foreground">{account.branchName ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={(checked) => toggleActive(account.id, checked)}
                    aria-label={t("admin.payments.bank.active")}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="rounded-xl bg-surface-low px-4 py-6 text-center text-sm text-muted-foreground">
          {t("admin.payments.bank.empty")}
        </p>
      )}

      <div className="mt-6 space-y-3 rounded-xl border border-border/60 p-4">
        <p className="text-sm font-semibold">{t("admin.payments.bank.addTitle")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bank-name">{t("admin.payments.bank.bankName")}</Label>
            <Input
              id="bank-name"
              value={bankName}
              maxLength={120}
              onChange={(event) => setBankName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-name">{t("admin.payments.bank.accountName")}</Label>
            <Input
              id="account-name"
              value={accountName}
              maxLength={160}
              onChange={(event) => setAccountName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-number">{t("admin.payments.bank.accountNumber")}</Label>
            <Input
              id="account-number"
              value={accountNumber}
              maxLength={40}
              onChange={(event) => setAccountNumber(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">{t("admin.payments.bank.branchName")}</Label>
            <Input
              id="branch-name"
              value={branchName}
              maxLength={120}
              onChange={(event) => setBranchName(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instructions">{t("admin.payments.bank.instructions")}</Label>
          <Textarea
            id="instructions"
            value={instructions}
            maxLength={1000}
            rows={2}
            placeholder={t("admin.payments.bank.instructionsPlaceholder")}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!canSubmit || create.isPending}>
            <Plus className="size-4" />
            {create.isPending ? t("admin.payments.bank.creating") : t("admin.payments.bank.add")}
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}
