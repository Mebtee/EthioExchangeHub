import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FeaturedCard } from "./featured-card";

import type { ActiveFeatured } from "@/types/featured";

const { recordFeaturedClick } = vi.hoisted(() => ({
  recordFeaturedClick: vi.fn(async () => undefined),
}));

vi.mock("@/lib/api/featured", () => ({
  recordFeaturedClick,
}));

function item(overrides: Partial<ActiveFeatured> = {}): ActiveFeatured {
  return {
    id: "campaign-1",
    title: "Awash Bank — Back-to-School Offer",
    description: "Student account promotions for the new term.",
    image_url: "https://cdn.example.com/awash-school.jpg",
    image_alt: "Awash Bank back-to-school promotion",
    advertiser_name: "Awash Bank",
    badge_text: "SPONSORED",
    cta_text: "View Offer",
    destination_url: "/offers/awash-school",
    destination_type: "internal",
    features: [
      {
        icon: "graduation-cap",
        title: "Zero balance",
        description: "No minimum balance required.",
      },
    ],
    ...overrides,
  };
}

function renderCard(card: ActiveFeatured) {
  return render(
    <MemoryRouter>
      <FeaturedCard item={card} />
    </MemoryRouter>,
  );
}

describe("FeaturedCard", () => {
  beforeEach(() => {
    recordFeaturedClick.mockClear();
  });

  it("renders the campaign content with the badge on the pill and image", () => {
    renderCard(item());

    expect(screen.getByText("Awash Bank — Back-to-School Offer")).toBeInTheDocument();
    expect(screen.getAllByText("SPONSORED")).toHaveLength(2);
    expect(screen.getByText("Awash Bank")).toBeInTheDocument();
    expect(screen.getByText("Student account promotions for the new term.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Offer" })).toBeInTheDocument();
  });

  it("passes the backend-provided image_url straight through to the <img> src", () => {
    const backendImageUrl = "https://cdn.example.com/campaigns/awash-school-hero.jpg";
    renderCard(item({ image_url: backendImageUrl }));

    const image = screen.getByRole("img", { name: "Awash Bank back-to-school promotion" });
    expect(image).toHaveAttribute("src", backendImageUrl);
  });

  it("renders an internal destination as a client-side route link and records the click", () => {
    renderCard(item());

    const link = screen.getByRole("link", { name: "View Offer" });
    expect(link).toHaveAttribute("href", "/offers/awash-school");

    fireEvent.click(link);

    expect(recordFeaturedClick).toHaveBeenCalledWith("campaign-1", "internal");
  });

  it("renders an external destination as a safe target-blank link and records the click", () => {
    renderCard(
      item({
        destination_url: "https://example.com/limited",
        destination_type: "external",
        cta_text: "Visit",
      }),
    );

    const link = screen.getByRole("link", { name: "Visit" });
    expect(link).toHaveAttribute("href", "https://example.com/limited");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.click(link);

    expect(recordFeaturedClick).toHaveBeenCalledWith("campaign-1", "external");
  });

  it("does not block navigation when the click-tracking request fails", () => {
    recordFeaturedClick.mockRejectedValueOnce(new Error("network down"));
    renderCard(item());

    const link = screen.getByRole("link", { name: "View Offer" });
    fireEvent.click(link);

    expect(recordFeaturedClick).toHaveBeenCalledTimes(1);
  });

  it("defaults the badge and CTA labels when they are blank", () => {
    renderCard(
      item({
        badge_text: "",
        cta_text: "",
        advertiser_name: null,
        description: null,
        features: [],
      }),
    );

    expect(screen.getByRole("link", { name: "Learn More" })).toBeInTheDocument();
  });
});
