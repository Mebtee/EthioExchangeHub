import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function SiteShell({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {!hideFooter && <SiteFooter />}
    </div>
  );
}

export function PageContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-[1280px] px-4 md:px-12 py-10 ${className}`}>{children}</div>
  );
}
