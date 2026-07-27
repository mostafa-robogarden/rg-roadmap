import { prisma } from "../lib/prisma.js";
export function recordEvent(input) {
    return prisma.analyticsEvent.create({
        data: {
            userId: input.userId,
            sessionId: input.sessionId,
            eventName: input.eventName,
            properties: input.properties,
        },
    });
}
