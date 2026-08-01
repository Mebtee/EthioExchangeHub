import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/admin/admin-layout";
import { RequireAuth, RequireRole } from "@/components/auth/route-guards";
import { NotFoundPage } from "@/components/shared/not-found";
import { RouteFallback } from "@/components/shared/route-fallback";
import { ADMIN_ROLES } from "@/types/auth";

/**
 * Route-level code splitting: every page is its own async chunk so the initial
 * bundle stays small. <Suspense> shows the skeleton fallback while chunks load.
 */

const HomePage = lazy(() => import("@/routes/index"));
const BanksPage = lazy(() => import("@/routes/banks"));
const BankDetailsPage = lazy(() => import("@/routes/banks.$slug"));
const RankingsPage = lazy(() => import("@/routes/rankings"));
const NewsPage = lazy(() => import("@/routes/news"));
const AboutPage = lazy(() => import("@/routes/about"));
const ContactPage = lazy(() => import("@/routes/contact"));

const AdminLoginPage = lazy(() => import("@/routes/admin/login"));
const AdminForgotPasswordPage = lazy(() => import("@/routes/admin/forgot-password"));
const AdminResetPasswordPage = lazy(() => import("@/routes/admin/reset-password"));
const AdminDashboardPage = lazy(() => import("@/routes/admin/dashboard"));
const AdminManualRatesPage = lazy(() => import("@/routes/admin/manual-rates"));
const AdminScraperHealthPage = lazy(() => import("@/routes/admin/scraper-health"));
const AdminScrapeLogsPage = lazy(() => import("@/routes/admin/scrape-logs"));
const AdminProfilePage = lazy(() => import("@/routes/admin/profile"));
const AdminSettingsPage = lazy(() => import("@/routes/admin/settings"));

/** Single source of truth for application routes. */
export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/banks" element={<BanksPage />} />
        <Route path="/banks/:slug" element={<BankDetailsPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Public auth pages */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
        <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />

        {/* Protected admin area — authentication + role-based authorization */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole roles={[...ADMIN_ROLES]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="manual-rates" element={<AdminManualRatesPage />} />
              <Route path="scraper-health" element={<AdminScraperHealthPage />} />
              <Route path="scrape-logs" element={<AdminScrapeLogsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
