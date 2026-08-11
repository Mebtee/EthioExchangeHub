import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { FeaturedContentController } from "@/controllers/FeaturedContentController";
import { FeaturedContentClicksRepository } from "@/repositories/FeaturedContentClicksRepository";
import { FeaturedContentRepository } from "@/repositories/FeaturedContentRepository";
import { FeaturedContentServiceImpl } from "@/services/FeaturedContentService";
import type { Database } from "@/types/database";

import { featuredContentFixture } from "../../fixtures/featured-content";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller over real services + repositories on a seeded client. */
function makeController() {
  const client = createFakeSupabaseClient({
    featured_content: [featuredContentFixture()],
    featured_content_clicks: [],
  });
  const service = new FeaturedContentServiceImpl(
    new FeaturedContentRepository(client as unknown as SupabaseClient<Database>),
    new FeaturedContentClicksRepository(client as unknown as SupabaseClient<Database>),
  );
  const controller = new FeaturedContentController(service);
  return { service, controller };
}

/** Await the microtask queue so asyncHandler's promise settles. */
const flush = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("FeaturedContentController.getActive", () => {
  it("returns the active campaign in the success envelope", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getActive(createMockRequest(), res, createMockNext());
    await flush();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Featured content retrieved.",
      data: expect.objectContaining({
        id: "featured-1",
        title: "Awash Bank — Back-to-School Offer",
      }),
    });
  });

  it("returns data null when nothing is eligible", async () => {
    const client = createFakeSupabaseClient({ featured_content: [], featured_content_clicks: [] });
    const service = new FeaturedContentServiceImpl(
      new FeaturedContentRepository(client as unknown as SupabaseClient<Database>),
      new FeaturedContentClicksRepository(client as unknown as SupabaseClient<Database>),
    );
    const controller = new FeaturedContentController(service);
    const res = createMockResponse();

    controller.getActive(createMockRequest(), res, createMockNext());
    await flush();

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Featured content retrieved.",
      data: null,
    });
  });
});

describe("FeaturedContentController.recordClick", () => {
  it("passes the id and destination type through", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.recordClick(
      createMockRequest({
        params: { id: "featured-1" },
        body: { destination_type: "external" },
      }),
      res,
      createMockNext(),
    );
    await flush();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Click recorded.",
      data: null,
    });
  });

  it("forwards errors to next", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.recordClick(
      createMockRequest({ params: { id: "missing" }, body: {} }),
      createMockResponse(),
      next,
    );
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("FeaturedContentController.list", () => {
  it("returns every campaign with click counts", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.list(createMockRequest(), res, createMockNext());
    await flush();

    const payload = res.json.mock.calls[0]![0] as {
      data: Array<{ id: string; click_count: number }>;
    };
    expect(payload.data).toEqual([expect.objectContaining({ id: "featured-1", click_count: 0 })]);
  });
});

describe("FeaturedContentController.getOne", () => {
  it("returns the requested campaign", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getOne(createMockRequest({ params: { id: "featured-1" } }), res, createMockNext());
    await flush();

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Featured content retrieved.",
      data: expect.objectContaining({ id: "featured-1" }),
    });
  });

  it("forwards NotFoundError to next", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.getOne(createMockRequest({ params: { id: "missing" } }), createMockResponse(), next);
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("FeaturedContentController.create", () => {
  it("passes the body and session user through and responds 201", async () => {
    const { controller } = makeController();
    const res = createMockResponse();
    const body = {
      title: "New campaign",
      image_url: "https://cdn.example.com/new.jpg",
      destination_url: "/offers/new",
      destination_type: "internal",
    };

    controller.create(
      createMockRequest({
        body,
        user: { id: "user-1", email: "admin@example.com", role: "admin" },
      }),
      res,
      createMockNext(),
    );
    await flush();

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0]![0] as {
      data: { title: string; created_by: string | null };
    };
    expect(payload).toMatchObject({ success: true, message: "Featured content created." });
    expect(payload.data.title).toBe("New campaign");
    expect(payload.data.created_by).toBe("user-1");
  });
});

describe("FeaturedContentController.update", () => {
  it("passes id + body through and responds 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.update(
      createMockRequest({ params: { id: "featured-1" }, body: { title: "Updated" } }),
      res,
      createMockNext(),
    );
    await flush();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Featured content updated.",
      data: expect.objectContaining({ id: "featured-1", title: "Updated" }),
    });
  });

  it("forwards NotFoundError to next", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.update(
      createMockRequest({ params: { id: "missing" }, body: { title: "Updated" } }),
      createMockResponse(),
      next,
    );
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("FeaturedContentController.delete", () => {
  it("passes the id through and responds 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.delete(createMockRequest({ params: { id: "featured-1" } }), res, createMockNext());
    await flush();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Featured content deleted.",
      data: null,
    });
  });
});
