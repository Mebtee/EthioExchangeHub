import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const CRUMB_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/manual-rates": "Manual Exchange Rates",
  "/admin/scraper-health": "Scraper Health",
  "/admin/scrape-logs": "Scrape Logs",
  "/admin/profile": "Profile",
  "/admin/settings": "Settings",
};

export function AdminBreadcrumbs() {
  const { pathname } = useLocation();
  const label = CRUMB_LABELS[pathname] ?? "Admin";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin">Admin</Link>
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
