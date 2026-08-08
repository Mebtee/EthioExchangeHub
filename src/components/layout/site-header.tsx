import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/banks", label: "Banks" },
  { to: "/rankings", label: "Rankings" },
  { to: "/news", label: "News" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border/60">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 md:px-12 py-4">
        <Link to="/" className="text-xl font-bold text-primary tracking-tight">
          Ethio Exchange
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
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
          <Link
            to="/rankings"
            className="inline-flex px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            View Rankings
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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
        aria-label="Primary"
        hidden={!menuOpen}
        className="border-t border-border/60 px-4 py-3 md:hidden"
      >
        <ul className="space-y-1">
          {navItems.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
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
