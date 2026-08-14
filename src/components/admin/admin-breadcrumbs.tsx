import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocale } from "@/hooks";

type CrumbKey =
  | "admin.nav.dashboard"
  | "admin.nav.manualRates"
  | "admin.nav.scraperHealth"
  | "admin.nav.scrapeLogs"
  | "admin.nav.profile"
  | "admin.nav.settings";

const CRUMB_LABELS: Record<string, CrumbKey> = {
  "/admin": "admin.nav.dashboard",
  "/admin/manual-rates": "admin.nav.manualRates",
  "/admin/scraper-health": "admin.nav.scraperHealth",
  "/admin/scrape-logs": "admin.nav.scrapeLogs",
  "/admin/profile": "admin.nav.profile",
  "/admin/settings": "admin.nav.settings",
};

export function AdminBreadcrumbs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { localize } = useLocale();
  const label = t(CRUMB_LABELS[pathname] ?? "admin.nav.dashboard");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={localize("/admin")}>{t("admin.header.admin")}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
