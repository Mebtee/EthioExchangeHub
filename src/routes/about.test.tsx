import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AboutPage from "./about";
import { config } from "@/lib/config";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(async () => ({}) as never),
    logout: vi.fn(async () => {}),
    hasRole: () => false,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/en/about"]}>
      <AboutPage />
    </MemoryRouter>,
  );
}

describe("AboutPage API docs CTA", () => {
  it('links "View API Docs" to the configured Swagger documentation in a new tab', () => {
    renderPage();

    const docsLink = screen.getByRole("link", { name: /View API Docs/i });
    expect(docsLink).toHaveAttribute("href", config.docsUrl);
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("derives the docs URL from the API base URL (backend root, not /api/v1)", () => {
    // With the test env's VITE_API_BASE_URL=http://localhost:5000/api/v1 the
    // docs URL must point at the backend root — mirroring production, where
    // the same derivation yields https://ethioexchangehub.onrender.com/docs.
    expect(config.docsUrl).toBe("http://localhost:5000/docs");
  });
});
