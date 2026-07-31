import { useQuery } from "@tanstack/react-query";

import { fetchNews, fetchNewsCategories } from "@/lib/api/news";
import { newsKeys } from "@/lib/query-keys";
import type { NewsCategory, NewsItem } from "@/types/news";

export function useNews() {
  return useQuery<NewsItem[]>({
    queryKey: newsKeys.lists(),
    queryFn: fetchNews,
  });
}

export function useNewsCategories() {
  return useQuery<NewsCategory[]>({
    queryKey: newsKeys.categories(),
    queryFn: fetchNewsCategories,
  });
}
