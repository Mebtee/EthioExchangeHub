import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders its children", () => {
    render(<StatusBadge tone="success">healthy</StatusBadge>);
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("applies the tone class for the given status", () => {
    render(<StatusBadge tone="danger">failed</StatusBadge>);
    const badge = screen.getByText("failed");
    expect(badge.className).toContain("bg-destructive/10");
  });
});
