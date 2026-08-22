import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copy-to-clipboard button with transient success feedback. Used for API
 * keys, code samples, and base URLs across the developer portal.
 */
export function CopyButton({
  value,
  label,
  className,
}: {
  /** Text placed on the clipboard. Never rendered into the DOM. */
  value: string;
  /** Accessible label (screen readers); defaults to the generic copy label. */
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied / unavailable — keep the button inert
      // rather than surfacing an error for a convenience action.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      onClick={() => void handleCopy()}
      aria-label={label ?? t("customer.common.copy")}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span aria-live="polite">
        {copied ? t("customer.common.copied") : (label ?? t("customer.common.copy"))}
      </span>
    </Button>
  );
}
