import { useState } from "react";
import { Outlet } from "react-router-dom";

import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";

export function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-card lg:block">
        <AdminSidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <AdminHeader onMenuClick={() => setMobileNavOpen(true)} />
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
