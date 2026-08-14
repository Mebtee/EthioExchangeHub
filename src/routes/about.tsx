import type { ReactNode } from "react";
import {
  BadgeCheck,
  Zap,
  Cable,
  ScanSearch,
  BarChart3,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

import { useTranslation, Trans } from "react-i18next";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { useLocale } from "@/hooks";
import { Pill } from "@/components/shared/pill";
import { Seo } from "@/components/shared/seo";

function AboutPage() {
  const { t } = useTranslation();
  const { localize } = useLocale();
  return (
    <SiteShell>
      <Seo title={t("seo.about.title")} description={t("seo.about.description")} />
      <PageContainer>
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-block rounded-full bg-[color:var(--gold-soft)] text-[color:var(--gold-foreground)] text-[10px] font-bold uppercase tracking-wider px-3 py-1.5">
              {t("about.ourMission")}
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-[1.05]">
              <Trans
                i18nKey="about.heroTitle"
                components={{ highlight: <span className="text-primary" /> }}
              />
            </h1>
            <p className="mt-5 text-muted-foreground max-w-lg">{t("about.heroText")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Pill icon={<BadgeCheck className="size-4 text-primary" />}>
                {t("about.certifiedData")}
              </Pill>
              <Pill icon={<Zap className="size-4 text-primary" />}>
                {t("about.millisecondLatency")}
              </Pill>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1000&q=80"
              alt={t("about.liveDashboardAlt")}
              loading="lazy"
              decoding="async"
              width="1000"
              height="750"
              className="rounded-2xl object-cover w-full aspect-[4/3] shadow-[0_20px_60px_-20px_rgba(13,99,27,0.4)]"
            />
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-card border border-border/60 p-4 shadow-xl w-52">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t("about.liveUpdates")}
              </p>
              <p className="text-xs text-muted-foreground">{t("about.syncCentralBank")}</p>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Stat
            label={t("about.statPartnerBanks")}
            value="30+"
            tone="white"
            detail={t("about.statPartnerBanksDetail")}
          />
          <Stat label={t("about.statDailyPoints")} value="2,800+" tone="primary" />
          <Stat
            label={t("about.statHistoricalDepth")}
            value={t("about.statHistoricalDepthValue")}
            tone="gold"
          />
        </div>

        {/* Engineering */}
        <section className="mt-14 rounded-3xl bg-surface-low p-8 md:p-12">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
              {t("about.engineeringLabel")}
            </p>
            <h2 className="text-3xl font-bold mt-2">{t("about.engineeringTitle")}</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <Pipeline icon={<Cable />} title={t("about.pipelineApiHooks")}>
              {t("about.pipelineApiHooksText")}
            </Pipeline>
            <Pipeline icon={<ScanSearch />} title={t("about.pipelineScraping")}>
              {t("about.pipelineScrapingText")}
            </Pipeline>
            <Pipeline icon={<BarChart3 />} title={t("about.pipelineValidation")}>
              {t("about.pipelineValidationText")}
            </Pipeline>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">{t("about.builtForFinance")}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <Feature icon={<Zap className="text-primary" />} title={t("about.featureRealtime")}>
              {t("about.featureRealtimeText")}
            </Feature>
            <Feature
              icon={<TrendingUp className="text-primary" />}
              title={t("about.featureTrends")}
            >
              {t("about.featureTrendsText")}
            </Feature>
            <Feature
              icon={<ShieldCheck className="text-destructive" />}
              title={t("about.featureAccuracy")}
            >
              {t("about.featureAccuracyText")}
            </Feature>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-primary text-primary-foreground p-10 text-center">
          <h2 className="text-3xl font-bold">{t("about.ctaTitle")}</h2>
          <p className="mt-2 max-w-xl mx-auto text-primary-foreground/80">{t("about.ctaText")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={localize("/banks")}
              className="rounded-xl bg-[color:var(--gold)] text-[color:var(--gold-foreground)] px-6 py-3 text-sm font-semibold"
            >
              {t("about.exploreBanks")}
            </a>
            <a
              href="#"
              className="rounded-xl border border-primary-foreground/40 px-6 py-3 text-sm font-semibold hover:bg-primary-foreground/10 inline-flex items-center gap-2"
            >
              {t("about.viewApiDocs")} <ArrowRight className="size-4" />
            </a>
          </div>
        </section>
      </PageContainer>
    </SiteShell>
  );
}

function Stat({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string;
  tone: "white" | "primary" | "gold";
  detail?: string;
}) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "gold"
        ? "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
        : "bg-card border border-border/60";
  return (
    <div className={`rounded-2xl p-6 ${cls}`}>
      {detail && <p className="text-sm opacity-80 mb-3">{detail}</p>}
      <p className="text-3xl font-bold tabular">{value}</p>
      <p className="text-xs uppercase tracking-wider opacity-80 mt-1 font-semibold">{label}</p>
    </div>
  );
}

function Pipeline({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto size-12 rounded-full bg-card border border-border/60 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-6">
      <div className="size-9 flex items-center justify-center">{icon}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default AboutPage;
