import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, AtSign, Share2 } from "lucide-react";

import { useLocale } from "@/hooks";

export function SiteFooter() {
  const { t } = useTranslation();
  const { localize } = useLocale();

  return (
    <footer className="mt-16 border-t border-border/60 bg-surface-low">
      <div className="mx-auto max-w-[1280px] px-4 md:px-12 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="text-xl font-bold text-primary mb-3">Ethio Exchange</div>
          <p className="text-sm text-muted-foreground max-w-xs">{t("footer.tagline")}</p>
          <div className="mt-5 flex gap-3">
            <a
              href="#"
              aria-label={t("footer.ariaWebsite")}
              className="size-9 rounded-full bg-surface-high flex items-center justify-center text-primary hover:opacity-80 transition"
            >
              <Globe className="size-4" />
            </a>
            <a
              href="#"
              aria-label={t("footer.ariaEmail")}
              className="size-9 rounded-full bg-surface-high flex items-center justify-center text-primary hover:opacity-80 transition"
            >
              <AtSign className="size-4" />
            </a>
            <a
              href="#"
              aria-label={t("footer.ariaSocial")}
              className="size-9 rounded-full bg-surface-high flex items-center justify-center text-primary hover:opacity-80 transition"
            >
              <Share2 className="size-4" />
            </a>
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
            { to: "/contact", label: t("footer.apiAccess") },
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
