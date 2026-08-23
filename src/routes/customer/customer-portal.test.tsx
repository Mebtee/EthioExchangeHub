import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomerApiKeysPage from "./api-keys";
import CustomerPaymentsPage from "./payments";
import CustomerPlansPage from "./plans";
import CustomerUsagePage from "./usage";
import type {
  CustomerApiKey,
  CustomerPaymentMethod,
  CustomerPlan,
  CustomerSubscription,
  CustomerUsage,
} from "@/types/customer";

const mocks = vi.hoisted(() => ({
  fetchSubscription: vi.fn(),
  fetchPlans: vi.fn(),
  fetchApiKeys: vi.fn(),
  fetchPayments: vi.fn(),
  fetchPaymentMethods: vi.fn(),
  fetchUsage: vi.fn(),
  fetchKeyUsage: vi.fn(),
  createSubscription: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  submitPayment: vi.fn(),
  uploadReceipt: vi.fn(),
  register: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/lib/api/customer", () => ({
  fetchCustomerSubscription: mocks.fetchSubscription,
  fetchCustomerPlans: mocks.fetchPlans,
  fetchCustomerApiKeys: mocks.fetchApiKeys,
  fetchCustomerPayments: mocks.fetchPayments,
  fetchCustomerPaymentMethods: mocks.fetchPaymentMethods,
  fetchCustomerUsage: mocks.fetchUsage,
  fetchCustomerKeyUsage: mocks.fetchKeyUsage,
  createCustomerSubscription: mocks.createSubscription,
  createCustomerApiKey: mocks.createApiKey,
  revokeCustomerApiKey: mocks.revokeApiKey,
  submitCustomerPayment: mocks.submitPayment,
  uploadCustomerReceipt: mocks.uploadReceipt,
  registerCustomer: mocks.register,
}));

vi.mock("sonner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sonner")>();
  return {
    ...actual,
    toast: { success: mocks.toastSuccess, error: mocks.toastError, info: mocks.toastInfo },
  };
});

function renderPage(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const ISO = "2026-08-01T09:00:00.000Z";

const PLAN_FREE: CustomerPlan = {
  id: "plan-free",
  name: "Free",
  slug: "free",
  description: "For evaluation",
  price: 0,
  currency: "ETB",
  billingInterval: "monthly",
  monthlyRequestLimit: 1000,
  requestsPerMinute: 10,
  maxApiKeys: 2,
  displayOrder: 1,
};

const PLAN_PRO: CustomerPlan = {
  id: "plan-pro",
  name: "Pro",
  slug: "pro",
  description: null,
  price: 500,
  currency: "ETB",
  billingInterval: "monthly",
  monthlyRequestLimit: 100000,
  requestsPerMinute: 60,
  maxApiKeys: 10,
  displayOrder: 2,
};

const SUB_PENDING: CustomerSubscription = {
  id: "sub-1",
  planId: "plan-pro",
  status: "pending",
  startsAt: null,
  endsAt: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  createdAt: ISO,
  updatedAt: ISO,
};

const SUB_ACTIVE_PRO: CustomerSubscription = {
  ...SUB_PENDING,
  id: "sub-2",
  status: "active",
  startsAt: ISO,
  currentPeriodStart: ISO,
  currentPeriodEnd: "2026-09-01T09:00:00.000Z",
};

const KEY_ACTIVE: CustomerApiKey = {
  id: "key-1",
  name: "Production server",
  keyPrefix: "eeh_live_ab12",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: ISO,
  updatedAt: ISO,
};

const PAYMENT_METHOD: CustomerPaymentMethod = {
  id: "pm-1",
  bankName: "Commercial Bank of Ethiopia",
  accountName: "EthioExchangeHub PLC",
  accountNumber: "1000123456789",
  branchName: "Lebu",
  instructions: null,
};

const USAGE_OK: CustomerUsage = {
  subscription: {
    subscriptionId: "sub-9",
    status: "active",
    planName: "Pro",
    planSlug: "pro",
    monthlyRequestLimit: 100000,
    requestsPerMinute: 60,
    currentPeriodStart: ISO,
    currentPeriodEnd: "2026-09-01T09:00:00.000Z",
  },
  monthlyLimit: 100000,
  requestsUsed: 40000,
  requestsRemaining: 60000,
  keys: [],
};

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
});

