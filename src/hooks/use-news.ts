import { useQuery } from "@tanstack/react-query";

import { fetchNews, fetchNewsCategories } from "@/lib/api/news";
import { newsKeys } from "@/lib/query-keys";
import { news as demoNews, newsCategories as demoNewsCategories } from "@/lib/demo-data";
import type { NewsCategory, NewsItem } from "@/types/news";

export function useNews() {
  return useQuery<NewsItem[]>({
    queryKey: newsKeys.lists(),
    queryFn: fetchNews,
    initialData: demoNews,
  });
}

export function useNewsCategories() {
  return useQuery<NewsCategory[]>({
    queryKey: newsKeys.categories(),
    queryFn: fetchNewsCategories,
    initialData: demoNewsCategories,
  });
}
