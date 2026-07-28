import { Router } from "express";
import { env } from "../../config/env.js";
import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler, } from "../../middleware/async-handler.js";
import { visitorId, } from "../../middleware/require-auth.js";
import { findAssessmentWithContent, } from "../../repositories/assessment.repository.js";
import { findPublishedTrackBySlug, } from "../../repositories/catalog.repository.js";
import { captureEvent, } from "../../services/analytics.service.js";
import { generateRoadmap, } from "../../services/generation.service.js";
import { computeSkillLevel, } from "../../services/scoring.service.js";
import { generateQuestionnaireDraft, } from "../ai/ai.service.js";
import { routeParam, } from "../../utils/route-param.js";
import { startAssessmentSchema, submitAssessmentSchema, } from "./assessment.schemas.js";
export const assessmentRouter = Router();
function ownsAssessment(assessment, requestUserId, requestVisitorId) {
    return Boolean((assessment.userId &&
        requestUserId &&
        assessment.userId === requestUserId) ||
        assessment.sessionId ===
            requestVisitorId);
}
/*
 * Start an assessment and generate a frozen
 * questionnaire for the selected track.
 */
assessmentRouter.post("/", asyncHandler(async (request, response) => {
    const input = startAssessmentSchema.parse(request.body);
    const track = await findPublishedTrackBySlug(input.trackSlug);
    if (!track) {
        throw new HttpError(404, "TRACK_NOT_FOUND", "The roadmap track was not found.");
    }
    /*
     * Generate before creating the database
     * assessment so an Ollama failure does not
     * leave behind an empty assessment.
     */
    const questionnaire = await generateQuestionnaireDraft({
        trackTitle: track.title,
        trackDescription: track.description,
        learnerGoal: input.learnerGoal,
        weeklyHours: input.weeklyHours,
        targetMonths: input.targetMonths,
    });
    const assessment = await prisma.$transaction(async (transaction) => {
        const createdAssessment = await transaction.assessment.create({
            data: {
                trackId: track.id,
                sessionId: visitorId(request),
                userId: request.session.user?.id,
                learnerGoal: input.learnerGoal,
                weeklyHours: input.weeklyHours,
                targetMonths: input.targetMonths,
                generatedQuestions: {
                    create: questionnaire.questions.map((question, questionIndex) => ({
                        prompt: question.prompt,
                        topic: question.topic,
                        sortOrder: questionIndex + 1,
                        options: {
                            create: question.options.map((label, optionIndex) => ({
                                label,
                                /*
                                 * The AI controls the
                                 * wording, but the
                                 * backend controls scores.
                                 */
                                score: optionIndex,
                                sortOrder: optionIndex +
                                    1,
                            })),
                        },
                    })),
                },
            },
        });
        await transaction.aiGeneration.create({
            data: {
                assessmentId: createdAssessment.id,
                kind: "QUESTIONNAIRE",
                provider: "ollama",
                model: env.AI_MODEL,
                promptVersion: "questionnaire-v1",
                draftPayload: questionnaire,
            },
        });
        return createdAssessment;
    });
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: "QUIZ_STARTED",
        properties: {
            assessmentId: assessment.id,
            trackId: track.id,
            questionnaireSource: "AI",
            aiModel: env.AI_MODEL,
        },
    });
    response.status(201).json({
        assessmentId: assessment.id,
    });
}));
/*
 * Retrieve the frozen questions.
 */
assessmentRouter.get("/:assessmentId", asyncHandler(async (request, response) => {
    const id = routeParam(request, "assessmentId");
    const assessment = await findAssessmentWithContent(id);
    if (!assessment) {
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    }
    if (!ownsAssessment(assessment, request.session.user?.id, visitorId(request))) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot access this assessment.");
    }
    if (assessment.generatedQuestions
        .length === 0) {
        throw new HttpError(409, "QUESTIONNAIRE_NOT_GENERATED", "This assessment does not have a generated questionnaire.");
    }
    response.json({
        assessment: {
            id: assessment.id,
            status: assessment.status,
            computedLevel: assessment.computedLevel,
            track: assessment.track,
            learnerGoal: assessment.learnerGoal,
            weeklyHours: assessment.weeklyHours,
            targetMonths: assessment.targetMonths,
            startedAt: assessment.startedAt,
            completedAt: assessment.completedAt,
            answers: assessment.generatedResponses.map(answer => ({
                questionId: answer.questionId,
                optionId: answer.optionId,
            })),
        },
        questions: assessment.generatedQuestions.map(question => ({
            id: question.id,
            prompt: question.prompt,
            topic: question.topic,
            sortOrder: question.sortOrder,
            options: question.options.map(option => ({
                id: option.id,
                label: option.label,
                sortOrder: option.sortOrder,
            })),
        })),
    });
}));
/*
 * Submit the answers and calculate the level
 * from backend-controlled option scores.
 */
