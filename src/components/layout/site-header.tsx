import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";

import { useLocale } from "@/hooks";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader() {
  const { t } = useTranslation();
  const { localize } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { to: "/", label: t("nav.home") },
    { to: "/banks", label: t("nav.banks") },
    { to: "/rankings", label: t("nav.rankings") },
    { to: "/news", label: t("nav.news") },
    { to: "/about", label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border/60">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 md:px-12 py-4">
        <Link to={localize("/")} className="text-xl font-bold text-primary tracking-tight">
          Ethio Exchange
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label={t("nav.primary")}
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={localize(n.to)}
              end={n.to === "/"}
              className={({ isActive }) =>
                isActive
                  ? "text-primary border-b-2 border-primary pb-1 font-semibold"
                  : "text-muted-foreground hover:text-primary transition-colors"
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />

          <Link
            to={localize("/rankings")}
            className="inline-flex px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t("nav.viewRankings")}
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground hover:text-foreground md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav — always rendered so aria-controls stays valid; hidden until toggled */}
      <nav
        id="mobile-nav"
        aria-label={t("nav.primary")}
        hidden={!menuOpen}
        className="border-t border-border/60 px-4 py-3 md:hidden"
      >
        <ul className="space-y-1">
          {navItems.map((n) => (
            <li key={n.to}>
              <NavLink
                to={localize(n.to)}
                end={n.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-surface-low hover:text-foreground"
                  }`
                }
              >
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
