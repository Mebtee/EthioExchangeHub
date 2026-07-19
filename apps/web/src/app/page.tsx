import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white">
              EH
            </div>
            <span className="text-lg font-semibold text-gray-900">EthioBanksHub</span>
          </div>

          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Features
            </Link>
            <Link
              href="#banks"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Supported Banks
            </Link>
            <Link
              href="/login"
              className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            All your Ethiopian bank accounts, <span className="text-primary-600">unified</span>.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-600">
            Manage accounts across CBE, Awash, Dashen, and 20+ Ethiopian banks from a single
            dashboard. View balances, track transactions, and transfer money seamlessly.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:shadow-sm"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="container-page text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} EthioBanksHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
