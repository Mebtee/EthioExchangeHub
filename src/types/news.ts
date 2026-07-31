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
