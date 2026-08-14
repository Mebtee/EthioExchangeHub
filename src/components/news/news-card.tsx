import { memo } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NewsItem } from "@/types/news";

export const NewsCard = memo(function NewsCard({ item }: { item: NewsItem }) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl bg-card border border-border/60 overflow-hidden hover:-translate-y-0.5 transition shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="relative">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="w-full h-44 object-cover"
        />
        <span className="absolute bottom-3 left-3 rounded-md bg-card/95 text-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
          {item.category}
        </span>
      </div>
      <div className="p-5">
        <p className="text-xs text-muted-foreground">
          {item.date} • {t("common.minRead", { count: item.readMinutes })}
        </p>
        <h3 className="mt-1 font-semibold leading-snug">{item.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
        <a
          href="#"
          className="mt-3 inline-flex items-center text-sm font-semibold text-primary hover:underline"
        >
          {t("newsCard.readMore")} <ArrowRight className="size-3.5 ml-1" />
        </a>
      </div>
    </article>
  );
});
