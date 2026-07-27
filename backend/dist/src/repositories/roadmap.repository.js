import { prisma } from "../lib/prisma.js";
export function findTemplate(trackId, level) {
    return prisma.roadmapTemplate.findFirst({
        where: { trackId, level, isActive: true },
        include: {
            track: true,
            milestones: { orderBy: { sortOrder: "asc" } },
        },
    });
}
export function listUserRoadmaps(userId) {
    return prisma.savedRoadmap.findMany({
        where: { userId },
        include: {
            track: true,
            milestones: { select: { id: true, completedAt: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}
export function findUserRoadmap(userId, id) {
    return prisma.savedRoadmap.findFirst({
        where: { id, userId },
        include: {
            track: true,
            milestones: { orderBy: { sortOrder: "asc" } },
        },
    });
}
