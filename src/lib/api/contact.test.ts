import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { submitContactMessage } from "./contact";

vi.mock("./client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);

const payload = {
  name: "Abebe Kebede",
  email: "abebe@example.com",
  subject: "Question about historical rates",
  message: "Hello, how far back does the historical rate data go?",
};

const stored = {
  id: "msg-1",
  ...payload,
  created_at: "2026-08-08T10:00:00.000Z",
};

describe("submitContactMessage", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("posts the payload to /contact/messages", async () => {
    mockPost.mockResolvedValue({ data: stored });

    await submitContactMessage(payload);

    expect(mockPost).toHaveBeenCalledWith("/contact/messages", payload);
  });

  it("returns the unwrapped data from the response", async () => {
    mockPost.mockResolvedValue({ data: stored });

    await expect(submitContactMessage(payload)).resolves.toEqual(stored);
  });

  it("propagates API errors", async () => {
    mockPost.mockRejectedValue(new Error("Invalid request body"));

    await expect(submitContactMessage(payload)).rejects.toThrow("Invalid request body");
  });
});
