import { describe, expect, it } from "vitest";

import { ContactController } from "@/controllers/ContactController";
import { ContactServiceImpl } from "@/services/ContactService";
import type { ContactMessageRow } from "@/types/database";

import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../helpers/http";

/** Builds the real controller over a real service with a stubbed repository. */
function makeController() {
  const repo = {
    createMessage: (input: {
      name: string;
      email: string;
      subject: string;
      message: string;
      created_at: string;
    }): Promise<ContactMessageRow> =>
      Promise.resolve({
        id: "contact-1",
        ...input,
        created_at: input.created_at,
      }),
  };
  const service = new ContactServiceImpl(repo as never);
  const controller = new ContactController(service);
  return { controller };
}

describe("ContactController.submitMessage", () => {
  it("passes the body through and responds 201 with the stored row", async () => {
    const { controller } = makeController();
    const body = {
      name: "Abebe Kebede",
      email: "abebe@example.com",
      subject: "Question",
      message: "Hello, this is a long enough message.",
    };
    const res = createMockResponse();

    controller.submitMessage(createMockRequest({ body }), res, createMockNext());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Message received.",
      data: expect.objectContaining({
        id: "contact-1",
        name: "Abebe Kebede",
        email: "abebe@example.com",
        subject: "Question",
      }),
    });
  });

  it("forwards service errors to next", async () => {
    const repo = {
      createMessage: (): Promise<ContactMessageRow> =>
        Promise.reject(new Error("database is down")),
    };
    const service = new ContactServiceImpl(repo as never);
    const controller = new ContactController(service);
    const next = createMockNext();

    controller.submitMessage(
      createMockRequest({
        body: {
          name: "Abebe Kebede",
          email: "abebe@example.com",
          subject: "Question",
          message: "Hello, this is a long enough message.",
        },
      }),
      createMockResponse(),
      next,
    );
    await flushPromises();

    expect(next).toHaveBeenCalledTimes(1);
    expect((next.mock.calls[0]?.[0] as Error).message).toBe("database is down");
  });
});
