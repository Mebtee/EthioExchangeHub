import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { ListRowsSkeleton } from "@/components/shared/skeletons";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { NewsCard } from "@/components/news/news-card";
import { useNews, useNewsCategories } from "@/hooks";
import { Seo } from "@/components/shared/seo";

function NewsPage() {
  const { t } = useTranslation();
  const { data: news = [], isLoading } = useNews();
  const { data: newsCategories = [] } = useNewsCategories();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(t("news.all"));

  // Per-category counts derived from the fetched list so the sidebar always
  // reflects the actual data (independent of the API-provided counts).
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of news) counts.set(n.category, (counts.get(n.category) ?? 0) + 1);
    return counts;
  }, [news]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return news.filter((n) => {
      const matchesCategory = category === t("news.all") || n.category === category;
      const matchesQuery = q
        ? n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q)
        : true;
      return matchesCategory && matchesQuery;
    });
  }, [news, query, category, t]);

  const featured = filtered.find((n) => n.featured) ?? filtered[0];
  const rest = filtered.filter((n) => n !== featured);

  return (
    <SiteShell>
      <Seo title={t("seo.news.title")} description={t("seo.news.description")} />
      <PageContainer>
        <PageHeader
          title={t("news.title")}
          description={t("news.description")}
          action={
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t("news.searchPlaceholder")}
              wrapperClassName="w-full sm:w-80"
            />
          }
        />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl bg-card border border-border/60 p-5">
              <h3 className="font-semibold mb-3">{t("news.categories")}</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    onClick={() => setCategory(t("news.all"))}
                    aria-pressed={category === t("news.all")}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm ${category === t("news.all") ? "bg-primary text-primary-foreground" : "hover:bg-surface-low"}`}
                  >
                    <span>{t("news.all")}</span>
                    <span
                      className={`text-xs ${category === t("news.all") ? "opacity-90" : "text-muted-foreground"}`}
                    >
                      {news.length}
                    </span>
                  </button>
                </li>
                {newsCategories.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      onClick={() => setCategory(c.name)}
                      aria-pressed={category === c.name}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm ${category === c.name ? "bg-primary text-primary-foreground" : "hover:bg-surface-low"}`}
                    >
                      <span>{c.name}</span>
                      <span
                        className={`text-xs ${category === c.name ? "opacity-90" : "text-muted-foreground"}`}
                      >
                        {categoryCounts.get(c.name) ?? 0}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div>
            {/* Featured */}
            {isLoading ? (
              <ListRowsSkeleton count={3} />
            ) : (
              featured && (
                <article className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden grid md:grid-cols-2">
                  <div className="relative">
                    <img
                      src={featured.image}
                      alt={featured.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-4 left-4 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                      {t("news.featured")}
                    </span>
                  </div>
                  <div className="p-6 flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {featured.category} · {featured.date}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight">{featured.title}</h2>
                    <p className="mt-3 text-sm text-muted-foreground">{featured.excerpt}</p>
                    <div className="mt-auto pt-5 flex items-center gap-3">
                      <img
                        src={featured.authorAvatar}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold">{featured.author}</p>
                        <p className="text-xs text-muted-foreground">{featured.authorRole}</p>
                      </div>
                    </div>
                  </div>
                </article>
              )
            )}

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {rest.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">
                  {t("news.noArticles")}
                </p>
              ) : (
                rest.map((n) => <NewsCard key={n.id} item={n} />)
              )}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <section className="mt-12 rounded-2xl bg-primary text-primary-foreground p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold">{t("news.newsletterTitle")}</h3>
            <p className="text-sm text-primary-foreground/80 max-w-md mt-1">
              {t("news.newsletterText")}
            </p>
          </div>
          <form className="flex w-full md:w-auto gap-3">
            <input
              type="email"
              placeholder={t("news.emailPlaceholder")}
              className="flex-1 md:w-72 rounded-xl bg-primary-foreground/10 border border-primary-foreground/30 placeholder:text-primary-foreground/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            />
            <button className="rounded-xl bg-[color:var(--gold)] text-[color:var(--gold-foreground)] px-5 py-3 text-sm font-semibold hover:opacity-90">
              {t("news.subscribe")}
            </button>
          </form>
        </section>
      </PageContainer>
    </SiteShell>
  );
}

export default NewsPage;
