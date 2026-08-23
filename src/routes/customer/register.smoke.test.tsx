import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "@/app/App";
import { Providers } from "@/app/providers";

/**
 * Full-stack smoke render (real providers, i18n, react-query, auth context,
 * router) — no mocks. Reproduces the production entry point of the public
 * "API Access" CTA: a guest directly loading the customer registration route.
 * Guards against the class of production-only crashes where a route renders
 * in the real provider stack but never in unit-level tests.
 */
describe("smoke: guest opens the customer registration route", () => {
  afterEach(cleanup);

  it("renders the registration form at /en/customer/register without crashing", async () => {
    window.history.pushState({}, "", "/en/customer/register");

    render(
      <Providers>
        <App />
      </Providers>,
    );

    expect(await screen.findByText("Create your developer account")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders localized content at /am/customer/register without crashing", async () => {
    window.history.pushState({}, "", "/am/customer/register");

    render(
      <Providers>
        <App />
      </Providers>,
    );

    // LocaleLayout syncs i18next to the :locale segment on mount.
    expect(await screen.findByText("የዴቬሎፐር መለያ ይፍጠሩ")).toBeInTheDocument();
    expect(screen.getByLabelText("ኢሜይል")).toBeInTheDocument();
  });
});
