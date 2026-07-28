import { prisma } from "../lib/prisma.js";
export function findAssessmentWithContent(id) {
    return prisma.assessment.findUnique({
        where: {
            id,
        },
        include: {
            track: true,
            /*
             * Retained for compatibility with the
             * original database-driven questionnaire.
             */
            answers: true,
            /*
             * Questionnaire generated specifically
             * for this assessment.
             */
            generatedQuestions: {
                include: {
                    options: {
                        orderBy: {
                            sortOrder: "asc",
                        },
                    },
                },
                orderBy: {
                    sortOrder: "asc",
                },
            },
            generatedResponses: true,
            aiGenerations: true,
        },
    });
}
export function listQuestionsForTrack(trackId) {
    return prisma.question.findMany({
        where: {
            isActive: true,
            OR: [
                {
                    trackId,
                },
                {
                    trackId: null,
                },
            ],
        },
        include: {
            options: {
                orderBy: {
                    sortOrder: "asc",
                },
            },
        },
        orderBy: {
            sortOrder: "asc",
        },
    });
}
