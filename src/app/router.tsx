import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";

import i18n from "@/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locale";
import { getInitialLocale } from "@/i18n";
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
const CurrencyToEtbPage = lazy(() => import("@/routes/currency-to-etb"));

const AdminLoginPage = lazy(() => import("@/routes/admin/login"));
const AdminForgotPasswordPage = lazy(() => import("@/routes/admin/forgot-password"));
const AdminResetPasswordPage = lazy(() => import("@/routes/admin/reset-password"));
const AdminDashboardPage = lazy(() => import("@/routes/admin/dashboard"));
const AdminManualRatesPage = lazy(() => import("@/routes/admin/manual-rates"));
const AdminScraperHealthPage = lazy(() => import("@/routes/admin/scraper-health"));
const AdminScrapeLogsPage = lazy(() => import("@/routes/admin/scrape-logs"));
const AdminProfilePage = lazy(() => import("@/routes/admin/profile"));
const AdminSettingsPage = lazy(() => import("@/routes/admin/settings"));

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

          {/* Protected admin area — authentication + role-based authorization */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={[...ADMIN_ROLES]} />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="manual-rates" element={<AdminManualRatesPage />} />
                <Route path="scraper-health" element={<AdminScraperHealthPage />} />
                <Route path="scrape-logs" element={<AdminScrapeLogsPage />} />
                <Route path="profile" element={<AdminProfilePage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<LegacyRedirect />} />
      </Routes>
    </Suspense>
  );
}
