import { Link } from "react-router-dom";
import { Globe, AtSign, Share2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-surface-low">
      <div className="mx-auto max-w-[1280px] px-4 md:px-12 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="text-xl font-bold text-primary mb-3">Ethio Exchange</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Empowering the Ethiopian financial landscape with real-time exchange
            insights and secure banking aggregation.
          </p>
          <div className="mt-5 flex gap-3">
            {[Globe, AtSign, Share2].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="size-9 rounded-full bg-surface-high flex items-center justify-center text-primary hover:opacity-80 transition"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Quick Links" links={[
          { to: "/", label: "Rates" },
          { to: "/banks", label: "Banks" },
          { to: "/news", label: "News" },
        ]} />
        <FooterCol title="About" links={[
          { to: "/about", label: "Our Story" },
          { to: "/about", label: "Methodology" },
          { to: "/about", label: "Privacy" },
        ]} />
        <FooterCol title="Contact" links={[
          { to: "/contact", label: "Support" },
          { to: "/contact", label: "API Access" },
          { to: "/contact", label: "Feedback" },
        ]} />
        <FooterCol title="Legal" links={[
          { to: "/about", label: "Terms of Service" },
          { to: "/about", label: "Privacy Policy" },
          { to: "/about", label: "Disclaimer" },
        ]} />
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ethio Exchange. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h5 className="text-primary font-semibold mb-3 text-sm">{title}</h5>
      <ul className="space-y-2 text-sm">
        {links.map((l, i) => (
          <li key={i}>
            <Link to={l.to} className="text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}