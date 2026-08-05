export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readMinutes: number;
  image: string;
  featured?: boolean;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
}

export interface NewsCategory {
  name: string;
  count: number;
}

/**
 * News service.
 *
 * No real news source (database table, CMS, or feed) is wired yet, so the
 * endpoints intentionally return empty lists instead of fabricated articles.
 * The UI renders the "no news available" empty state. When a real source
 * ships, `listNews`/`listCategories` should read from it — never from a
 * hardcoded array.
 */
export class NewsService {
  async listNews(): Promise<NewsItem[]> {
    return [];
  }

  async listCategories(): Promise<NewsCategory[]> {
    return [];
  }
}
