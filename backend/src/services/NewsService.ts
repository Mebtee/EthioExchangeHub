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

const NEWS_ITEMS: NewsItem[] = [
  {
    id: "1",
    title: "NBE Signals Tighter FX Market Oversight",
    excerpt:
      "Banks are being encouraged to publish updated exchange tables more frequently as market monitoring tightens.",
    category: "Policy",
    date: "2026-08-04",
    readMinutes: 4,
    image: svgDataUri("Policy", "#1f2937", "#d1d5db"),
    featured: true,
    author: "Ethio Exchange Desk",
    authorRole: "Market Editor",
    authorAvatar: svgDataUri("ED", "#0f172a", "#f8fafc"),
  },
  {
    id: "2",
    title: "Commercial Banks Adjust USD Spreads Ahead of Month-End",
    excerpt:
      "Recent rate updates show narrower buy/sell spreads as banks react to stronger market demand.",
    category: "Markets",
    date: "2026-08-03",
    readMinutes: 3,
    image: svgDataUri("Markets", "#7c2d12", "#ffedd5"),
    author: "Market Analysis Team",
    authorRole: "Senior Analyst",
    authorAvatar: svgDataUri("MA", "#7c2d12", "#fff7ed"),
  },
  {
    id: "3",
    title: "Digital Banking Channels See Higher FX Inquiry Volume",
    excerpt:
      "Customer demand for branch-free rate comparison and transfer support continues to rise this week.",
    category: "Digital Banking",
    date: "2026-08-02",
    readMinutes: 5,
    image: svgDataUri("Digital", "#164e63", "#cffafe"),
    author: "Operations Desk",
    authorRole: "Staff Writer",
    authorAvatar: svgDataUri("OD", "#164e63", "#ecfeff"),
  },
];

function svgDataUri(label: string, background: string, foreground: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${label}"><rect width="1200" height="800" fill="${background}"/><circle cx="960" cy="180" r="180" fill="${foreground}" fill-opacity="0.08"/><circle cx="220" cy="620" r="240" fill="${foreground}" fill-opacity="0.12"/><text x="80" y="170" fill="${foreground}" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">${label}</text><text x="80" y="250" fill="${foreground}" fill-opacity="0.85" font-family="Arial, Helvetica, sans-serif" font-size="28">Ethio Exchange Hub</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export class NewsService {
  async listNews(): Promise<NewsItem[]> {
    return NEWS_ITEMS;
  }

  async listCategories(): Promise<NewsCategory[]> {
    const counts = new Map<string, number>();
    for (const item of NEWS_ITEMS) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }
}