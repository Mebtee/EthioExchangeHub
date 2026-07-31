import type { ReactNode } from "react";

export function Pill({
  icon,
  children,
  className = "",
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-card border border-border/60 px-3 py-1.5 text-sm font-medium ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
