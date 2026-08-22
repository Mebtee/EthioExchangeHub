import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AdminLoginPage from "./login";

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
    <MemoryRouter initialEntries={["/en/admin/login"]}>
      <AdminLoginPage />
    </MemoryRouter>,
  );
}

describe("AdminLoginPage registration discoverability", () => {
  it("offers a visible path to customer registration", () => {
    renderPage();

    const registerLink = screen.getByRole("link", { name: /Create one/i });
    expect(registerLink).toHaveAttribute("href", "/en/customer/register");
  });

  it("keeps the existing forgot-password flow discoverable", () => {
    renderPage();

    expect(screen.getByRole("link", { name: /Forgot password\?/i })).toHaveAttribute(
      "href",
      "/en/admin/forgot-password",
    );
  });
});
