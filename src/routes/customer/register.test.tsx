import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import CustomerRegisterPage from "./register";

import type { AuthUser } from "@/types/auth";

function mockAuth(isAuthenticated: boolean, role?: AuthUser["role"]) {
  vi.mocked(useAuthMock).mockReturnValue({
    user:
      isAuthenticated && role
        ? ({ id: "u-1", name: "Test", email: "t@example.com", role } as AuthUser)
        : null,
    isAuthenticated,
    isLoading: false,
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

  it("keeps authenticated admins on their admin flow", () => {
    mockAuth(true, "admin");
    renderPage();

    expect(screen.getByText("ADMIN_AREA")).toBeInTheDocument();
    expect(screen.queryByText("Create your developer account")).not.toBeInTheDocument();
  });

  it("keeps super admins on their admin flow", () => {
    mockAuth(true, "super_admin");
    renderPage();

    expect(screen.getByText("ADMIN_AREA")).toBeInTheDocument();
    expect(screen.queryByText("Create your developer account")).not.toBeInTheDocument();
  });
});