describe("CustomerApiKeysPage - one-time secret handling", () => {
  it("shows the full secret exactly once after creation and hides it when dismissed", async () => {
    const SECRET = "eeh_live_abc123secretvalue";
    mocks.fetchApiKeys.mockResolvedValue([]);
    mocks.createApiKey.mockResolvedValue({
      ...KEY_ACTIVE,
      key: SECRET,
    });

    renderPage(<CustomerApiKeysPage />);
    await screen.findByText("Your API keys");

    fireEvent.change(screen.getByLabelText(/key name/i), {
      target: { value: "CI pipeline" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(/save your api key now/i);
    expect(banner).toHaveTextContent(SECRET);
    expect(screen.getByText(SECRET).tagName).toBe("CODE");
    expect(mocks.toastSuccess).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /i've saved it/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument();
  });

  it("toasts the backend error without revealing any secret when creation fails", async () => {
    mocks.fetchApiKeys.mockResolvedValue([]);
    mocks.createApiKey.mockRejectedValue(new Error("Maximum number of API keys reached."));

    renderPage(<CustomerApiKeysPage />);
    await screen.findByText("Your API keys");

    fireEvent.change(screen.getByLabelText(/key name/i), { target: { value: "Extra" } });
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Maximum number of API keys reached.");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("CustomerPlansPage - selection leads to pending payment state", () => {
  it("calls the mutation for a paid plan and points the customer to payments", async () => {
    mocks.fetchPlans.mockResolvedValue([PLAN_FREE, PLAN_PRO]);
    mocks.fetchSubscription.mockResolvedValue(null);
    mocks.createSubscription.mockResolvedValue(SUB_PENDING);

    renderPage(<CustomerPlansPage />);
    await screen.findByText("Pro");

    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    await waitFor(() => {
      expect(mocks.createSubscription).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createSubscription.mock.calls[0][0]).toBe("plan-pro");
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      expect.stringContaining("Complete the bank transfer"),
    );
  });

  it("hides subscribe buttons while a subscription awaits payment", async () => {
    mocks.fetchPlans.mockResolvedValue([PLAN_FREE, PLAN_PRO]);
    mocks.fetchSubscription.mockResolvedValue(SUB_PENDING);

    renderPage(<CustomerPlansPage />);
    await screen.findByText("Pro");

    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start for free/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/awaiting verification/i)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
  });

  it("enables UPGRADES from an active plan and pins the current one", async () => {
    mocks.fetchPlans.mockResolvedValue([PLAN_FREE, PLAN_PRO]);
    mocks.fetchSubscription.mockResolvedValue({
      ...SUB_PENDING,
      planId: PLAN_FREE.id,
      status: "active",
    });

    renderPage(<CustomerPlansPage />);
    await screen.findByText("Pro");

    const upgrade = screen.getByRole("button", { name: /upgrade/i });
    expect(upgrade).toBeEnabled();

    // The active Free plan is pinned; selecting it again is impossible.
    const currentButtons = screen.getAllByRole("button", { name: "Current plan" });
    expect(currentButtons).toHaveLength(1);
    expect(currentButtons[0]).toBeDisabled();
  });

  it("keeps downgrade buttons disabled with an explanation", async () => {
    mocks.fetchPlans.mockResolvedValue([PLAN_FREE, PLAN_PRO]);
    mocks.fetchSubscription.mockResolvedValue(SUB_ACTIVE_PRO);

    renderPage(<CustomerPlansPage />);
    await screen.findByText("Pro");

    // The only other plan (Free) is a downgrade → disabled with a note.
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeDisabled();
    expect(screen.getAllByText(/downgrades aren't supported yet/i)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Current plan" })).toBeDisabled();
  });
});

describe("CustomerPaymentsPage - reference submission", () => {
  function setup() {
    mocks.fetchSubscription.mockResolvedValue(SUB_PENDING);
    mocks.fetchPaymentMethods.mockResolvedValue([PAYMENT_METHOD]);
    mocks.fetchPayments.mockResolvedValue([]);
    mocks.submitPayment.mockResolvedValue({ id: "pay-1" });
  }

  it("disables submission until the reference reaches four characters", async () => {
    setup();
    renderPage(<CustomerPaymentsPage />);
    await screen.findByText(/submit your bank transaction reference/i);

    const button = screen.getByRole("button", { name: /submit reference/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/bank transaction \/ reference number/i), {
      target: { value: "ab" },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/bank transaction \/ reference number/i), {
      target: { value: "FT2611ABCD" },
    });
    expect(button).toBeEnabled();
  });

  it("submits the trimmed reference against the pending subscription and clears the field", async () => {
    setup();
    renderPage(<CustomerPaymentsPage />);
    await screen.findByText(/submit your bank transaction reference/i);

    fireEvent.change(screen.getByLabelText(/bank transaction \/ reference number/i), {
      target: { value: "  FT2611ABCD  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit reference/i }));

    await waitFor(() => {
      expect(mocks.submitPayment).toHaveBeenCalledTimes(1);
    });
    expect(mocks.submitPayment.mock.calls[0][0]).toEqual({
      subscriptionId: "sub-1",
      customerTransactionRef: "FT2611ABCD",
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("awaiting verification"),
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/bank transaction \/ reference number/i)).toHaveValue("");
    });
  });

  it("surfaces the bank account details customers transfer to", async () => {
    setup();
    renderPage(<CustomerPaymentsPage />);

    expect(await screen.findByText("Commercial Bank of Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("EthioExchangeHub PLC")).toBeInTheDocument();
    expect(screen.getByText("1000123456789")).toBeInTheDocument();
  });
});

describe("CustomerUsagePage - quota display states", () => {
  it("renders progress toward a partially consumed quota", async () => {
    mocks.fetchUsage.mockResolvedValue(USAGE_OK);

    renderPage(<CustomerUsagePage />);

    const bar = await screen.findByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText(/^40%/)).toBeInTheDocument();
  });

  it("flags the quota as exhausted with upgrade guidance when nothing remains", async () => {
    mocks.fetchUsage.mockResolvedValue({
      ...USAGE_OK,
      requestsUsed: 100000,
      requestsRemaining: 0,
    });

    renderPage(<CustomerUsagePage />);

    const bar = await screen.findByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");

    const note = await screen.findByText(/http 429/i);
    expect(note).toBeInTheDocument();
  });

  it("explains there is nothing to track before the first subscription", async () => {
    mocks.fetchUsage.mockResolvedValue({
      subscription: null,
      monthlyLimit: null,
      requestsUsed: 0,
      requestsRemaining: null,
      keys: [],
    });

    renderPage(<CustomerUsagePage />);

    expect(await screen.findByText(/no active subscription/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
