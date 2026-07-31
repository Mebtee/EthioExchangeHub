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

import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/manual-rates", label: "Manual Exchange Rates", icon: PencilLine },
  { to: "/admin/scraper-health", label: "Scraper Health", icon: Activity },
  { to: "/admin/scrape-logs", label: "Scrape Logs", icon: ScrollText },
  { to: "/admin/profile", label: "Profile", icon: User },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border/60 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
          E
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">Ethio Exchange</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Admin Console
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 p-3">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          View public site
        </Link>
      </div>
    </div>
  );
}
