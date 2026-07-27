import { Router } from "express";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAdmin } from "../../middleware/require-auth.js";
import { routeParam } from "../../utils/route-param.js";
import { questionSchema, templateSchema, trackSchema } from "./admin.schemas.js";
export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get("/tracks", asyncHandler(async (_request, response) => {
    const tracks = await prisma.track.findMany({ orderBy: [{ category: "asc" }, { title: "asc" }] });
    response.json({ tracks });
}));
adminRouter.post("/tracks", asyncHandler(async (request, response) => {
    const input = trackSchema.parse(request.body);
    const track = await prisma.track.create({ data: input });
    response.status(201).json({ track });
}));
adminRouter.patch("/tracks/:trackId", asyncHandler(async (request, response) => {
    const input = trackSchema.partial().parse(request.body);
    const track = await prisma.track.update({ where: { id: routeParam(request, "trackId") }, data: input });
    response.json({ track });
}));
adminRouter.delete("/tracks/:trackId", asyncHandler(async (request, response) => {
    const id = routeParam(request, "trackId");
    const savedCount = await prisma.savedRoadmap.count({ where: { trackId: id } });
    if (savedCount) {
        throw new HttpError(409, "TRACK_IN_USE", "This track has saved roadmaps and cannot be deleted.");
    }
    await prisma.track.delete({ where: { id } });
    response.status(204).send();
}));
adminRouter.get("/questions", asyncHandler(async (request, response) => {
    const trackId = typeof request.query.trackId === "string" ? request.query.trackId : undefined;
    const questions = await prisma.question.findMany({
        where: trackId ? { OR: [{ trackId }, { trackId: null }] } : undefined,
        include: { track: true, options: { orderBy: { sortOrder: "asc" } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    response.json({ questions });
}));
adminRouter.post("/questions", asyncHandler(async (request, response) => {
    const input = questionSchema.parse(request.body);
    const question = await prisma.question.create({
        data: {
            trackId: input.trackId ?? null,
            prompt: input.prompt,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
            options: { create: input.options },
        },
        include: { options: { orderBy: { sortOrder: "asc" } } },
    });
    response.status(201).json({ question });
}));
adminRouter.patch("/questions/:questionId", asyncHandler(async (request, response) => {
    const input = questionSchema.parse(request.body);
    const id = routeParam(request, "questionId");
    const question = await prisma.$transaction(async (transaction) => {
        await transaction.questionOption.deleteMany({ where: { questionId: id } });
        return transaction.question.update({
            where: { id },
            data: {
                trackId: input.trackId ?? null,
                prompt: input.prompt,
                sortOrder: input.sortOrder,
                isActive: input.isActive,
                options: { create: input.options },
            },
            include: { options: { orderBy: { sortOrder: "asc" } } },
        });
    });
    response.json({ question });
}));
adminRouter.delete("/questions/:questionId", asyncHandler(async (request, response) => {
    const id = routeParam(request, "questionId");
    const answerCount = await prisma.assessmentAnswer.count({ where: { questionId: id } });
    if (answerCount) {
        await prisma.question.update({ where: { id }, data: { isActive: false } });
        response.status(200).json({ archived: true });
        return;
    }
    await prisma.question.delete({ where: { id } });
    response.status(204).send();
}));
adminRouter.get("/templates", asyncHandler(async (request, response) => {
    const trackId = typeof request.query.trackId === "string" ? request.query.trackId : undefined;
    const templates = await prisma.roadmapTemplate.findMany({
        where: trackId ? { trackId } : undefined,
        include: { track: true, milestones: { orderBy: { sortOrder: "asc" } } },
        orderBy: [{ trackId: "asc" }, { level: "asc" }],
    });
    response.json({ templates });
}));
adminRouter.post("/templates", asyncHandler(async (request, response) => {
    const input = templateSchema.parse(request.body);
    const template = await prisma.roadmapTemplate.create({
        data: {
            trackId: input.trackId,
            level: input.level,
            title: input.title,
            description: input.description,
            isActive: input.isActive,
            milestones: { create: input.milestones },
        },
        include: { track: true, milestones: { orderBy: { sortOrder: "asc" } } },
    });
    response.status(201).json({ template });
}));
adminRouter.patch("/templates/:templateId", asyncHandler(async (request, response) => {
    const input = templateSchema.parse(request.body);
    const id = routeParam(request, "templateId");
    const template = await prisma.$transaction(async (transaction) => {
        await transaction.templateMilestone.deleteMany({ where: { templateId: id } });
        return transaction.roadmapTemplate.update({
            where: { id },
            data: {
                trackId: input.trackId,
                level: input.level,
                title: input.title,
                description: input.description,
                isActive: input.isActive,
                milestones: { create: input.milestones },
            },
            include: { track: true, milestones: { orderBy: { sortOrder: "asc" } } },
        });
    });
    response.json({ template });
}));
adminRouter.delete("/templates/:templateId", asyncHandler(async (request, response) => {
    const id = routeParam(request, "templateId");
    const snapshotCount = await prisma.savedMilestone.count({ where: { templateMilestone: { templateId: id } } });
    if (snapshotCount) {
        await prisma.roadmapTemplate.update({ where: { id }, data: { isActive: false } });
        response.status(200).json({ archived: true });
        return;
    }
    await prisma.roadmapTemplate.delete({ where: { id } });
    response.status(204).send();
}));
adminRouter.get("/analytics", asyncHandler(async (_request, response) => {
    const [users, tracks, quizStarted, quizCompleted, generated, saved, milestones, grouped] = await Promise.all([
        prisma.user.count({ where: { role: "LEARNER" } }),
        prisma.track.count({ where: { isPublished: true } }),
        prisma.analyticsEvent.count({ where: { eventName: "QUIZ_STARTED" } }),
        prisma.analyticsEvent.count({ where: { eventName: "QUIZ_COMPLETED" } }),
        prisma.analyticsEvent.count({ where: { eventName: "ROADMAP_GENERATED" } }),
        prisma.savedRoadmap.count(),
        prisma.savedMilestone.count({ where: { completedAt: { not: null } } }),
        prisma.analyticsEvent.groupBy({ by: ["eventName"], _count: { _all: true }, orderBy: { eventName: "asc" } }),
    ]);
    response.json({
        summary: {
            users,
            publishedTracks: tracks,
            quizStarted,
            quizCompleted,
            roadmapGenerated: generated,
            roadmapsSaved: saved,
            milestonesCompleted: milestones,
            quizCompletionRate: quizStarted ? Math.round((quizCompleted / quizStarted) * 1000) / 10 : 0,
        },
        events: grouped.map((item) => ({ eventName: item.eventName, count: item._count._all })),
    });
}));