assessmentRouter.post("/:assessmentId/submit", asyncHandler(async (request, response) => {
    const id = routeParam(request, "assessmentId");
    const input = submitAssessmentSchema.parse(request.body);
    const assessment = await findAssessmentWithContent(id);
    if (!assessment) {
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    }
    if (!ownsAssessment(assessment, request.session.user?.id, visitorId(request))) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot submit this assessment.");
    }
    const questions = assessment.generatedQuestions;
    if (questions.length === 0) {
        throw new HttpError(409, "QUESTIONNAIRE_NOT_GENERATED", "This assessment does not have generated questions.");
    }
    const submitted = new Map(input.answers.map(answer => [
        answer.questionId,
        answer.optionId,
    ]));
    if (input.answers.length !==
        questions.length ||
        submitted.size !==
            questions.length) {
        throw new HttpError(400, "ALL_QUESTIONS_REQUIRED", "Every assessment question must be answered exactly once.");
    }
    let totalScore = 0;
    let maximumScore = 0;
    const responseRows = [];
    for (const question of questions) {
        const selectedOptionId = submitted.get(question.id);
        const selectedOption = question.options.find(option => option.id ===
            selectedOptionId);
        if (!selectedOption) {
            throw new HttpError(400, "INVALID_ASSESSMENT_ANSWER", "One or more assessment answers are invalid.");
        }
        totalScore +=
            selectedOption.score;
        maximumScore +=
            Math.max(...question.options.map(option => option.score));
        responseRows.push({
            assessmentId: assessment.id,
            questionId: question.id,
            optionId: selectedOption.id,
        });
    }
    const computedLevel = computeSkillLevel(totalScore, maximumScore);
    await prisma.$transaction(async (transaction) => {
        await transaction.assessmentResponse.deleteMany({
            where: {
                assessmentId: assessment.id,
            },
        });
        await transaction.assessmentResponse.createMany({
            data: responseRows,
        });
        await transaction.assessment.update({
            where: {
                id: assessment.id,
            },
            data: {
                status: "COMPLETED",
                computedLevel,
                completedAt: new Date(),
                userId: assessment.userId ??
                    request.session.user?.id,
            },
        });
    });
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: "QUIZ_COMPLETED",
        properties: {
            assessmentId: assessment.id,
            trackId: assessment.trackId,
            computedLevel,
            totalScore,
            maximumScore,
            questionnaireSource: "AI",
        },
    });
    response.json({
        assessmentId: assessment.id,
        computedLevel,
        totalScore,
        maximumScore,
    });
}));
/*
 * This endpoint still uses the original
 * rule-based roadmap temporarily.
 *
 * In the next checkpoint we will replace this
 * section with AI roadmap generation and
 * persist its JSON.
 */
assessmentRouter.get("/:assessmentId/generated", asyncHandler(async (request, response) => {
    const id = routeParam(request, "assessmentId");
    const assessment = await findAssessmentWithContent(id);
    if (!assessment) {
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "The assessment was not found.");
    }
    if (!ownsAssessment(assessment, request.session.user?.id, visitorId(request))) {
        throw new HttpError(403, "ASSESSMENT_FORBIDDEN", "You cannot access this roadmap.");
    }
    if (assessment.status !==
        "COMPLETED" ||
        !assessment.computedLevel) {
        throw new HttpError(409, "ASSESSMENT_INCOMPLETE", "Complete the assessment before generating a roadmap.");
    }
    const roadmap = await generateRoadmap(assessment.trackId, assessment.computedLevel);
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: "ROADMAP_GENERATED",
        properties: {
            assessmentId: assessment.id,
            trackId: assessment.trackId,
            level: assessment.computedLevel,
            generationSource: "RULE_BASED_TEMPORARY",
        },
    });
    response.json({
        assessmentId: assessment.id,
        roadmap,
    });
}));
