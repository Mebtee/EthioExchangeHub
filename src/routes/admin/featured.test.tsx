import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminFeaturedPage from "./featured";

import type { AdminFeaturedItem, FeaturedPayload } from "@/types/featured";

const createFeatured = vi.fn(async (payload: FeaturedPayload) => {
  void payload;
});
const updateFeatured = vi.fn();
const deleteFeatured = vi.fn();

const items: AdminFeaturedItem[] = [
  {
    id: "campaign-1",
    title: "Awash Bank — Back-to-School Offer",
    description: "Student account promotions.",
    image_url: "https://cdn.example.com/awash-school.jpg",
    advertiser_name: "Awash Bank",
    badge_text: "SPONSORED",
    cta_text: "View Offer",
    destination_url: "/offers/awash-school",
    destination_type: "internal",
    image_alt: null,
    is_active: true,
    display_order: 0,
    start_at: null,
    end_at: null,
    created_by: null,
    feature_1_icon: "graduation-cap",
    feature_1_title: "Zero balance",
    feature_1_description: "No minimum balance required.",
    feature_2_icon: null,
    feature_2_title: null,
    feature_2_description: null,
    feature_3_icon: null,
    feature_3_title: null,
    feature_3_description: null,
    created_at: "2026-08-10T09:00:00.000Z",
    updated_at: "2026-08-10T09:00:00.000Z",
    click_count: 12,
  },
  {
    id: "campaign-2",
    title: "Limited-time offer",
    description: null,
    image_url: "https://cdn.example.com/limited.jpg",
    advertiser_name: null,
    badge_text: "PROMO",
    cta_text: "Visit",
    destination_url: "https://example.com/limited",
    destination_type: "external",
    image_alt: null,
    is_active: false,
    display_order: 5,
    start_at: "2026-09-01T08:00:00.000Z",
    end_at: "2026-09-10T18:00:00.000Z",
    created_by: null,
    feature_1_icon: null,
    feature_1_title: null,
    feature_1_description: null,
    feature_2_icon: null,
    feature_2_title: null,
    feature_2_description: null,
    feature_3_icon: null,
    feature_3_title: null,
    feature_3_description: null,
    created_at: "2026-08-09T09:00:00.000Z",
    updated_at: "2026-08-09T09:00:00.000Z",
    click_count: 3,
  },
];

vi.mock("@/hooks", () => ({
  useAdminFeatured: () => ({ data: items, isLoading: false, isError: false, error: null }),
  useCreateFeatured: () => ({
    isPending: false,
    mutateAsync: createFeatured,
  }),
  useUpdateFeatured: () => ({
    isPending: false,
    mutateAsync: updateFeatured,
  }),
  useDeleteFeatured: () => ({
    isPending: false,
    mutateAsync: deleteFeatured,
  }),
}));

function openAddDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Add campaign" }));
  return screen.getByRole("dialog");
}

function fillRequiredFields(dialog: HTMLElement, overrides: Record<string, string>) {
  fireEvent.change(within(dialog).getByLabelText("Title"), {
    target: { value: overrides.title ?? "New offer" },
  });
  fireEvent.change(within(dialog).getByLabelText("Image URL"), {
    target: { value: overrides.imageUrl ?? "https://cdn.example.com/new.jpg" },
  });
  fireEvent.change(within(dialog).getByLabelText("Destination URL"), {
    target: { value: overrides.destinationUrl ?? "/offers/new" },
  });
}

describe("AdminFeaturedPage", () => {
  beforeEach(() => {
    createFeatured.mockClear();
    updateFeatured.mockClear();
    deleteFeatured.mockClear();
  });

  it("renders every campaign with its status and click count", () => {
    render(<AdminFeaturedPage />);

    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent);

    expect(headers).toEqual(
      expect.arrayContaining([
        "Campaign",
        "Type",
        "Destination",
        "Status",
        "Schedule",
        "Order",
        "Clicks",
      ]),
    );

    expect(screen.getByText("Awash Bank — Back-to-School Offer")).toBeInTheDocument();
    expect(screen.getByText("Limited-time offer")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("rejects an internal destination that is not a route path", () => {
    render(<AdminFeaturedPage />);
    const dialog = openAddDialog();
    fillRequiredFields(dialog, { destinationUrl: "https://evil.com" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add campaign" }));

    expect(
      screen.getByText("Internal destinations must be a route path starting with /."),
    ).toBeInTheDocument();
    expect(createFeatured).not.toHaveBeenCalled();
  });

  it("rejects an external destination that is not an absolute http(s) URL", () => {
    render(<AdminFeaturedPage />);
    const dialog = openAddDialog();
    fillRequiredFields(dialog, { destinationUrl: "javascript:alert(1)" });
    fireEvent.change(within(dialog).getByLabelText("Type"), {
      target: { value: "external" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add campaign" }));

    expect(
      screen.getByText("External destinations must be a valid http:// or https:// URL."),
    ).toBeInTheDocument();
    expect(createFeatured).not.toHaveBeenCalled();
  });

  it("submits a valid campaign with the schedule converted to an ISO timestamp", () => {
    render(<AdminFeaturedPage />);
    const dialog = openAddDialog();
    fillRequiredFields(dialog, {});
    fireEvent.change(within(dialog).getByLabelText("Advertiser (optional)"), {
      target: { value: "Awash Bank" },
    });
    fireEvent.change(within(dialog).getByLabelText("Start (optional)"), {
      target: { value: "2026-08-20T10:00" },
    });
    fireEvent.change(within(dialog).getByLabelText("End (optional)"), {
      target: { value: "2026-08-25T10:00" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Add campaign" }));

    expect(createFeatured).toHaveBeenCalledTimes(1);
    const payload = createFeatured.mock.calls[0][0] as FeaturedPayload;
    expect(payload).toEqual(
      expect.objectContaining({
        title: "New offer",
        image_url: "https://cdn.example.com/new.jpg",
        destination_url: "/offers/new",
        destination_type: "internal",
        is_active: true,
        display_order: 0,
        advertiser_name: "Awash Bank",
      }),
    );
    expect(new Date(payload.start_at!).getTime()).toBe(new Date("2026-08-20T10:00").getTime());
    expect(new Date(payload.end_at!).getTime()).toBe(new Date("2026-08-25T10:00").getTime());
  });

  it("pre-fills the form when editing a campaign", () => {
    render(<AdminFeaturedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Awash Bank — Back-to-School Offer" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Awash Bank — Back-to-School Offer");
    expect(within(dialog).getByLabelText("Destination URL")).toHaveValue("/offers/awash-school");
    expect(within(dialog).getByLabelText("Badge text")).toHaveValue("SPONSORED");
    expect(within(dialog).getByLabelText("Type")).toHaveValue("internal");
  });

  it("deletes a campaign after confirmation", () => {
    render(<AdminFeaturedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Limited-time offer" }));

    const confirm = screen.getByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));

    expect(deleteFeatured).toHaveBeenCalledWith("campaign-2");
  });
});
