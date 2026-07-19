import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  adjustFontFallback: true,
});

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://ethiobankshub.com';
const APP_NAME = 'EthioBanksHub';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: `%s | ${APP_NAME}`,
    default: `${APP_NAME} — Unified Ethiopian Banking Interface`,
  },
  description:
    'Compare exchange rates, track bank rankings, discover services, and manage portfolios across all 21 Ethiopian banks in real time.',
  keywords: [
    'Ethiopian banks', 'exchange rates', 'CBE', 'Awash Bank', 'Dashen Bank',
    'Bank of Abyssinia', 'Wegagen Bank', 'Ethiopian Birr', 'ETB', 'USD ETB rate',
    'bank rankings Ethiopia', 'Ethiopia finance', 'Addis Ababa banking',
    'foreign exchange Ethiopia', 'NBE rate',
  ],
  authors: [{ name: 'EthioBanksHub', url: APP_URL }],
  creator: 'EthioBanksHub',
  publisher: 'EthioBanksHub',

  // ── Open Graph ──────────────────────────────────────────────
  openGraph: {
    title: `${APP_NAME} — Compare Ethiopian Bank Exchange Rates`,
    description: 'Real-time exchange rates, bank rankings, and portfolio tracking for all Ethiopian banks.',
    siteName: APP_NAME,
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'am_ET',
    url: APP_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },

  // ── Twitter Card ────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — Ethiopian Banking Unified`,
    description: 'Compare rates, track rankings, and manage portfolios across 21 Ethiopian banks.',
    images: ['/og-image.png'],
  },

  // ── Icons ──────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },

  // ── PWA Manifest ────────────────────────────────────────────
  manifest: '/manifest.json',

  // ── Robots / SEO ─────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Verification (Search Console, etc.) ─────────────────────
  verification: {
    google: process.env['NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION'] ?? '',
  },

  // ── Other ──────────────────────────────────────────────────
  alternates: {
    canonical: APP_URL,
    languages: {
      'en': `${APP_URL}/en`,
      'am': `${APP_URL}/am`,
    },
  },

  // ── Preconnect / Performance Hints ──────────────────────────
  other: {
    'msapplication-TileColor': '#2563eb',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable}`}
      suppressHydrationWarning
    >
      {/* ── Preconnect for Performance ────────────────────────── */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* ── Inline theme script to prevent FOUC ────────────── */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = JSON.parse(localStorage.getItem('ethiobankshub-ui') || '{}').state?.theme;
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
