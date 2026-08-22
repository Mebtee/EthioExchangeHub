import { Link, NavLink } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Layers,
  ReceiptText,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLocale } from "@/hooks";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

/** Sidebar entries for the customer developer portal (Phase 6). */
const NAV_ITEMS: Array<{
  to: string;
  labelKey:
    | "customer.nav.dashboard"
    | "customer.nav.apiKeys"
    | "customer.nav.plans"
    | "customer.nav.subscription"
    | "customer.nav.payments"
    | "customer.nav.usage"
    | "customer.nav.developer";
  icon: LucideIcon;
  end?: boolean;
}> = [
  { to: "/customer", labelKey: "customer.nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/customer/api-keys", labelKey: "customer.nav.apiKeys", icon: KeyRound },
  { to: "/customer/plans", labelKey: "customer.nav.plans", icon: Layers },
  { to: "/customer/subscription", labelKey: "customer.nav.subscription", icon: ReceiptText },
  { to: "/customer/payments", labelKey: "customer.nav.payments", icon: CreditCard },
  { to: "/customer/usage", labelKey: "customer.nav.usage", icon: BarChart3 },
  { to: "/customer/developer", labelKey: "customer.nav.developer", icon: BookOpen },
];

export function CustomerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { localize } = useLocale();
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border/60 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          E
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Ethio Exchange</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("customer.portalName")}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={localize(item.to)}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 p-3">
        <Link
          to={localize("/")}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          {t("admin.viewPublicSite")}
        </Link>
        {user && <p className="mt-2 truncate px-3 text-xs text-muted-foreground">{user.email}</p>}
      </div>
    </div>
  );
}
