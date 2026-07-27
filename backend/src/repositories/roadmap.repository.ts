import { prisma } from "../lib/prisma.js";

export function findTemplate(trackId: string, level: "BEGINNER" | "TINKERER" | "COMPETENT") {
  return prisma.roadmapTemplate.findFirst({
    where: { trackId, level, isActive: true },
    include: {
      track: true,
      milestones: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export function listUserRoadmaps(userId: string) {
  return prisma.savedRoadmap.findMany({
    where: { userId },
    include: {
      track: true,
      milestones: { select: { id: true, completedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findUserRoadmap(userId: string, id: string) {
  return prisma.savedRoadmap.findFirst({
    where: { id, userId },
    include: {
      track: true,
      milestones: { orderBy: { sortOrder: "asc" } },
    },
  });
}
