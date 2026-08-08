import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ContactPage from "./contact";

import {
  validateContactForm,
  type ContactFormState,
  type ContactFormErrors,
} from "@/lib/contact-form";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sonner")>();
  return { ...actual, toast: { success: mocks.toastSuccess, error: mocks.toastError } };
});

vi.mock("@/lib/api/contact", () => ({
  submitContactMessage: mocks.submit,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  );
}

function fillForm(overrides: Partial<ContactFormState> = {}) {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: overrides.name ?? "Abebe Kebede" },
  });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: overrides.email ?? "abebe@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/^subject/i), {
    target: { value: overrides.subject ?? "Question about rates" },
  });
  fireEvent.change(screen.getByLabelText(/^message/i), {
    target: {
      value: overrides.message ?? "Hello, this message is long enough to be valid.",
    },
  });
}

const VALID_PAYLOAD = {
  name: "Abebe Kebede",
  email: "abebe@example.com",
  subject: "Question about rates",
  message: "Hello, this message is long enough to be valid.",
};

describe("ContactPage", () => {
  beforeEach(() => {
    mocks.submit.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.submit.mockResolvedValue({
      id: "msg-1",
      ...VALID_PAYLOAD,
      created_at: "2026-08-08T10:00:00.000Z",
    });
  });

  it("renders the contact information with working links", () => {
    renderPage();

    const emailLink = screen.getByRole("link", { name: "ethioexchanges@gmail.com" });
    expect(emailLink).toHaveAttribute("href", "mailto:ethioexchanges@gmail.com");

    const phoneLink = screen.getByRole("link", { name: "+251 929843572" });
    expect(phoneLink).toHaveAttribute("href", "tel:+251929843572");

    expect(screen.getByText(/Lebu KAM Building, 2nd Floor/i)).toBeInTheDocument();
  });

  it("shows per-field errors when submitting an empty form", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(screen.getByText("Name must be at least 2 characters.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Subject is required.")).toBeInTheDocument();
    expect(screen.getByText("Message must be at least 10 characters.")).toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("rejects an invalid email address", () => {
    renderPage();
    fillForm({ email: "not-an-email" });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("submits trimmed values, clears the form, and toasts success", async () => {
    renderPage();
    fillForm({
      name: "  Abebe Kebede  ",
      email: "  abebe@example.com  ",
      subject: "  Question about rates  ",
      message: "  Hello, this message is long enough to be valid.  ",
    });

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    expect(mocks.submit).toHaveBeenCalledWith(VALID_PAYLOAD);
    await screen.findByText("Get in Touch");

    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/full name/i)).toHaveValue("");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("");
  });

  it("keeps values and toasts the error when submission fails", async () => {
    mocks.submit.mockRejectedValueOnce(new Error("The server encountered an error."));
    renderPage();
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("The server encountered an error."),
    );
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Abebe Kebede");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("abebe@example.com");
  });

  it("disables the form while a submission is pending", async () => {
    let resolveSubmit!: (value: { id: string }) => void;
    mocks.submit.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    renderPage();
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));

    const button = screen.getByRole("button", { name: /Sending.../ });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/full name/i)).toBeDisabled();

    resolveSubmit({ id: "msg-2" });
    await screen.findByText("Get in Touch");
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
  });
});

describe("validateContactForm", () => {
  const valid: ContactFormState = {
    name: "Abebe Kebede",
    email: "abebe@example.com",
    subject: "Question",
    message: "This message is long enough.",
  };

  it("accepts a valid form", () => {
    expect(validateContactForm(valid)).toEqual({});
  });

  it("rejects a too-short name", () => {
    const errors: ContactFormErrors = validateContactForm({ ...valid, name: "A" });
    expect(errors.name).toBeDefined();
  });

  it("rejects a missing or malformed email", () => {
    expect(validateContactForm({ ...valid, email: "" }).email).toBeDefined();
    expect(validateContactForm({ ...valid, email: "nope" }).email).toBeDefined();
  });

  it("rejects an empty subject", () => {
    expect(validateContactForm({ ...valid, subject: "  " }).subject).toBeDefined();
  });

  it("rejects a too-short message", () => {
    expect(validateContactForm({ ...valid, message: "Too short" }).message).toBeDefined();
  });

  it("ignores surrounding whitespace when validating length", () => {
    expect(validateContactForm({ ...valid, name: "  Abebe Kebede  " })).toEqual({});
  });
});
