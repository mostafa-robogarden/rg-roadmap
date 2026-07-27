import { prisma } from "../lib/prisma.js";
export function findAssessmentWithContent(id) {
    return prisma.assessment.findUnique({
        where: { id },
        include: {
            track: true,
            answers: true,
        },
    });
}
export function listQuestionsForTrack(trackId) {
    return prisma.question.findMany({
        where: {
            isActive: true,
            OR: [{ trackId }, { trackId: null }],
        },
        include: { options: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
    });
}
