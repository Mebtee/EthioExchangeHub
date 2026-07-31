import { Link, NavLink } from "react-router-dom";
import { Search } from "lucide-react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/banks", label: "Banks" },
  { to: "/rankings", label: "Rankings" },
  { to: "/news", label: "News" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border/60">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-4 md:px-12 py-4">
        <Link to="/" className="text-xl font-bold text-primary tracking-tight">
          Ethio Exchange
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
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
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search banks or currency..."
              className="w-64 rounded-full bg-surface-low pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Link
            to="/rankings"
            className="inline-flex px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            View Rankings
          </Link>
        </div>
      </div>
    </header>
  );
}
