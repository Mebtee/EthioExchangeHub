export type Bank = {
  slug: string;
  name: string;
  short: string;
  type: "State Owned" | "Private Bank";
  color: string; // tailwind bg class
  buy: number;
  sell: number;
  trend: number; // percent
  lastUpdate: string;
  established?: number;
  description?: string;
  phone?: string;
  email?: string;
  hq?: string;
  rating?: number;
  reviews?: number;
  branches?: number;
};

export const banks: Bank[] = [
  {
    slug: "commercial-bank-of-ethiopia",
    name: "Commercial Bank of Ethiopia",
    short: "CBE",
    type: "State Owned",
    color: "bg-primary",
    buy: 110.2,
    sell: 118.9,
    trend: 0.0,
    lastUpdate: "2 mins ago",
    established: 1942,
    description:
      "Ethiopia's largest state-owned commercial bank, providing comprehensive retail, corporate and foreign exchange services across the country.",
    phone: "951 (Toll-Free)",
    email: "info@combanketh.et",
    hq: "Addis Ababa, Ethiopia",
    rating: 4.6,
    reviews: 5120,
    branches: 1900,
  },
  {
    slug: "bank-of-abyssinia",
    name: "Bank of Abyssinia",
    short: "BOA",
    type: "Private Bank",
    color: "bg-red-700",
    buy: 112.55,
    sell: 120.4,
    trend: 0.12,
    lastUpdate: "5 mins ago",
    established: 1996,
    description:
      "Established in 1996, Bank of Abyssinia (BoA) has grown to become one of the most trusted private financial institutions in Ethiopia. Committed to precision and digital innovation, we offer a wide range of personal and corporate banking services tailored to foster national prosperity and individual financial security.",
    phone: "8331 (Toll-Free)",
    email: "info@bankofabyssinia.com",
    hq: "Legehar, Addis Ababa, Ethiopia",
    rating: 4.8,
    reviews: 2450,
    branches: 250,
  },
  {
    slug: "awash-bank",
    name: "Awash Bank",
    short: "AWB",
    type: "Private Bank",
    color: "bg-blue-600",
    buy: 111.8,
    sell: 121.2,
    trend: 0.05,
    lastUpdate: "15 mins ago",
    established: 1994,
    description:
      "The first private commercial bank in Ethiopia after deregulation, Awash Bank delivers nationwide retail and corporate banking with one of the most active forex desks in the country.",
    phone: "6151 (Toll-Free)",
    email: "info@awashbank.com",
    hq: "Addis Ababa, Ethiopia",
    rating: 4.5,
    reviews: 1820,
    branches: 600,
  },
  {
    slug: "dashen-bank",
    name: "Dashen Bank",
    short: "DAS",
    type: "Private Bank",
    color: "bg-orange-500",
    buy: 111.45,
    sell: 120.8,
    trend: -0.02,
    lastUpdate: "1 hour ago",
    established: 1995,
    description:
      "A pioneer of card payments and digital banking in Ethiopia, Dashen Bank serves millions of customers through its branch network, agents and award-winning mobile banking platform.",
    phone: "9590 (Toll-Free)",
    email: "info@dashenbanksc.com",
    hq: "Addis Ababa, Ethiopia",
    rating: 4.6,
    reviews: 2100,
    branches: 470,
  },
  {
    slug: "hibret-bank",
    name: "Hibret Bank",
    short: "HIB",
    type: "Private Bank",
    color: "bg-emerald-700",
    buy: 110.9,
    sell: 119.5,
    trend: 0.03,
    lastUpdate: "30 mins ago",
    established: 1998,
    description:
      "Hibret Bank (formerly United Bank) offers full-service banking with a focus on small businesses, trade finance and reliable forex execution.",
    phone: "8770 (Toll-Free)",
    email: "info@hibretbank.com.et",
    hq: "Addis Ababa, Ethiopia",
    rating: 4.3,
    reviews: 940,
    branches: 320,
  },
  {
    slug: "abay-bank",
    name: "Abay Bank",
    short: "ABY",
    type: "Private Bank",
    color: "bg-green-700",
    buy: 110.58,
    sell: 119.25,
    trend: 0.03,
    lastUpdate: "3 hours ago",
    established: 2010,
    rating: 4.2,
    reviews: 510,
    branches: 230,
    hq: "Addis Ababa, Ethiopia",
    description:
      "A fast-growing private bank with deep regional roots, Abay Bank offers competitive forex rates and accessible retail services.",
    phone: "7011",
    email: "info@abaybank.com.et",
  },
  {
    slug: "zemen-bank",
    name: "Zemen Bank",
    short: "ZEM",
    type: "Private Bank",
    color: "bg-yellow-600",
    buy: 110.42,
    sell: 119.3,
    trend: -0.01,
    lastUpdate: "5 hours ago",
    established: 2008,
    rating: 4.4,
    reviews: 720,
    branches: 75,
    hq: "Addis Ababa, Ethiopia",
    description:
      "Zemen Bank pioneered single-branch and digital-first banking in Ethiopia, with a strong focus on premium clients and corporate forex services.",
    phone: "9436",
    email: "info@zemenbank.com",
  },
];

