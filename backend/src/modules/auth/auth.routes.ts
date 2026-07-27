import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { prisma } from "../../lib/prisma.js";
import { destroySession } from "../../utils/session.js";
import { captureEvent } from "../../services/analytics.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { loginUser, registerUser } from "./auth.service.js";

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 40, standardHeaders: "draft-8", legacyHeaders: false });

authRouter.get("/csrf", (request, response) => {
  response.json({ csrfToken: request.session.csrfToken });
});

authRouter.get(
  "/me",
  asyncHandler(async (request, response) => {
    if (!request.session.user) {
      response.json({ user: null });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: request.session.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    response.json({ user });
  }),
);

authRouter.post(
  "/register",
  limiter,
  asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const user = await registerUser(request, input);
    await captureEvent({ userId: user.id, sessionId: request.session.visitorId!, eventName: "ACCOUNT_REGISTERED" });
    response.status(201).json({ user });
  }),
);

authRouter.post(
  "/login",
  limiter,
  asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await loginUser(request, input);
    await captureEvent({ userId: user.id, sessionId: request.session.visitorId!, eventName: "USER_LOGGED_IN" });
    response.json({ user });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (request, response) => {
    await destroySession(request);
    response.clearCookie("rg_roadmap.sid", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    response.clearCookie("XSRF-TOKEN", { path: "/" });
    response.status(204).send();
  }),
);
