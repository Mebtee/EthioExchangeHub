import { Link, useNavigate } from "react-router-dom";
import { Bell, ExternalLink, LogOut, Menu, User, Settings as SettingsIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AdminBreadcrumbs } from "./admin-breadcrumbs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/hooks";

function userInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { localize } = useLocale();
  const initials = user ? userInitials(user.name) : "EE";

  async function handleLogout() {
    await logout();
    navigate(localize("/admin/login"), { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label={t("admin.header.openNav")}
        >
          <Menu className="size-5" />
        </Button>

        <div className="hidden md:block">
          <AdminBreadcrumbs />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={localize("/")}
            className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground sm:inline-flex"
          >
            <ExternalLink className="size-4" />
            {t("admin.header.viewSite")}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t("admin.header.notifications")}
          >
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-80">
                <Avatar className="size-9">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="truncate text-sm font-semibold">
                  {user?.name ?? t("admin.header.admin")}
                </p>
                <p className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email ?? "admin@ethioexchange.dev"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={localize("/admin/profile")}>
                  <User className="size-4" />
                  {t("admin.header.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={localize("/admin/settings")}>
                  <SettingsIcon className="size-4" />
                  {t("admin.header.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void handleLogout()}>
                <LogOut className="size-4" />
                {t("admin.header.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
