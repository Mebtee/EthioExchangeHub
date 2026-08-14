import { Link, NavLink } from "react-router-dom";
import {
  Activity,
  ExternalLink,
  LayoutDashboard,
  PencilLine,
  ScrollText,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLocale } from "@/hooks";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  to: string;
  labelKey:
    | "admin.nav.dashboard"
    | "admin.nav.manualRates"
    | "admin.nav.scraperHealth"
    | "admin.nav.scrapeLogs"
    | "admin.nav.profile"
    | "admin.nav.settings";
  icon: LucideIcon;
  end?: boolean;
}> = [
  { to: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/manual-rates", labelKey: "admin.nav.manualRates", icon: PencilLine },
  { to: "/admin/scraper-health", labelKey: "admin.nav.scraperHealth", icon: Activity },
  { to: "/admin/scrape-logs", labelKey: "admin.nav.scrapeLogs", icon: ScrollText },
  { to: "/admin/profile", labelKey: "admin.nav.profile", icon: User },
  { to: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { localize } = useLocale();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border/60 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          E
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Ethio Exchange</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("admin.console")}
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
                  ? "bg-primary/10 text-primary font-semibold"
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
      </div>
    </div>
  );
}
