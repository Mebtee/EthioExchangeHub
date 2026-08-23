import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import CustomerRegisterPage from "./register";

import type { AuthUser } from "@/types/auth";

function mockAuth(
  isAuthenticated: boolean,
  role?: AuthUser["role"],
  { isLoading = false }: { isLoading?: boolean } = {},
) {
  vi.mocked(useAuthMock).mockReturnValue({
    user:
      isAuthenticated && role
        ? ({ id: "u-1", name: "Test", email: "t@example.com", role } as AuthUser)
        : null,
    isAuthenticated,
    isLoading,
    login: vi.fn(async () => ({}) as never),
    logout: vi.fn(async () => {}),
    hasRole: (...roles: string[]) => isAuthenticated && !!role && roles.includes(role),
  });
}

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock("@/context/auth-context", () => ({ useAuth: () => useAuthMock() }));
vi.mock("@/hooks/use-customer", () => ({
  useRegisterCustomer: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/en/customer/register"]}>
      <Routes>
        <Route path="/en/customer/register" element={<CustomerRegisterPage />} />
        <Route path="/en/customer" element={<p>CUSTOMER_PORTAL</p>} />
        <Route path="/en/admin" element={<p>ADMIN_AREA</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CustomerRegisterPage entry routing", () => {
  it("shows the form to guests while session restore is still loading", () => {
    // Regression: the page must never redirect or throw while AuthContext is
    // initializing (isLoading=true, no user yet) — this is the exact state a
    // guest with stale tokens passes through on the public CTA landing.
    mockAuth(false, undefined, { isLoading: true });
    renderPage();

    expect(screen.getByText("Create your developer account")).toBeInTheDocument();
    expect(screen.queryByText("CUSTOMER_PORTAL")).not.toBeInTheDocument();
    expect(screen.queryByText("ADMIN_AREA")).not.toBeInTheDocument();
  });

  it("never brands the CUSTOMER registration page as the admin console", () => {
    // Production bug: the page rendered inside AuthShell with the hardcoded
    // "Admin Console" badge, so visitors believed API Access had taken them
    // to /admin even though the URL was /en/customer/register.
    mockAuth(false);
    renderPage();

    expect(screen.getByText("Developer Portal")).toBeInTheDocument();
    expect(screen.queryByText(/admin console/i)).not.toBeInTheDocument();
  });

  it("shows the registration form to signed-out visitors", () => {
    mockAuth(false);
    renderPage();

    expect(screen.getByText("Create your developer account")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in/i })).toHaveAttribute(
      "href",
      "/en/admin/login",
    );
  });

  it("forwards an authenticated customer into the portal", () => {
    mockAuth(true, "customer");
    renderPage();

    expect(screen.getByText("CUSTOMER_PORTAL")).toBeInTheDocument();
    expect(screen.queryByText("Create your developer account")).not.toBeInTheDocument();
  });

  it("shows the registration form to signed-in admins", () => {
    // "API Access" is a public CTA: staff sessions must not hijack it into
    // /admin — an admin may register a customer account without signing out.
    mockAuth(true, "admin");
    renderPage();

    expect(screen.getByText("Create your developer account")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_AREA")).not.toBeInTheDocument();
  });

  it("shows the registration form to signed-in super admins", () => {
    mockAuth(true, "super_admin");
    renderPage();

    expect(screen.getByText("Create your developer account")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_AREA")).not.toBeInTheDocument();
  });
});
