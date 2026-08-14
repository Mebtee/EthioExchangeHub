import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCreateFeatured,
  useDeleteFeatured,
  useFeatured,
  useUpdateFeatured,
} from "./use-featured";
import type { ActiveFeatured, AdminFeaturedItem, FeaturedPayload } from "@/types/featured";

vi.mock("@/lib/api/featured", () => ({
  fetchActiveFeatured: vi.fn(),
  fetchAdminFeatured: vi.fn(),
  createFeatured: vi.fn(),
  updateFeatured: vi.fn(),
  deleteFeatured: vi.fn(),
}));

import {
  createFeatured,
  deleteFeatured,
  fetchActiveFeatured,
  updateFeatured,
} from "@/lib/api/featured";

function makeActive(id: string): ActiveFeatured {
  return {
    id,
    title: `Campaign ${id}`,
    description: null,
    image_url: "https://cdn.example.com/x.jpg",
    image_alt: null,
    advertiser_name: null,
    badge_text: "FEATURED",
    cta_text: "Learn More",
    destination_url: "/",
    destination_type: "internal",
    features: [],
  };
}

function createTestClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("featured mutation hooks invalidate the shared featured cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refetches the mounted homepage campaign after a create", async () => {
    vi.mocked(fetchActiveFeatured)
      .mockResolvedValueOnce(makeActive("old"))
      .mockResolvedValue(makeActive("new"));
    vi.mocked(createFeatured).mockResolvedValue(makeActive("new") as unknown as AdminFeaturedItem);
    const wrapper = wrapperFor(createTestClient());

    const featured = renderHook(() => useFeatured(), { wrapper });
    await waitFor(() => expect(featured.result.current.data?.id).toBe("old"));

    const create = renderHook(() => useCreateFeatured(), { wrapper });
    const payload: FeaturedPayload = {
      title: "New campaign",
      image_url: "https://cdn.example.com/x.jpg",
      destination_url: "/",
      destination_type: "internal",
    };
    await act(async () => {
      await create.result.current.mutateAsync(payload);
    });

    expect(fetchActiveFeatured).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(featured.result.current.data?.id).toBe("new"));
  });

  it("refetches the mounted homepage campaign after an update", async () => {
    vi.mocked(fetchActiveFeatured)
      .mockResolvedValueOnce(makeActive("old"))
      .mockResolvedValue(makeActive("updated"));
    vi.mocked(updateFeatured).mockResolvedValue(
      makeActive("updated") as unknown as AdminFeaturedItem,
    );
    const wrapper = wrapperFor(createTestClient());

    const featured = renderHook(() => useFeatured(), { wrapper });
    await waitFor(() => expect(featured.result.current.data?.id).toBe("old"));

    const update = renderHook(() => useUpdateFeatured(), { wrapper });
    await act(async () => {
      await update.result.current.mutateAsync({ id: "old", payload: { is_active: false } });
    });

    expect(fetchActiveFeatured).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(featured.result.current.data?.id).toBe("updated"));
  });

  it("refetches the mounted homepage campaign after a delete", async () => {
    vi.mocked(fetchActiveFeatured).mockResolvedValueOnce(makeActive("old")).mockResolvedValue(null);
    vi.mocked(deleteFeatured).mockResolvedValue(undefined);
    const wrapper = wrapperFor(createTestClient());

    const featured = renderHook(() => useFeatured(), { wrapper });
    await waitFor(() => expect(featured.result.current.data?.id).toBe("old"));

    const remove = renderHook(() => useDeleteFeatured(), { wrapper });
    await act(async () => {
      await remove.result.current.mutateAsync("old");
    });

    await waitFor(() => expect(featured.result.current.data).toBeNull());
  });
});
