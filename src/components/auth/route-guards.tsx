import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/hooks";

export function AdminLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          {t("auth.routeGuards.checkingSession")}
        </p>
      </div>
    </div>
  );
}

/** Redirects unauthenticated visitors to the admin login page. */
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { localize } = useLocale();

  if (isLoading) return <AdminLoading />;
  if (!isAuthenticated) {
    return <Navigate to={localize("/admin/login")} state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Restricts the subtree to users holding at least one allowed role. */
export function RequireRole({ roles, fallback }: { roles: string[]; fallback?: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { localize } = useLocale();
  const { t } = useTranslation();

  if (isLoading) return <AdminLoading />;
  if (!isAuthenticated) {
    return <Navigate to={localize("/admin/login")} replace />;
  }
  if (user && roles.includes(user.role)) {
    return <Outlet />;
  }
  return (
    fallback ?? (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-muted-foreground">
          {t("auth.routeGuards.noPermission")}
        </p>
      </div>
    )
  );
}
