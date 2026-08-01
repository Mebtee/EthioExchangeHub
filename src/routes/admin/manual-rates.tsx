import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, TriangleAlert, Trash2 } from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
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
import { useManualRates } from "@/hooks/use-admin";
import { BANK_OPTIONS, CURRENCY_OPTIONS } from "@/mocks/admin";
import type { ManualRate } from "@/types/admin";
import { formatRate, formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

interface RateFormState {
  bankName: string;
  currency: string;
  cashBuying: string;
  cashSelling: string;
  transactionBuying: string;
  transactionSelling: string;
}

const EMPTY_FORM: RateFormState = {
  bankName: "",
  currency: "USD",
  cashBuying: "",
  cashSelling: "",
  transactionBuying: "",
  transactionSelling: "",
};

function parseRateForm(form: RateFormState): ManualRate | null {
  if (!form.bankName) return null;
  const cashBuying = Number(form.cashBuying);
  const cashSelling = Number(form.cashSelling);
  const transactionBuying = Number(form.transactionBuying);
  const transactionSelling = Number(form.transactionSelling);
  if (![cashBuying, cashSelling, transactionBuying, transactionSelling].every((n) => n > 0)) {
    return null;
  }
  return {
    id: Date.now(),
    bankName: form.bankName,
    currency: form.currency,
    cashBuying,
    cashSelling,
    transactionBuying,
    transactionSelling,
    lastUpdated: new Date().toISOString(),
    source: "manual",
  };
}

export default function AdminManualRatesPage() {
  const { data, isLoading } = useManualRates();
  const [rates, setRates] = useState<ManualRate[]>([]);
  const hydrated = useRef(false);

  // Hydrate the working copy from the data source (mock data today, the real
  // API once VITE_USE_MOCKS=false). Only seeds once so local add/edit/delete
  // edits are never clobbered by a later refetch.
  useEffect(() => {
    if (data && !hydrated.current) {
      hydrated.current = true;
      setRates(data);
    }
  }, [data]);
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
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(rate: ManualRate) {
    setEditing(rate);
    setForm({
      bankName: rate.bankName,
      currency: rate.currency,
      cashBuying: String(rate.cashBuying),
      cashSelling: String(rate.cashSelling),
      transactionBuying: String(rate.transactionBuying),
      transactionSelling: String(rate.transactionSelling),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function handleSave() {
    const parsed = parseRateForm(form);
    if (!parsed) {
      setFormError("Fill in the bank and all four positive rate values.");
      return;
    }
    if (editing) {
      setRates((prev) =>
        prev.map((r) => (r.id === editing.id ? { ...parsed, id: editing.id } : r)),
      );
      toast.success("Rate updated");
    } else {
      setRates((prev) => [parsed, ...prev]);
      toast.success("Rate added");
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!deleting) return;
    setRates((prev) => prev.filter((r) => r.id !== deleting.id));
    toast.success("Rate deleted");
    setDeleting(null);
  }

  const rateField = (value: number | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? formatRate(value) : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manual Exchange Rates</h1>
          <p className="mt-1 text-muted-foreground">
            Add, edit, or remove manually published bank rates.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add rate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          type="text"
          value={query}
          onChange={setQuery}
          placeholder="Search bank name..."
          wrapperClassName="w-64"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All currencies</option>
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <SurfaceCard className="overflow-hidden">
        <DataTable
          rows={filtered}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyTitle="No rates match your filters"
          emptyMessage="Try adjusting the search or currency filter, or add a new rate."
          footer={`Showing ${filtered.length} of ${rates.length} manual rates`}
          columns={[
            {
              key: "bank",
              header: "Bank",
              cell: (r) => (
                <span className="font-medium">
                  {r.bankName}
                  <span className="ml-2 text-xs text-muted-foreground">{r.source}</span>
                </span>
              ),
            },
            {
              key: "currency",
              header: "Currency",
              cell: (r) => <span className="font-semibold">{r.currency}</span>,
            },
            {
              key: "cashBuying",
              header: "Cash Buy",
              cell: (r) => <span className="tabular">{rateField(r.cashBuying)}</span>,
            },
            {
              key: "cashSelling",
              header: "Cash Sell",
              cell: (r) => <span className="tabular">{rateField(r.cashSelling)}</span>,
            },
            {
              key: "transactionBuying",
              header: "Trans. Buy",
              cell: (r) => <span className="tabular">{rateField(r.transactionBuying)}</span>,
            },
            {
              key: "transactionSelling",
              header: "Trans. Sell",
              cell: (r) => <span className="tabular">{rateField(r.transactionSelling)}</span>,
            },
            {
              key: "updated",
              header: "Updated",
              cell: (r) => (
                <StatusBadge tone="neutral">{formatRelativeTime(r.lastUpdated)}</StatusBadge>
              ),
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
                    aria-label={`Edit ${r.bankName} rate`}
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`Delete ${r.bankName} rate`}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rate" : "Add rate"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update the published rates for ${editing.bankName} (${editing.currency}).`
                : "Publish a manually collected exchange rate."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="bank">Bank</Label>
              <select
                id="bank"
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a bank…</option>
                {BANK_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["cashBuying", "Cash buying"],
                  ["cashSelling", "Cash selling"],
                  ["transactionBuying", "Transaction buying"],
                  ["transactionSelling", "Transaction selling"],
                ] as const
              ).map(([key, labelText]) => (
                <div key={key} className="grid gap-2">
                  <Label htmlFor={key}>{labelText}</Label>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    step="0.0001"
                    placeholder="0.0000"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {formError && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <TriangleAlert className="size-4" />
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editing ? "Save changes" : "Add rate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rate?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `The ${deleting.currency} rate for ${deleting.bankName} will be permanently removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
