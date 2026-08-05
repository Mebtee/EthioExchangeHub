import { describe, expect, it } from "vitest";

import { AuthController } from "@/controllers/AuthController";
import { AuthenticationError } from "@/lib/errors";

import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockAuthService } from "../../mocks/services";

function makeController() {
  const service = createMockAuthService();
  const controller = new AuthController(service);
  return { service, controller };
}

const session = {
  tokens: { accessToken: "at", refreshToken: "rt" },
  user: { id: "user-1", name: "Root Admin", email: "a@b.dev", role: "super_admin" },
};

describe("AuthController.login", () => {
  it("passes credentials through and returns the session envelope", async () => {
    const { service, controller } = makeController();
    service.login.mockResolvedValue(session);
    const res = createMockResponse();

    controller.login(
      createMockRequest({ body: { email: "a@b.dev", password: "secret" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.login).toHaveBeenCalledWith("a@b.dev", "secret");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Login successful.",
      data: session,
    });
  });

  it("forwards authentication failures to next", async () => {
    const { service, controller } = makeController();
    const error = new AuthenticationError("Invalid email or password.");
    service.login.mockRejectedValue(error);
    const next = createMockNext();

    controller.login(createMockRequest({ body: {} }), createMockResponse(), next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("AuthController.refresh", () => {
  it("passes the refresh token through and returns the token pair", async () => {
    const { service, controller } = makeController();
    service.refresh.mockResolvedValue(session.tokens);
    const res = createMockResponse();

    controller.refresh(createMockRequest({ body: { refreshToken: "rt" } }), res, createMockNext());
    await flushPromises();

    expect(service.refresh).toHaveBeenCalledWith("rt");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Tokens refreshed.",
      data: session.tokens,
    });
  });
});

describe("AuthController.logout", () => {
  it("answers a stateless success", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.logout(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Logged out.",
      data: null,
    });
  });
});

describe("AuthController.me", () => {
  it("resolves the authenticated user attached by requireAuth", async () => {
    const { service, controller } = makeController();
    service.me.mockResolvedValue(session.user);
    const res = createMockResponse();
    const req = createMockRequest() as { user?: { id: string } };
    req.user = { id: "user-1" };

    controller.me(req, res, createMockNext());
    await flushPromises();

    expect(service.me).toHaveBeenCalledWith("user-1");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Authenticated user retrieved.",
      data: session.user,
    });
  });

  it("throws when no user is attached (route misconfiguration)", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.me(createMockRequest(), createMockResponse(), next);
    await flushPromises();

    expect(next.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthController.forgotPassword", () => {
  it("never reveals whether the email exists (unknown → sent:true only)", async () => {
    const { service, controller } = makeController();
    service.forgotPassword.mockResolvedValue(null);
    const res = createMockResponse();

    controller.forgotPassword(
      createMockRequest({ body: { email: "nobody@b.dev" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { sent: true },
      }),
    );
  });

  it("includes the dev token only outside production (test env)", async () => {
    const { service, controller } = makeController();
    service.forgotPassword.mockResolvedValue("reset-token-123");
    const res = createMockResponse();

    controller.forgotPassword(
      createMockRequest({ body: { email: "a@b.dev" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sent: true, devToken: "reset-token-123" } }),
    );
  });
});

describe("AuthController.resetPassword", () => {
  it("passes token + password through and answers success", async () => {
    const { service, controller } = makeController();
    service.resetPassword.mockResolvedValue(undefined);
    const res = createMockResponse();

    controller.resetPassword(
      createMockRequest({ body: { token: "t", password: "new-secret" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.resetPassword).toHaveBeenCalledWith("t", "new-secret");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Password updated.",
      data: null,
    });
  });
});
