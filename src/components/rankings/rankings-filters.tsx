import { RATE_FIELDS } from "@/lib/rankings";
import { SearchInput } from "@/components/shared/search-input";
import type { RateField } from "@/types/exchange-rate";

interface RankingsFiltersProps {
  field: RateField;
  onFieldChange: (field: RateField) => void;
  query: string;
  onQueryChange: (value: string) => void;
  currency: string;
  currencies: string[];
  onCurrencyChange: (value: string) => void;
}

export function RankingsFilters({
  field,
  onFieldChange,
  query,
  onQueryChange,
  currency,
  currencies,
  onCurrencyChange,
}: RankingsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <label className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Rank By
        </span>
        <select
          value={field}
          onChange={(e) => onFieldChange(e.target.value as RateField)}
          className="rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {RATE_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          type="text"
          value={query}
          onChange={onQueryChange}
          placeholder="Search bank name..."
          wrapperClassName="w-64"
        />
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          disabled={currencies.length === 0}
          className="rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        >
          {currencies.length === 0 ? (
            <option value="">No currencies</option>
          ) : (
            currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
