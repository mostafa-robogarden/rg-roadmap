import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export function recordEvent(input: {
  userId?: string;
  sessionId: string;
  eventName: string;
  properties?: Record<string, unknown>;
}) {
  return prisma.analyticsEvent.create({
    data: {
      userId: input.userId,
      sessionId: input.sessionId,
      eventName: input.eventName,
      properties: input.properties as Prisma.InputJsonValue | undefined,
    },
  });
}
