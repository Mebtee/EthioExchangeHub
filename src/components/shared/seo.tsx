import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { LOCALES } from "@/i18n/locale";

const SITE_URL = "https://ethioexchange.live";

function toCanonical(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  return `${SITE_URL}${path}`;
}

/** Strip the active `/:locale` segment so alternates can be re-prefixed per locale. */
function toBasePath(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if (first && (LOCALES as readonly string[]).includes(first)) {
    return `/${rest.join("/")}`;
  }
  return pathname;
}

export function Seo({
  title,
  description,
  canonical,
}: {
  title: string;
  description?: string;
  canonical?: string;
}) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;

    if (description) {
      let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = "description";
        document.head.appendChild(tag);
      }
      tag.content = description;
    }

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical ?? toCanonical(pathname);

    const base = toBasePath(pathname);
    const tail = base === "/" ? "" : base;

    for (const locale of LOCALES) {
      const href = `${SITE_URL}/${locale}${tail}`;
      let alternate = document.querySelector<HTMLLinkElement>(`link[hreflang="${locale}"]`);
      if (!alternate) {
        alternate = document.createElement("link");
        document.head.appendChild(alternate);
      }
      alternate.rel = "alternate";
      alternate.hreflang = locale;
      alternate.href = href;
    }

    let xDefault = document.querySelector<HTMLLinkElement>('link[hreflang="x-default"]');
    if (!xDefault) {
      xDefault = document.createElement("link");
      document.head.appendChild(xDefault);
    }
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${SITE_URL}/en${tail}`;
  }, [title, description, canonical, pathname]);

  return null;
}

/**
 * Injects JSON-LD structured data (BreadcrumbList etc.) into <head> as a
 * single id-keyed script. The script is replaced on data change and removed
 * when the component unmounts, so navigating between pages never leaves stale
 * structured data behind. The static WebSite/Organization graph in index.html
 * is untouched.
 */
export function JsonLd({ id, data }: { id: string; data: object }) {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = scriptId;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => script?.remove();
  }, [id, data]);

  return null;
}
