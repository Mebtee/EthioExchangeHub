import { useMemo, useState } from "react";
import { Pencil, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useBanks,
  useCreateManualRate,
  useCurrencies,
  useDeleteManualRate,
  useManualRates,
  useUpdateManualRate,
} from "@/hooks";
import { formatRateOrDash } from "@/lib/format";
import type { ManualRate, ManualRatePayload } from "@/types/admin";

interface RateFormState {
  bankCode: string;
  currency: string;
  cashBuying: string;
  cashSelling: string;
  transactionBuying: string;
  transactionSelling: string;
  rateDate: string;
  note: string;
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const EMPTY_FORM: RateFormState = {
  bankCode: "",
  currency: "",
  cashBuying: "",
  cashSelling: "",
  transactionBuying: "",
  transactionSelling: "",
  rateDate: todayIsoDate(),
  note: "",
};

export default function AdminManualRatesPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useManualRates();
  const { data: banks = [], isLoading: banksLoading } = useBanks();
  const { data: currencies = [] } = useCurrencies();
  const createRate = useCreateManualRate();
  const updateRate = useUpdateManualRate();
  const deleteRate = useDeleteManualRate();

  // Stable reference so filter memos below don't recompute each render.
  const rates = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("ALL");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManualRate | null>(null);
  const [form, setForm] = useState<RateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ManualRate | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rates.filter((r) => {
      const matchesQuery = q ? r.bankName.toLowerCase().includes(q) : true;
      const matchesCurrency = currency === "ALL" ? true : r.currency === currency;
      return matchesQuery && matchesCurrency;
    });
  }, [rates, query, currency]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, rateDate: todayIsoDate() });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(rate: ManualRate) {
    setEditing(rate);
    setForm({
      bankCode: rate.bankCode,
      currency: rate.currency,
      cashBuying: Number.isFinite(rate.cashBuying) ? String(rate.cashBuying) : "",
      cashSelling: Number.isFinite(rate.cashSelling) ? String(rate.cashSelling) : "",
      transactionBuying: Number.isFinite(rate.transactionBuying)
        ? String(rate.transactionBuying)
        : "",
      transactionSelling: Number.isFinite(rate.transactionSelling)
        ? String(rate.transactionSelling)
        : "",
      rateDate: rate.rateDate,
      note: rate.note ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function parseForm(): ManualRatePayload | null {
    const cashBuying = Number(form.cashBuying);
    const cashSelling = Number(form.cashSelling);
    const transactionBuying =
      form.transactionBuying.trim() === "" ? null : Number(form.transactionBuying);
    const transactionSelling =
      form.transactionSelling.trim() === "" ? null : Number(form.transactionSelling);
    if (!form.bankCode || !form.currency) {
      setFormError(t("admin.manualRates.errorSelect"));
      return null;
    }
    if (
      !Number.isFinite(cashBuying) ||
      cashBuying <= 0 ||
      !Number.isFinite(cashSelling) ||
      cashSelling <= 0
    ) {
      setFormError(t("admin.manualRates.errorCash"));
      return null;
    }
    if (
      (transactionBuying !== null &&
        (!Number.isFinite(transactionBuying) || transactionBuying <= 0)) ||
      (transactionSelling !== null &&
        (!Number.isFinite(transactionSelling) || transactionSelling <= 0))
    ) {
      setFormError(t("admin.manualRates.errorTrans"));
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.rateDate)) {
      setFormError(t("admin.manualRates.errorDate"));
      return null;
    }
    return {
      bank_code: form.bankCode,
      currency_code: form.currency,
      buying_rate: cashBuying,
      selling_rate: cashSelling,
      transactional_buying: transactionBuying,
      transactional_selling: transactionSelling,
      rate_date: form.rateDate,
      note: form.note.trim() === "" ? null : form.note.trim(),
    };
  }

  async function handleSave() {
    const payload = parseForm();
    if (!payload) return;
    setFormError(null);
    try {
      if (editing) {
        await updateRate.mutateAsync({ id: editing.id, payload });
        toast.success(t("admin.manualRates.toastUpdated"));
      } else {
        await createRate.mutateAsync(payload);
        toast.success(t("admin.manualRates.toastAdded"));
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.manualRates.toastSaveError"));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteRate.mutateAsync(deleting.id);
      toast.success(t("admin.manualRates.toastDeleted"));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.manualRates.toastDeleteError"));
    }
  }

  const busy = createRate.isPending || updateRate.isPending || deleteRate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.manualRates.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("admin.manualRates.subtitle")}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          {t("admin.manualRates.addRate")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          type="text"
          value={query}
          onChange={setQuery}
          placeholder={t("admin.manualRates.searchPlaceholder")}
          wrapperClassName="w-64"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">{t("admin.manualRates.allCurrencies")}</option>
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      <SurfaceCard className="overflow-hidden">
        <DataTable
          rows={filtered}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
          emptyTitle={t("admin.manualRates.noMatchTitle")}
          emptyMessage={t("admin.manualRates.noMatchMessage")}
          footer={t("admin.manualRates.showing", {
            count: filtered.length,
            total: rates.length,
          })}
          columns={[
            {
              key: "bank",
              header: t("admin.manualRates.bank"),
              cell: (r) => (
                <span className="font-medium">
                  {r.bankName}
                  {r.note && <span className="ml-2 text-xs text-muted-foreground">{r.note}</span>}
                </span>
              ),
            },
            {
              key: "currency",
              header: t("admin.manualRates.currency"),
              cell: (r) => <span className="font-semibold">{r.currency}</span>,
            },
            {
              key: "cashBuying",
              header: t("admin.manualRates.cashBuy"),
              cell: (r) => <span className="tabular">{formatRateOrDash(r.cashBuying)}</span>,
            },
            {
              key: "cashSelling",
              header: t("admin.manualRates.cashSell"),
              cell: (r) => <span className="tabular">{formatRateOrDash(r.cashSelling)}</span>,
            },
            {
              key: "transactionBuying",
              header: t("admin.manualRates.transBuy"),
              cell: (r) => <span className="tabular">{formatRateOrDash(r.transactionBuying)}</span>,
            },
            {
              key: "transactionSelling",
              header: t("admin.manualRates.transSell"),
              cell: (r) => (
                <span className="tabular">{formatRateOrDash(r.transactionSelling)}</span>
              ),
            },
            {
              key: "rateDate",
              header: t("admin.manualRates.rateDate"),
              cell: (r) => <span className="whitespace-nowrap tabular">{r.rateDate}</span>,
            },
            {
              key: "actions",
              header: "",
              headerClassName: "text-right",
              className: "text-right",
              cell: (r) => (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t("admin.manualRates.editAria", { bank: r.bankName })}
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={t("admin.manualRates.deleteAria", { bank: r.bankName })}
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </SurfaceCard>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("admin.manualRates.editTitle") : t("admin.manualRates.addTitle")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? t("admin.manualRates.editDescription", {
                    bank: editing.bankName,
                    currency: editing.currency,
                  })
                : t("admin.manualRates.addDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2 pr-1">
            <div className="grid gap-2">
              <Label htmlFor="bank">{t("admin.manualRates.formBank")}</Label>
              <select
                id="bank"
                value={form.bankCode}
                onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("admin.manualRates.selectBank")}</option>
                {banksLoading ? (
                  <option value="" disabled>
                    {t("admin.manualRates.loadingBanks")}
                  </option>
                ) : banks.length === 0 ? (
                  <option value="" disabled>
                    {t("admin.manualRates.noBanks")}
                  </option>
                ) : (
                  banks.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">{t("admin.manualRates.formCurrency")}</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("admin.manualRates.selectCurrency")}</option>
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rateDate">{t("admin.manualRates.rateDate")}</Label>
              <Input
                id="rateDate"
                type="date"
                value={form.rateDate}
                onChange={(e) => setForm((f) => ({ ...f, rateDate: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold text-foreground">
                {t("admin.manualRates.cashRates")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cashBuying">{t("admin.manualRates.formCashBuy")}</Label>
                  <Input
                    id="cashBuying"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0000"
                    value={form.cashBuying}
                    onChange={(e) => setForm((f) => ({ ...f, cashBuying: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cashSelling">{t("admin.manualRates.formCashSell")}</Label>
                  <Input
                    id="cashSelling"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0000"
                    value={form.cashSelling}
                    onChange={(e) => setForm((f) => ({ ...f, cashSelling: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold text-foreground">
                {t("admin.manualRates.transactionalRates")}
              </p>
              <p className="text-xs text-muted-foreground">{t("admin.manualRates.transHint")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="transactionBuying">{t("admin.manualRates.formTransBuy")}</Label>
                  <Input
                    id="transactionBuying"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0000"
                    value={form.transactionBuying}
                    onChange={(e) => setForm((f) => ({ ...f, transactionBuying: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transactionSelling">{t("admin.manualRates.formTransSell")}</Label>
                  <Input
                    id="transactionSelling"
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0000"
                    value={form.transactionSelling}
                    onChange={(e) => setForm((f) => ({ ...f, transactionSelling: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">{t("admin.manualRates.noteLabel")}</Label>
              <Textarea
                id="note"
                rows={2}
                placeholder={t("admin.manualRates.notePlaceholder")}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            {formError && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <TriangleAlert className="size-4" />
                {formError}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("admin.manualRates.cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {editing ? t("admin.manualRates.saveChanges") : t("admin.manualRates.addRate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.manualRates.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? t("admin.manualRates.deleteDescription", {
                    bank: deleting.bankName,
                    currency: deleting.currency,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.manualRates.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={busy}>
              {t("admin.manualRates.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
