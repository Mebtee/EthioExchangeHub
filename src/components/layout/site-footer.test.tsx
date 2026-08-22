import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

function renderFooter() {
  return render(
    <MemoryRouter initialEntries={["/en/rankings"]}>
      <SiteFooter />
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
});
