import { useMemo, useState } from "react";
import { Pencil, Plus, TriangleAlert, Trash2 } from "lucide-react";

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
import { toast } from "sonner";

interface RateFormState {
  bankCode: string;
  currency: string;
  buying: string;
  selling: string;
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
  buying: "",
  selling: "",
  rateDate: todayIsoDate(),
  note: "",
};

export default function AdminManualRatesPage() {
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
      buying: Number.isFinite(rate.buyingRate) ? String(rate.buyingRate) : "",
      selling: Number.isFinite(rate.sellingRate) ? String(rate.sellingRate) : "",
      rateDate: rate.rateDate,
      note: rate.note ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function parseForm(): ManualRatePayload | null {
    const buying = Number(form.buying);
    const selling = Number(form.selling);
    if (!form.bankCode || !form.currency) {
      setFormError("Select a bank and a currency.");
      return null;
    }
    if (!Number.isFinite(buying) || buying <= 0 || !Number.isFinite(selling) || selling <= 0) {
      setFormError("Buying and selling rates must be positive numbers.");
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.rateDate)) {
      setFormError("Rate date must be an ISO date (YYYY-MM-DD).");
      return null;
    }
    return {
      bank_code: form.bankCode,
      currency_code: form.currency,
      buying_rate: buying,
      selling_rate: selling,
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
        toast.success("Rate updated");
      } else {
        await createRate.mutateAsync(payload);
        toast.success("Rate added");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the rate.");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteRate.mutateAsync(deleting.id);
      toast.success("Rate deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete the rate.");
    }
  }

  const busy = createRate.isPending || updateRate.isPending || deleteRate.isPending;

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
                  {r.note && <span className="ml-2 text-xs text-muted-foreground">{r.note}</span>}
                </span>
              ),
            },
            {
              key: "currency",
              header: "Currency",
              cell: (r) => <span className="font-semibold">{r.currency}</span>,
            },
            {
              key: "buying",
              header: "Buy",
              cell: (r) => <span className="tabular">{formatRateOrDash(r.buyingRate)}</span>,
            },
            {
              key: "selling",
              header: "Sell",
              cell: (r) => <span className="tabular">{formatRateOrDash(r.sellingRate)}</span>,
            },
            {
              key: "rateDate",
              header: "Rate date",
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
                value={form.bankCode}
                onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a bank…</option>
                {banksLoading ? (
                  <option value="" disabled>
                    Loading banks…
                  </option>
                ) : banks.length === 0 ? (
                  <option value="" disabled>
                    No banks available
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
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a currency…</option>
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="buying">Buying rate</Label>
                <Input
                  id="buying"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.0000"
                  value={form.buying}
                  onChange={(e) => setForm((f) => ({ ...f, buying: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="selling">Selling rate</Label>
                <Input
                  id="selling"
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.0000"
                  value={form.selling}
                  onChange={(e) => setForm((f) => ({ ...f, selling: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rateDate">Rate date</Label>
              <Input
                id="rateDate"
                type="date"
                value={form.rateDate}
                onChange={(e) => setForm((f) => ({ ...f, rateDate: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                rows={2}
                placeholder="Optional context for this rate"
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {editing ? "Save changes" : "Add rate"}
            </Button>
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
            <AlertDialogAction onClick={() => void handleDelete()} disabled={busy}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
