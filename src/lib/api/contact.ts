import { apiClient } from "./client";
import type { ContactMessagePayload, ContactMessageResult } from "@/types/contact";

/** Submits a contact message to `POST /contact/messages` and returns the stored row. */
export async function submitContactMessage(
  payload: ContactMessagePayload,
): Promise<ContactMessageResult> {
  const { data } = await apiClient.post<ContactMessageResult>("/contact/messages", payload);
  return data;
}
