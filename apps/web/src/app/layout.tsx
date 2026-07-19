import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | EthioBanksHub',
    default: 'EthioBanksHub — Unified Banking Interface',
  },
  description:
    'A unified interface for managing accounts across all Ethiopian banks. View balances, track transactions, and make transfers seamlessly.',
  keywords: ['Ethiopian banks', 'banking', 'finance', 'CBE', 'Awash Bank', 'Dashen Bank'],
  authors: [{ name: 'EthioBanksHub' }],
  openGraph: {
    title: 'EthioBanksHub',
    description: 'Unified banking interface for Ethiopian banks',
    siteName: 'EthioBanksHub',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
