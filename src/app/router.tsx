import { Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/admin/admin-layout";
import { RequireAuth, RequireRole } from "@/components/auth/route-guards";
import { NotFoundPage } from "@/components/shared/not-found";
import HomePage from "@/routes/index";
import BanksPage from "@/routes/banks";
import BankDetailsPage from "@/routes/banks.$slug";
import RankingsPage from "@/routes/rankings";
import NewsPage from "@/routes/news";
import AboutPage from "@/routes/about";
import ContactPage from "@/routes/contact";
import AdminLoginPage from "@/routes/admin/login";
import AdminForgotPasswordPage from "@/routes/admin/forgot-password";
import AdminResetPasswordPage from "@/routes/admin/reset-password";
import AdminDashboardPage from "@/routes/admin/dashboard";
import AdminManualRatesPage from "@/routes/admin/manual-rates";
import AdminScraperHealthPage from "@/routes/admin/scraper-health";
import AdminScrapeLogsPage from "@/routes/admin/scrape-logs";
import AdminProfilePage from "@/routes/admin/profile";
import AdminSettingsPage from "@/routes/admin/settings";
import { ADMIN_ROLES } from "@/types/auth";

/** Single source of truth for application routes. */
export function AppRoutes() {
  return (
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
  );
}