export const marketTicker = [
  { pair: "USD/ETB", value: 112.45, change: 0.2 },
  { pair: "EUR/ETB", value: 121.12, change: -0.1 },
  { pair: "GBP/ETB", value: 144.3, change: 0.5 },
  { pair: "AED/ETB", value: 30.61, change: 0.05 },
  { pair: "CNY/ETB", value: 15.55, change: -0.3 },
];

export const currencies = [
  { code: "USD", label: "US Dollar", category: "Major" },
  { code: "EUR", label: "Euro", category: "Major" },
  { code: "GBP", label: "British Pound", category: "Major" },
  { code: "CNY", label: "Chinese Yuan", category: "Emerging" },
  { code: "AED", label: "UAE Dirham", category: "Middle East" },
];

export type NewsItem = {
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
};

export const news: NewsItem[] = [
  {
    id: "n1",
    title: "The Impact of Recent Liberalization on Birr Exchange Rates",
    excerpt:
      "A deep dive into the recent structural changes in the Ethiopian FX market and what it means for commercial banks and private investors.",
    category: "Market Analysis",
    date: "Oct 24, 2024",
    readMinutes: 7,
    image:
      "https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&w=1200&q=80",
    featured: true,
    author: "Dawit Yohannes",
    authorRole: "Senior Financial Analyst",
    authorAvatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "n2",
    title: "Top 5 Mobile Banking Apps for Real-time Rates",
    excerpt:
      "Discover which Ethiopian banks offer the most reliable mobile exchange tools in 2024.",
    category: "Digital Banking",
    date: "Oct 22, 2024",
    readMinutes: 5,
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "n3",
    title: "Quarterly Trade Volume Reaches New Milestone",
    excerpt:
      "How increased export volumes are influencing the stability of the national currency.",
    category: "Market Report",
    date: "Oct 20, 2024",
    readMinutes: 4,
    image:
      "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "n4",
    title: "Understanding the New Forex Directives",
    excerpt:
      "A comprehensive breakdown of the NBE's latest policy framework for commercial bank operations.",
    category: "Regulation",
    date: "Oct 18, 2024",
    readMinutes: 8,
    image:
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "n5",
    title: "Projected Growth for the Financial Sector",
    excerpt:
      "International observers provide a positive outlook for Ethiopia's banking industry evolution.",
    category: "Economics",
    date: "Oct 15, 2024",
    readMinutes: 3,
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
  },
];

export const newsCategories = [
  { name: "All Stories", count: 42 },
  { name: "Official News", count: 12 },
  { name: "Market Trends", count: 18 },
  { name: "Bank Updates", count: 8 },
  { name: "Regulations", count: 4 },
];