import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…", hint }: { label?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md">
        {message ?? "Something went wrong while contacting the service."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "No data available",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="size-12 rounded-full bg-surface-high text-muted-foreground flex items-center justify-center">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {message && <p className="text-sm text-muted-foreground max-w-md">{message}</p>}
    </div>
  );
}
