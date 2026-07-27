import { Router } from "express";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { findPublishedTrackBySlug } from "../../repositories/catalog.repository.js";
import { findAssessmentWithContent, listQuestionsForTrack } from "../../repositories/assessment.repository.js";
import { captureEvent } from "../../services/analytics.service.js";
import { generateRoadmap } from "../../services/generation.service.js";
import { computeSkillLevel } from "../../services/scoring.service.js";
import { visitorId } from "../../middleware/require-auth.js";
import { routeParam } from "../../utils/route-param.js";
import { startAssessmentSchema, submitAssessmentSchema } from "./assessment.schemas.js";
export const assessmentRouter = Router();
function ownsAssessment(assessment, requestUserId, requestVisitorId) {
    return Boolean((assessment.userId && requestUserId && assessment.userId === requestUserId) ||
        assessment.sessionId === requestVisitorId);
}
assessmentRouter.post("/", asyncHandler(async (request, response) => {
    const input = startAssessmentSchema.parse(request.body);
    const track = await findPublishedTrackBySlug(input.trackSlug);
    if (!track)
        throw new HttpError(404, "TRACK_NOT_FOUND", "The roadmap track was not found.");
    const assessment = await prisma.assessment.create({
        data: {
            trackId: track.id,
            sessionId: visitorId(request),
            userId: request.session.user?.id,
        },
    });
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: "QUIZ_STARTED",
        properties: { assessmentId: assessment.id, trackId: track.id },
    });
    response.status(201).json({ assessmentId: assessment.id });
}));
assessmentRouter.get("/:assessmentId", asyncHandler(async (request, response) => {
    const id = routeParam(request, "assessmentId");
    const assessment = await findAssessmentWithContent(id);
    if (!assessment)
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    if (!ownsAssessment(assessment, request.session.user?.id, visitorId(request))) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot access this assessment.");
    }
    const questions = await listQuestionsForTrack(assessment.trackId);
    response.json({
        assessment: {
            id: assessment.id,
            status: assessment.status,
            computedLevel: assessment.computedLevel,
            track: assessment.track,
            startedAt: assessment.startedAt,
            completedAt: assessment.completedAt,
            answers: assessment.answers,
        },
        questions: questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            sortOrder: question.sortOrder,
            options: question.options.map((option) => ({
                id: option.id,
                label: option.label,
                value: option.value,
                sortOrder: option.sortOrder,
            })),
        })),
    });
}));
assessmentRouter.post("/:assessmentId/submit", asyncHandler(async (request, response) => {
    const id = routeParam(request, "assessmentId");
    const input = submitAssessmentSchema.parse(request.body);
    const assessment = await findAssessmentWithContent(id);
    if (!assessment)
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    if (!ownsAssessment(assessment, request.session.user?.id, visitorId(request))) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot submit this assessment.");
    }
    const questions = await listQuestionsForTrack(assessment.trackId);
    if (input.answers.length !== questions.length) {
        throw new HttpError(400, "ALL_QUESTIONS_REQUIRED", "Every assessment question must be answered.");
    }
    const submitted = new Map(input.answers.map((answer) => [answer.questionId, answer.optionId]));
    let totalScore = 0;
    let maximumScore = 0;
    const answerRows = [];
    for (const question of questions) {
        const optionId = submitted.get(question.id);
        const option = question.options.find((candidate) => candidate.id === optionId);
        if (!option) {
            throw new HttpError(400, "INVALID_ASSESSMENT_ANSWER", "One or more answers are invalid.");
        }
        totalScore += option.score;
        maximumScore += Math.max(...question.options.map((candidate) => candidate.score));
        answerRows.push({ assessmentId: assessment.id, questionId: question.id, optionId: option.id });
    }
    const computedLevel = computeSkillLevel(totalScore, maximumScore);
    await prisma.$transaction(async (transaction) => {
        await transaction.assessmentAnswer.deleteMany({ where: { assessmentId: assessment.id } });
        await transaction.assessmentAnswer.createMany({ data: answerRows });
        await transaction.assessment.update({
            where: { id: assessment.id },
            data: {
                status: "COMPLETED",
                computedLevel,
                completedAt: new Date(),
                userId: assessment.userId ?? request.session.user?.id,
            },
        });
    });
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: "QUIZ_COMPLETED",
        properties: { assessmentId: assessment.id, trackId: assessment.trackId, computedLevel, totalScore },
    });
    response.json({ assessmentId: assessment.id, computedLevel, totalScore, maximumScore });
}));
assessmentRouter.get("/:assessmentId/generated", asyncHandler(async (request, response) => {
    const id = routeParam(request, "assessmentId");
    const assessment = await findAssessmentWithContent(id);
    if (!assessment)
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    if (!ownsAssessment(assessment, request.session.user?.id, visitorId(request))) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot access this roadmap.");
    }
    if (assessment.status !== "COMPLETED" || !assessment.computedLevel) {
        throw new HttpError(409, "ASSESSMENT_INCOMPLETE", "Complete the assessment before generating a roadmap.");
    }
    const roadmap = await generateRoadmap(assessment.trackId, assessment.computedLevel);
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: "ROADMAP_GENERATED",
        properties: { assessmentId: assessment.id, trackId: assessment.trackId, level: assessment.computedLevel },
    });
    response.json({ assessmentId: assessment.id, roadmap });
}));
