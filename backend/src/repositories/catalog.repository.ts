import { prisma } from "../lib/prisma.js";

export function listPublishedTracks() {
  return prisma.track.findMany({
    where: { isPublished: true },
    orderBy: [{ isTrending: "desc" }, { category: "asc" }, { title: "asc" }],
  });
}

export function findPublishedTrackBySlug(slug: string) {
  return prisma.track.findFirst({ where: { slug, isPublished: true } });
}

export function findTrackById(id: string) {
  return prisma.track.findUnique({ where: { id } });
}
