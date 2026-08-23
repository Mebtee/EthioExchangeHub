import { Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";

import i18n from "@/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locale";
import { getInitialLocale } from "@/i18n";
import { AdminLayout } from "@/components/admin/admin-layout";
import { RequireAuth, RequireRole } from "@/components/auth/route-guards";
import { NotFoundPage } from "@/components/shared/not-found";
import { RouteFallback } from "@/components/shared/route-fallback";
import { lazyRoute } from "@/lib/lazy-retry";
import { ADMIN_ROLES } from "@/types/auth";

/**
 * Route-level code splitting: every page is its own async chunk so the initial
 * bundle stays small. <Suspense> shows the skeleton fallback while chunks load.
 */

const HomePage = lazyRoute("home", () => import("@/routes/index"));
const BanksPage = lazyRoute("banks", () => import("@/routes/banks"));
const BankDetailsPage = lazyRoute("bank-details", () => import("@/routes/banks.$slug"));
const RankingsPage = lazyRoute("rankings", () => import("@/routes/rankings"));
const NewsPage = lazyRoute("news", () => import("@/routes/news"));
const AboutPage = lazyRoute("about", () => import("@/routes/about"));
const ContactPage = lazyRoute("contact", () => import("@/routes/contact"));
const CurrencyToEtbPage = lazyRoute("currency-to-etb", () => import("@/routes/currency-to-etb"));

const AdminLoginPage = lazyRoute("admin-login", () => import("@/routes/admin/login"));
const AdminForgotPasswordPage = lazyRoute(
  "admin-forgot-password",
  () => import("@/routes/admin/forgot-password"),
);
const AdminResetPasswordPage = lazyRoute(
  "admin-reset-password",
  () => import("@/routes/admin/reset-password"),
);
const AdminDashboardPage = lazyRoute("admin-dashboard", () => import("@/routes/admin/dashboard"));
const AdminManualRatesPage = lazyRoute(
  "admin-manual-rates",
  () => import("@/routes/admin/manual-rates"),
);
const AdminPaymentsPage = lazyRoute("admin-payments", () => import("@/routes/admin/payments"));
const AdminFeaturedPage = lazyRoute("admin-featured", () => import("@/routes/admin/featured"));
const AdminScraperHealthPage = lazyRoute(
  "admin-scraper-health",
  () => import("@/routes/admin/scraper-health"),
);
const AdminScrapeLogsPage = lazyRoute(
  "admin-scrape-logs",
  () => import("@/routes/admin/scrape-logs"),
);
const AdminProfilePage = lazyRoute("admin-profile", () => import("@/routes/admin/profile"));
const AdminSettingsPage = lazyRoute("admin-settings", () => import("@/routes/admin/settings"));

// Customer portal (Phase 6) — commercial API self-service area.
const CustomerRegisterPage = lazyRoute(
  "customer-register",
  () => import("@/routes/customer/register"),
);
const CustomerLayout = lazyRoute("customer-layout", async () => {
  const mod = await import("@/components/customer/customer-layout");
  return { default: mod.CustomerLayout };
});
const CustomerDashboardPage = lazyRoute(
  "customer-dashboard",
  () => import("@/routes/customer/dashboard"),
);
const CustomerPlansPage = lazyRoute("customer-plans", () => import("@/routes/customer/plans"));
const CustomerSubscriptionPage = lazyRoute(
  "customer-subscription",
  () => import("@/routes/customer/subscription"),
);
const CustomerApiKeysPage = lazyRoute(
  "customer-api-keys",
  () => import("@/routes/customer/api-keys"),
);
const CustomerPaymentsPage = lazyRoute(
  "customer-payments",
  () => import("@/routes/customer/payments"),
);
const CustomerUsagePage = lazyRoute("customer-usage", () => import("@/routes/customer/usage"));
const CustomerDeveloperPage = lazyRoute(
  "customer-developer",
  () => import("@/routes/customer/developer"),
);

/** Per-locale font that is injected only while that locale is active. */
const LOCALE_FONTS: Partial<Record<Locale, { href: string }>> = {
  am: {
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;500;600;700&display=swap",
  },
  zh: {
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap",
  },
};

/**
 * Wraps every locale-prefixed route. Validates the `:locale` segment against
 * the supported union, redirects unsupported locales to the `/en/...`
 * equivalent, syncs the i18next language + <html lang> + locale font, and
 * renders the matched child route.
 */
function LocaleLayout() {
  const { locale: rawLocale } = useParams();
  const { pathname, search, hash } = useLocation();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  useEffect(() => {
    document.documentElement.lang = locale;
    void i18n.changeLanguage(locale);

    const font = LOCALE_FONTS[locale];
    const id = `locale-font-${locale}`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (font) {
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      link.href = font.href;
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [locale]);

  if (!isLocale(rawLocale)) {
    const rest = pathname.replace(/^\/[^/]+/, "") || "/";
    return <Navigate to={`/${DEFAULT_LOCALE}${rest}${search}${hash}`} replace />;
  }

  return <Outlet />;
}

/** Bare `/` entry point — redirect to the visitor's preferred language. */
function RootRedirect() {
  const { search, hash } = useLocation();
  const target = getInitialLocale();
  return <Navigate to={`/${target}${search}${hash}`} replace />;
}

/**
 * Legacy (unprefixed) URLs that are already indexed — `/banks`, `/rankings`,
 * `/usd-to-etb`, `/admin/login`, ... — redirect to their `/en/...` equivalent
 * instead of 404ing, so search equity and old bookmarks keep working.
 */
const LEGACY_ROOTS = new Set([
  "banks",
  "rankings",
  "usd-to-etb",
  "eur-to-etb",
  "gbp-to-etb",
  "sar-to-etb",
  "aed-to-etb",
  "news",
  "about",
  "contact",
  "admin",
  "customer",
]);

function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && LEGACY_ROOTS.has(first)) {
    return <Navigate to={`/en${pathname}${search}${hash}`} replace />;
  }
  return <NotFoundPage />;
}

/** Single source of truth for application routes. */
export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/:locale" element={<LocaleLayout />}>
          <Route index element={<HomePage />} />
          <Route path="banks" element={<BanksPage />} />
          <Route path="banks/:slug" element={<BankDetailsPage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route path="usd-to-etb" element={<CurrencyToEtbPage currency="USD" />} />
          <Route path="eur-to-etb" element={<CurrencyToEtbPage currency="EUR" />} />
          <Route path="gbp-to-etb" element={<CurrencyToEtbPage currency="GBP" />} />
          <Route path="sar-to-etb" element={<CurrencyToEtbPage currency="SAR" />} />
          <Route path="aed-to-etb" element={<CurrencyToEtbPage currency="AED" />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />

          {/* Public auth pages */}
          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="admin/forgot-password" element={<AdminForgotPasswordPage />} />
          <Route path="admin/reset-password" element={<AdminResetPasswordPage />} />
          <Route path="customer/register" element={<CustomerRegisterPage />} />

          {/* Protected admin area — authentication + role-based authorization */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={[...ADMIN_ROLES]} />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="manual-rates" element={<AdminManualRatesPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="featured" element={<AdminFeaturedPage />} />
                <Route path="scraper-health" element={<AdminScraperHealthPage />} />
                <Route path="scrape-logs" element={<AdminScrapeLogsPage />} />
                <Route path="profile" element={<AdminProfilePage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>

            {/* Protected customer portal (Phase 6) — role "customer" only */}
            <Route element={<RequireRole roles={["customer"]} />}>
              <Route path="customer" element={<CustomerLayout />}>
                <Route index element={<CustomerDashboardPage />} />
                <Route path="plans" element={<CustomerPlansPage />} />
                <Route path="subscription" element={<CustomerSubscriptionPage />} />
                <Route path="api-keys" element={<CustomerApiKeysPage />} />
                <Route path="payments" element={<CustomerPaymentsPage />} />
                <Route path="usage" element={<CustomerUsagePage />} />
                <Route path="developer" element={<CustomerDeveloperPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<LegacyRedirect />} />
      </Routes>
    </Suspense>
  );
}
