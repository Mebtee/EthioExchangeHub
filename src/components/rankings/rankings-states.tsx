import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function RankingsLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm font-semibold">Loading live exchange rates…</p>
      <p className="text-sm text-muted-foreground">
        Fetching the latest bank rates from the market service.
      </p>
    </div>
  );
}

export function RankingsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold">Unable to load exchange rates</p>
      <p className="text-sm text-muted-foreground max-w-md">
        {message ?? "Something went wrong while contacting the rates service."}
      </p>
      <button
        onClick={onRetry}
        className="mt-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

export function RankingsEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="size-12 rounded-full bg-surface-high text-muted-foreground flex items-center justify-center">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-semibold">No exchange rates available</p>
      <p className="text-sm text-muted-foreground max-w-md">
        {hasFilters
          ? "No banks match your current search or currency selection."
          : "No bank has published rate data yet. Rates will appear here as soon as they are collected."}
      </p>
    </div>
  );
}
