import { Routes, Route, Link } from "react-router-dom";

import HomePage from "./routes/index";
import BanksPage from "./routes/banks";
import BankDetailsPage from "./routes/banks.$slug";
import RankingsPage from "./routes/rankings";
import NewsPage from "./routes/news";
import AboutPage from "./routes/about";
import ContactPage from "./routes/contact";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/banks" element={<BanksPage />} />
      <Route path="/banks/:slug" element={<BankDetailsPage />} />
      <Route path="/rankings" element={<RankingsPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}