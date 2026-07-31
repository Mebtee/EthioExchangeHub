import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-low px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
              E
            </div>
            <div className="text-left">
              <p className="text-lg font-bold tracking-tight">Ethio Exchange</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Admin Console
              </p>
            </div>
          </Link>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
