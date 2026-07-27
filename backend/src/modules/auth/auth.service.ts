import argon2 from "argon2";
import type { Request } from "express";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { regenerateSession } from "../../utils/session.js";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "LEARNER" | "ADMIN";
}

async function establishLogin(request: Request, user: SessionUser): Promise<void> {
  const visitorId = request.session.visitorId;
  await regenerateSession(request);
  request.session.user = user;

  if (visitorId) {
    await prisma.assessment.updateMany({
      where: { sessionId: visitorId, userId: null },
      data: { userId: user.id },
    });
  }
}

export async function registerUser(
  request: Request,
  input: { name: string; email: string; password: string },
): Promise<SessionUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "An account already exists for this email.");

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role: "LEARNER" },
    select: { id: true, name: true, email: true, role: true },
  });
  await establishLogin(request, user);
  return user;
}

export async function loginUser(
  request: Request,
  input: { email: string; password: string },
): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
  }

  const sessionUser: SessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  await establishLogin(request, sessionUser);
  return sessionUser;
}
