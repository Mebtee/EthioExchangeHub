import type { ReactNode } from "react";

import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

/** Monospace preformatted block with optional copy action — developer pages. */
export function CodeBlock({
  code,
  copyValue,
  children,
  className,
}: {
  /** Literal text rendered inside <pre>. */
  code?: string;
  /** Defaults to `code`; pass a custom string when the display differs. */
  copyValue?: string;
  children?: ReactNode;
  className?: string;
}) {
  const copy = copyValue ?? code;
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-surface-low", className)}>
      {copy && (
        <div className="absolute right-2 top-2">
          <CopyButton value={copy} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 pr-14 text-xs leading-relaxed">
        <code>{children ?? code}</code>
      </pre>
    </div>
  );
}
