import { apiClient } from "./client";
import type {
  ActiveFeatured,
  AdminFeaturedItem,
  FeaturedDestinationType,
  FeaturedPayload,
  FeaturedUpdate,
} from "@/types/featured";

/**
 * Featured-content API service.
 *
 * Public surface (`fetchActiveFeatured`, `recordFeaturedClick`) is unauthenticated;
 * the admin surface is mounted behind the bearer-token admin routes. Every
 * function talks to the real backend — nothing is invented client-side.
 */

/** The single currently-eligible campaign, or null when nothing qualifies. */
export async function fetchActiveFeatured(): Promise<ActiveFeatured | null> {
  const { data } = await apiClient.get<ActiveFeatured | null>("/featured");
  return data;
}

/**
 * Appends an anonymous click record (campaign id + destination type only).
 * Fire-and-forget analytics: callers MUST ignore failures so a tracking
 * hiccup never blocks navigation.
 */
export async function recordFeaturedClick(
  id: string,
  destinationType: FeaturedDestinationType,
): Promise<void> {
  await apiClient.post(`/featured/${id}/click`, { destination_type: destinationType });
}

/** Every campaign (any state) with its aggregate click count. */
export async function fetchAdminFeatured(): Promise<AdminFeaturedItem[]> {
  const { data } = await apiClient.get<AdminFeaturedItem[]>("/admin/featured");
  return data;
}

export async function createFeatured(payload: FeaturedPayload): Promise<AdminFeaturedItem> {
  const { data } = await apiClient.post<AdminFeaturedItem>("/admin/featured", payload);
  return data;
}

export async function updateFeatured(
  id: string,
  payload: FeaturedUpdate,
): Promise<AdminFeaturedItem> {
  const { data } = await apiClient.patch<AdminFeaturedItem>(`/admin/featured/${id}`, payload);
  return data;
}

export async function deleteFeatured(id: string): Promise<void> {
  await apiClient.delete(`/admin/featured/${id}`);
}
