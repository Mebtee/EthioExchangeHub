import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Facebook, Twitter } from "lucide-react";

import { useLocale } from "@/hooks";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  {
    href: "https://web.facebook.com/profile.php?id=61593648856881",
    labelKey: "footer.followFacebook",
    icon: Facebook,
  },
  { href: "https://x.com/ethiobanksx", labelKey: "footer.followTwitter", icon: Twitter },
  {
    href: "https://t.me/EthiopianBanksExchange",
    labelKey: "footer.followTelegram",
    icon: TelegramIcon,
  },
] as const;

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-16 border-t border-border/60 bg-surface-low">
      <div className="mx-auto max-w-[1280px] px-4 md:px-12 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="text-xl font-bold text-primary mb-3">Ethio Exchange</div>
          <p className="text-sm text-muted-foreground max-w-xs">{t("footer.tagline")}</p>
          <div className="mt-5 flex gap-3">
            {SOCIAL_LINKS.map(({ href, labelKey, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(labelKey)}
                className="size-9 rounded-full bg-surface-high flex items-center justify-center text-primary hover:opacity-80 transition"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol
          title={t("footer.quickLinks")}
          links={[
            { to: "/", label: t("footer.rates") },
            { to: "/banks", label: t("footer.banks") },
            { to: "/rankings", label: t("footer.rankings") },
            { to: "/news", label: t("footer.news") },
          ]}
        />
        <FooterCol
          title={t("footer.currencyConverter")}
          links={[
            { to: "/usd-to-etb", label: t("currencyToEtb.pairLabel", { code: "USD" }) },
            { to: "/eur-to-etb", label: t("currencyToEtb.pairLabel", { code: "EUR" }) },
            { to: "/gbp-to-etb", label: t("currencyToEtb.pairLabel", { code: "GBP" }) },
            { to: "/sar-to-etb", label: t("currencyToEtb.pairLabel", { code: "SAR" }) },
            { to: "/aed-to-etb", label: t("currencyToEtb.pairLabel", { code: "AED" }) },
          ]}
        />
        <FooterCol
          title={t("footer.about")}
          links={[
            { to: "/about", label: t("footer.ourStory") },
            { to: "/about", label: t("footer.methodology") },
            { to: "/about", label: t("footer.privacy") },
          ]}
        />
        <FooterCol
          title={t("footer.contact")}
          links={[
            { to: "/contact", label: t("footer.support") },
            // Commercial CTA — always lands on the public registration page.
            { to: "/customer/register", label: t("footer.apiAccess") },
            { to: "/contact", label: t("footer.feedback") },
          ]}
        />
        <FooterCol
          title={t("footer.legal")}
          links={[
            { to: "/about", label: t("footer.terms") },
            { to: "/about", label: t("footer.privacyPolicy") },
            { to: "/about", label: t("footer.disclaimer") },
          ]}
        />
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        {t("footer.rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  const { localize } = useLocale();
  return (
    <div>
      <h5 className="text-primary font-semibold mb-3 text-sm">{title}</h5>
      <ul className="space-y-2 text-sm">
        {links.map((l, i) => (
          <li key={i}>
            <Link
              to={localize(l.to)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
