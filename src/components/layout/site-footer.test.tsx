import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

function renderFooter(initialEntry = "/en/rankings") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      {/* Real :locale route so useLocale() resolves the segment like in the app */}
      <Routes>
        <Route path="/:locale/*" element={<SiteFooter />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SiteFooter API Access CTA", () => {
  it("points the commercial entry point at customer registration", () => {
    renderFooter();

    // The register page forwards signed-in visitors to their area by role,
    // so this single static target serves customers, admins, and guests.
    expect(screen.getByRole("link", { name: "API Access" })).toHaveAttribute(
      "href",
      "/en/customer/register",
    );
  });

  it("localizes the CTA target for non-default locales", () => {
    renderFooter("/am/rankings");

    expect(screen.getByRole("link", { name: "API Access" })).toHaveAttribute(
      "href",
      "/am/customer/register",
    );
  });
});
