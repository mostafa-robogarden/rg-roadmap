import { Router } from "express";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { currentUserId, requireAuth, visitorId } from "../../middleware/require-auth.js";
import { findAssessmentWithContent } from "../../repositories/assessment.repository.js";
import { findUserRoadmap, listUserRoadmaps } from "../../repositories/roadmap.repository.js";
import { captureEvent } from "../../services/analytics.service.js";
import { generateRoadmap } from "../../services/generation.service.js";
import { routeParam } from "../../utils/route-param.js";
import { milestoneProgressSchema } from "./roadmap.schemas.js";
export const roadmapRouter = Router();
roadmapRouter.use(requireAuth);
roadmapRouter.get("/", asyncHandler(async (request, response) => {
    const roadmaps = await listUserRoadmaps(currentUserId(request));
    response.json({
        roadmaps: roadmaps.map((roadmap) => ({
            id: roadmap.id,
            title: roadmap.title,
            level: roadmap.level,
            track: roadmap.track,
            createdAt: roadmap.createdAt,
            milestoneCount: roadmap.milestones.length,
            completedCount: roadmap.milestones.filter((milestone) => milestone.completedAt).length,
        })),
    });
}));
roadmapRouter.post("/from-assessment/:assessmentId", asyncHandler(async (request, response) => {
    const userId = currentUserId(request);
    const assessmentId = routeParam(request, "assessmentId");
    const assessment = await findAssessmentWithContent(assessmentId);
    if (!assessment)
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    if (assessment.userId && assessment.userId !== userId) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot save this assessment.");
    }
    if (!assessment.userId && assessment.sessionId !== visitorId(request)) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot save this assessment.");
    }
    if (assessment.status !== "COMPLETED" || !assessment.computedLevel) {
        throw new HttpError(409, "ASSESSMENT_INCOMPLETE", "Complete the assessment before saving its roadmap.");
    }
    const existing = await prisma.savedRoadmap.findUnique({ where: { assessmentId } });
    if (existing) {
        response.json({ roadmapId: existing.id, alreadySaved: true });
        return;
    }
    const generated = await generateRoadmap(assessment.trackId, assessment.computedLevel);
    const saved = await prisma.$transaction(async (transaction) => {
        await transaction.assessment.update({ where: { id: assessmentId }, data: { userId } });
        return transaction.savedRoadmap.create({
            data: {
                userId,
                assessmentId,
                trackId: assessment.trackId,
                level: assessment.computedLevel,
                title: generated.title,
                milestones: {
                    create: generated.milestones.map((milestone) => ({
                        templateMilestoneId: milestone.id,
                        sortOrder: milestone.sortOrder,
                        title: milestone.title,
                        description: milestone.description,
                        estimatedHours: milestone.estimatedHours,
                        resources: milestone.resources,
                    })),
                },
            },
        });
    });
    await captureEvent({
        userId,
        sessionId: visitorId(request),
        eventName: "ROADMAP_SAVED",
        properties: { assessmentId, roadmapId: saved.id },
    });
    response.status(201).json({ roadmapId: saved.id, alreadySaved: false });
}));
roadmapRouter.get("/:roadmapId", asyncHandler(async (request, response) => {
    const roadmap = await findUserRoadmap(currentUserId(request), routeParam(request, "roadmapId"));
    if (!roadmap)
        throw new HttpError(404, "ROADMAP_NOT_FOUND", "The saved roadmap was not found.");
    response.json({ roadmap });
}));
roadmapRouter.patch("/:roadmapId/milestones/:milestoneId", asyncHandler(async (request, response) => {
    const userId = currentUserId(request);
    const roadmapId = routeParam(request, "roadmapId");
    const milestoneId = routeParam(request, "milestoneId");
    const input = milestoneProgressSchema.parse(request.body);
    const milestone = await prisma.savedMilestone.findFirst({
        where: { id: milestoneId, savedRoadmapId: roadmapId, savedRoadmap: { userId } },
    });
    if (!milestone)
        throw new HttpError(404, "MILESTONE_NOT_FOUND", "The milestone was not found.");
    const updated = await prisma.savedMilestone.update({
        where: { id: milestone.id },
        data: { completedAt: input.completed ? new Date() : null },
    });
    await captureEvent({
        userId,
        sessionId: visitorId(request),
        eventName: input.completed ? "MILESTONE_COMPLETED" : "MILESTONE_REOPENED",
        properties: { roadmapId, milestoneId },
    });
    response.json({ milestone: updated });
}));
roadmapRouter.delete("/:roadmapId", asyncHandler(async (request, response) => {
    const userId = currentUserId(request);
    const roadmapId = routeParam(request, "roadmapId");
    const deleted = await prisma.savedRoadmap.deleteMany({ where: { id: roadmapId, userId } });
    if (!deleted.count)
        throw new HttpError(404, "ROADMAP_NOT_FOUND", "The saved roadmap was not found.");
    response.status(204).send();
}));
