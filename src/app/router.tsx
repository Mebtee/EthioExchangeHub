import { Route, Routes } from "react-router-dom";

import HomePage from "@/routes/index";
import BanksPage from "@/routes/banks";
import BankDetailsPage from "@/routes/banks.$slug";
import RankingsPage from "@/routes/rankings";
import NewsPage from "@/routes/news";
import AboutPage from "@/routes/about";
import ContactPage from "@/routes/contact";
import { NotFoundPage } from "@/components/shared/not-found";

/** Single source of truth for application routes. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/banks" element={<BanksPage />} />
      <Route path="/banks/:slug" element={<BankDetailsPage />} />
      <Route path="/rankings" element={<RankingsPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
