import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFeatured,
  deleteFeatured,
  fetchActiveFeatured,
  fetchAdminFeatured,
  updateFeatured,
} from "@/lib/api/featured";
import { featuredKeys } from "@/lib/query-keys";
import type { ActiveFeatured, FeaturedUpdate } from "@/types/featured";

/**
 * Featured-content hooks — every hook calls the real backend through the
 * matching function in `src/lib/api/featured.ts`. `useFeatured` returns null
 * when nothing qualifies, so the homepage simply renders no card.
 */

/** The single eligible campaign for the homepage (null when none). */
export function useFeatured() {
  return useQuery<ActiveFeatured | null>({
    queryKey: featuredKeys.active(),
    queryFn: fetchActiveFeatured,
    // The campaign rarely changes; a long stale time avoids hammering the API.
    staleTime: 5 * 60 * 1000,
  });
}

/** Every campaign (any state) for the admin console. */
export function useAdminFeatured() {
  return useQuery({
    queryKey: featuredKeys.adminList(),
    queryFn: fetchAdminFeatured,
  });
}

export function useCreateFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFeatured,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: featuredKeys.all });
    },
  });
}

export function useUpdateFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FeaturedUpdate }) =>
      updateFeatured(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: featuredKeys.all });
    },
  });
}

export function useDeleteFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFeatured,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: featuredKeys.all });
    },
  });
}
