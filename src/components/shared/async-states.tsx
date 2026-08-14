import { useTranslation } from "react-i18next";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label, hint }: { label?: string; hint?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm font-semibold">{label ?? t("common.loading")}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold">{title ?? t("common.unableToLoad")}</p>
      <p className="text-sm text-muted-foreground max-w-md">
        {message ?? t("common.errorContacting")}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("common.tryAgain")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message }: { title?: string; message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="size-12 rounded-full bg-surface-high text-muted-foreground flex items-center justify-center">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-semibold">{title ?? t("common.noData")}</p>
      {message && <p className="text-sm text-muted-foreground max-w-md">{message}</p>}
    </div>
  );
}
