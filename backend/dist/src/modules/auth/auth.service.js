import argon2 from "argon2";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { regenerateSession } from "../../utils/session.js";
async function establishLogin(request, user) {
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
export async function registerUser(request, input) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing)
        throw new HttpError(409, "EMAIL_ALREADY_EXISTS", "An account already exists for this email.");
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await prisma.user.create({
        data: { name: input.name, email: input.email, passwordHash, role: "LEARNER" },
        select: { id: true, name: true, email: true, role: true },
    });
    await establishLogin(request, user);
    return user;
}
export async function loginUser(request, input) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
        throw new HttpError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
    }
    const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    await establishLogin(request, sessionUser);
    return sessionUser;
}
