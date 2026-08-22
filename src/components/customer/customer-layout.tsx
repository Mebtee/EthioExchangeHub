import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CustomerSidebar } from "./customer-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/hooks";

/**
 * Shell for the customer developer portal (Phase 6) — mirrors the admin
 * layout's desktop-sidebar + mobile-sheet structure with portal branding.
 */
export function CustomerLayout() {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { localize } = useLocale();

  async function handleLogout() {
    await logout();
    navigate(localize("/"), { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-card lg:block">
        <CustomerSidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{t("customer.mobileNavAria")}</SheetTitle>
          <CustomerSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        {/* Top bar: mobile menu + identity/logout. Breadcrumbs stay admin-only
            to keep this surface lean. */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label={t("customer.mobileNavAria")}
            >
              <Menu className="size-5" />
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
                <LogOut className="size-4" />
                {t("customer.header.logout")}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
