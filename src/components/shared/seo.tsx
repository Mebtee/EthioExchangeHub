import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://ethioexchange.live";

function toCanonical(pathname: string): string {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  return `${SITE_URL}${path}`;
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
  }, [title, description, canonical, pathname]);

  return null;
}
