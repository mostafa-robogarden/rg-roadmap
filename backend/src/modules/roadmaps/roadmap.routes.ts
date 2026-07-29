import { Router } from "express";

import {
  Prisma,
} from "../../../generated/prisma/client.js";

import { HttpError } from "../../errors/http-error.js";
import { prisma } from "../../lib/prisma.js";

import {
  asyncHandler,
} from "../../middleware/async-handler.js";

import {
  currentUserId,
  requireAuth,
  visitorId,
} from "../../middleware/require-auth.js";

import {
  findAssessmentWithContent,
} from "../../repositories/assessment.repository.js";

import {
  findUserRoadmap,
  listUserRoadmaps,
} from "../../repositories/roadmap.repository.js";

import {
  captureEvent,
} from "../../services/analytics.service.js";

import {
  generateRoadmap,
} from "../../services/generation.service.js";

import {
  routeParam,
} from "../../utils/route-param.js";

import {
  lessonProgressSchema,
} from "./roadmap.schemas.js";

export const roadmapRouter =
  Router();

roadmapRouter.use(requireAuth);

/*
 * The final AI roadmap stored in AiGeneration
 * is expected to follow this structure:
 *
 * {
 *   roadmap: {
 *     modules: [
 *       {
 *         moduleId: "...",
 *         name: "...",
 *         lessons: [...]
 *       }
 *     ]
 *   },
 *   message: "Roadmap generated successfully"
 * }
 */

interface AiRoadmapResource {
  resourceId?: string;
  label?: string;
  title?: string;
  url: string;
}

interface AiRoadmapLesson {
  lessonId: string;
  name: string;
  description?: string;
  estimatedHours?: number;
  xpReward?: number;
  children?: string[];
  resources?: AiRoadmapResource[];
}

interface AiRoadmapModule {
  moduleId: string;
  name: string;
  description?: string;
  lessons: AiRoadmapLesson[];
}

interface AiRoadmapPayload {
  roadmap: {
    title?: string;
    summary?: string;
    modules: AiRoadmapModule[];
  };

  message?: string;
}

interface AiDraftMetadata {
  title?: string;
  summary?: string;
}

/*
 * Convert an ordinary JS value into something
 * Prisma can safely write to a JSON column.
 */
function toInputJson(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value ?? []),
  ) as Prisma.InputJsonValue;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  value: unknown,
): string | undefined {
  return typeof value === "string"
    ? value
    : undefined;
}

function readPositiveInteger(
  value: unknown,
): number | undefined {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  )
    ? value
    : undefined;
}

/*
 * Parse and minimally validate the AI's final
 * roadmap JSON.
 *
 * Zod validation should already happen when the
 * AI output is generated. This second check
 * protects the save route from malformed rows
 * or manually modified database JSON.
 */
function readAiRoadmapPayload(
  value: unknown,
): AiRoadmapPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const roadmapValue =
    value["roadmap"];

  if (!isRecord(roadmapValue)) {
    return null;
  }

  const modulesValue =
    roadmapValue["modules"];

  if (
    !Array.isArray(modulesValue) ||
    modulesValue.length === 0
  ) {
    return null;
  }

  const modules:
    AiRoadmapModule[] = [];

  for (
    const rawModule of
      modulesValue
  ) {
    if (!isRecord(rawModule)) {
      return null;
    }

    const moduleId =
      readString(
        rawModule["moduleId"],
      );

    const moduleName =
      readString(
        rawModule["name"],
      );

    const rawLessons =
      rawModule["lessons"];

    if (
      !moduleId ||
      !moduleName ||
      !Array.isArray(rawLessons) ||
      rawLessons.length === 0
    ) {
      return null;
    }

    const lessons:
      AiRoadmapLesson[] = [];

    for (
      const rawLesson of
        rawLessons
    ) {
      if (!isRecord(rawLesson)) {
        return null;
      }

      const lessonId =
        readString(
          rawLesson["lessonId"],
        );

      const lessonName =
        readString(
          rawLesson["name"],
        );

      if (
        !lessonId ||
        !lessonName
      ) {
        return null;
      }

      const rawResources =
        rawLesson["resources"];

      const resources:
        AiRoadmapResource[] =
          Array.isArray(
            rawResources,
          )
            ? rawResources
                .filter(
                  isRecord,
                )
                .map(
                  resource => ({
                    resourceId:
                      readString(
                        resource[
                          "resourceId"
                        ],
                      ),

                    label:
                      readString(
                        resource[
                          "label"
                        ],
                      ),

                    title:
                      readString(
                        resource[
                          "title"
                        ],
                      ),

                    url:
                      readString(
                        resource["url"],
                      ) ?? "",
                  }),
                )
                .filter(
                  resource =>
                    Boolean(
                      resource.url,
                    ),
                )
            : [];

      const rawChildren =
        rawLesson["children"];

      const children =
        Array.isArray(
          rawChildren,
        )
          ? rawChildren.filter(
              (
                child,
              ): child is string =>
                typeof child ===
                "string",
            )
          : [];

      lessons.push({
        lessonId,

        name:
          lessonName,

        description:
          readString(
            rawLesson[
              "description"
            ],
          ),

        estimatedHours:
          readPositiveInteger(
            rawLesson[
              "estimatedHours"
            ],
          ),

        xpReward:
          readPositiveInteger(
            rawLesson[
              "xpReward"
            ],
          ),

        children,

        resources,
      });
    }

    modules.push({
      moduleId,

      name:
        moduleName,

      description:
        readString(
          rawModule[
            "description"
          ],
        ),

      lessons,
    });
  }

  return {
    roadmap: {
      title:
        readString(
          roadmapValue["title"],
        ),

      summary:
        readString(
          roadmapValue["summary"],
        ),

      modules,
    },

    message:
      readString(
        value["message"],
      ),
  };
}

function readAiDraftMetadata(
  value: unknown,
): AiDraftMetadata {
  if (!isRecord(value)) {
    return {};
  }

  return {
    title:
      readString(
        value["title"],
      ),

    summary:
      readString(
        value["summary"],
      ),
  };
}

/*
 * Turn AI modules and lessons into relational
 * SavedMilestone rows.
 *
 * The AI does not control:
 * - database IDs
 * - progress status
 * - completedAt
 *
 * The first lesson starts IN_PROGRESS.
 */
function createAiLessonRows(
  payload: AiRoadmapPayload,
): Prisma.SavedMilestoneUncheckedCreateWithoutSavedRoadmapInput[] {
  const rows:
    Prisma.SavedMilestoneUncheckedCreateWithoutSavedRoadmapInput[] =
      [];

  let globalSortOrder =
    0;

  payload.roadmap.modules.forEach(
    (
      module,
      moduleIndex,
    ) => {
      module.lessons.forEach(
        (
          lesson,
          lessonIndex,
        ) => {
          globalSortOrder +=
            1;

          const estimatedHours =
            lesson.estimatedHours ??
            null;

          const calculatedXp =
            estimatedHours
              ? Math.max(
                  10,
                  Math.min(
                    200,
                    estimatedHours *
                      10,
                  ),
                )
              : 10;

          rows.push({
            /*
             * AI lessons do not come from the
             * old RoadmapTemplate table.
             */
            templateMilestoneId:
              null,

            sortOrder:
              globalSortOrder,

            title:
              lesson.name,

            description:
              lesson.description ??
              "Complete this learning step.",

            estimatedHours,

            resources:
              toInputJson(
                lesson.resources ??
                  [],
              ),

            publicLessonId:
              lesson.lessonId,

            moduleId:
              module.moduleId,

            moduleName:
              module.name,

            moduleDescription:
              module.description ??
              null,

            moduleOrder:
              moduleIndex + 1,

            lessonOrder:
              lessonIndex + 1,

            xpReward:
              lesson.xpReward ??
              calculatedXp,

            /*
             * Only the very first lesson begins
             * as active.
             */
            status:
              globalSortOrder === 1
                ? "IN_PROGRESS"
                : "NOT_STARTED",

            children:
              toInputJson(
                lesson.children ??
                  [],
              ),

            completedAt:
              null,
          });
        },
      );
    },
  );

  return rows;
}

/*
 * Convert the original rule-based roadmap into
 * the same database representation.
 *
 * This keeps the application usable when:
 * - AI is disabled
 * - Ollama is offline
 * - no AI generation exists
 * - AI output fails validation
 */
function createFallbackLessonRows(
  generated: Awaited<
    ReturnType<
      typeof generateRoadmap
    >
  >,
): Prisma.SavedMilestoneUncheckedCreateWithoutSavedRoadmapInput[] {
  const publicLessonIds =
    generated.milestones.map(
      (
        _milestone,
        index,
      ) =>
        `fallback_m1_l${index + 1}`,
    );

  return generated.milestones.map(
    (
      milestone,
      index,
    ) => {
      const nextLessonId =
        publicLessonIds[
          index + 1
        ];

      const estimatedHours =
        milestone.estimatedHours;

      const calculatedXp =
        estimatedHours
          ? Math.max(
              10,
              Math.min(
                200,
                estimatedHours *
                  10,
              ),
            )
          : 10;

      return {
        templateMilestoneId:
          milestone.id,

        sortOrder:
          milestone.sortOrder,

        title:
          milestone.title,

        description:
          milestone.description,

        estimatedHours,

        resources:
          toInputJson(
            milestone.resources,
          ),

        publicLessonId:
          publicLessonIds[
            index
          ],

        moduleId:
          "fallback_module_1",

        moduleName:
          generated.title,

        moduleDescription:
          generated.description,

        moduleOrder:
          1,

        lessonOrder:
          index + 1,

        xpReward:
          calculatedXp,

        status:
          index === 0
            ? "IN_PROGRESS"
            : "NOT_STARTED",

        children:
          toInputJson(
            nextLessonId
              ? [nextLessonId]
              : [],
          ),

        completedAt:
          null,
      };
    },
  );
}

/*
 * GET /api/roadmaps
 *
 * Return the logged-in learner's saved roadmaps.
 */
roadmapRouter.get(
  "/",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const roadmaps =
        await listUserRoadmaps(
          currentUserId(
            request,
          ),
        );

      response.json({
        roadmaps:
          roadmaps.map(
            roadmap => ({
              id:
                roadmap.id,

              title:
                roadmap.title,

              level:
                roadmap.level,

              track:
                roadmap.track,

              createdAt:
                roadmap.createdAt,

              milestoneCount:
                roadmap
                  .milestones
                  .length,

              completedCount:
                roadmap
                  .milestones
                  .filter(
                    milestone =>
                      Boolean(
                        milestone
                          .completedAt,
                      ),
                  )
                  .length,
            }),
          ),
      });
    },
  ),
);

/*
 * POST /api/roadmaps/from-assessment/:assessmentId
 *
 * Save the exact generated roadmap and create
 * relational progress rows.
 */
roadmapRouter.post(
  "/from-assessment/:assessmentId",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const userId =
        currentUserId(
          request,
        );

      const assessmentId =
        routeParam(
          request,
          "assessmentId",
        );

      const assessment =
        await findAssessmentWithContent(
          assessmentId,
        );

      if (!assessment) {
        throw new HttpError(
          404,
          "ASSESSMENT_NOT_FOUND",
          "The assessment was not found.",
        );
      }

      if (
        assessment.userId &&
        assessment.userId !==
          userId
      ) {
        throw new HttpError(
          403,
          "ASSESSMENT_FORBIDDEN",
          "You cannot save this assessment.",
        );
      }

      if (
        !assessment.userId &&
        assessment.sessionId !==
          visitorId(request)
      ) {
        throw new HttpError(
          403,
          "ASSESSMENT_FORBIDDEN",
          "You cannot save this assessment.",
        );
      }

      if (
        assessment.status !==
          "COMPLETED" ||
        !assessment.computedLevel
      ) {
        throw new HttpError(
          409,
          "ASSESSMENT_INCOMPLETE",
          "Complete the assessment before saving its roadmap.",
        );
      }

      const existing =
        await prisma.savedRoadmap.findUnique({
          where: {
            assessmentId,
          },
        });

      if (existing) {
        response.json({
          roadmapId:
            existing.id,

          alreadySaved:
            true,
        });

        return;
      }

      /*
       * Look for the final roadmap that the AI
       * generation endpoint already stored.
       */
      const aiGeneration =
        assessment.aiGenerations.find(
          generation =>
            generation.kind ===
              "ROADMAP" &&
            generation.finalPayload,
        );

      const aiPayload =
        aiGeneration
          ? readAiRoadmapPayload(
              aiGeneration
                .finalPayload,
            )
          : null;

      let title:
        string;

      let summary:
        string;

      let source:
        "AI" |
        "RULE_BASED_FALLBACK";

      let roadmapJson:
        Prisma.InputJsonValue;

      let lessonRows:
        Prisma.SavedMilestoneUncheckedCreateWithoutSavedRoadmapInput[];

      if (
        aiPayload &&
        aiPayload.roadmap
          .modules.length > 0
      ) {
        const draftMetadata =
          readAiDraftMetadata(
            aiGeneration
              ?.draftPayload,
          );

        title =
          aiPayload.roadmap
            .title ??
          draftMetadata.title ??
          `${assessment.track.title} Roadmap`;

        summary =
          aiPayload.roadmap
            .summary ??
          draftMetadata.summary ??
          `A personalized ${assessment.computedLevel.toLowerCase()} roadmap for ${assessment.track.title}.`;

        source =
          "AI";

        roadmapJson =
          toInputJson(
            aiPayload,
          );

        lessonRows =
          createAiLessonRows(
            aiPayload,
          );
      } else {
        /*
         * No valid stored AI roadmap was found,
         * so use the original deterministic
         * generator.
         */
        const generated =
          await generateRoadmap(
            assessment.trackId,
            assessment.computedLevel,
          );

        title =
          generated.title;

        summary =
          generated.description;

        source =
          "RULE_BASED_FALLBACK";

        roadmapJson =
          toInputJson(
            generated,
          );

        lessonRows =
          createFallbackLessonRows(
            generated,
          );

        if (aiGeneration) {
          console.warn(
            `Assessment ${assessmentId} had an invalid AI finalPayload. The rule-based fallback was saved instead.`,
          );
        }
      }

      if (
        lessonRows.length === 0
      ) {
        throw new HttpError(
          409,
          "ROADMAP_HAS_NO_LESSONS",
          "The generated roadmap does not contain any lessons.",
        );
      }

      const saved =
        await prisma.$transaction(
          async transaction => {
            /*
             * Attach a guest assessment to the
             * learner who is saving it.
             */
            await transaction.assessment.update({
              where: {
                id:
                  assessmentId,
              },

              data: {
                userId,
              },
            });

            return transaction.savedRoadmap.create({
              data: {
                userId,

                assessmentId,

                trackId:
                  assessment.trackId,

                level:
                  assessment.computedLevel!,

                title,

                summary,

                source,

                /*
                 * Immutable copy of what the
                 * learner originally saved.
                 */
                roadmapJson,

                /*
                 * Individual rows are used for
                 * progress updates and graph
                 * coloring.
                 */
                milestones: {
                  create:
                    lessonRows,
                },
              },
            });
          },
        );

      await captureEvent({
        userId,

        sessionId:
          visitorId(request),

        eventName:
          "ROADMAP_SAVED",

        properties: {
          assessmentId,

          roadmapId:
            saved.id,

          source,

          lessonCount:
            lessonRows.length,
        },
      });

      response
        .status(201)
        .json({
          roadmapId:
            saved.id,

          alreadySaved:
            false,

          source,
        });
    },
  ),
);

/*
 * GET /api/roadmaps/:roadmapId
 */
roadmapRouter.get(
  "/:roadmapId",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const roadmap =
        await findUserRoadmap(
          currentUserId(
            request,
          ),

          routeParam(
            request,
            "roadmapId",
          ),
        );

      if (!roadmap) {
        throw new HttpError(
          404,
          "ROADMAP_NOT_FOUND",
          "The saved roadmap was not found.",
        );
      }

      response.json({
        roadmap,
      });
    },
  ),
);

/*
 * PATCH
 * /api/roadmaps/:roadmapId/milestones/:milestoneId
 *
 * Accepted statuses:
 * - NOT_STARTED
 * - IN_PROGRESS
 * - COMPLETED
 *
 * SKIPPED is calculated by the server.
 */
roadmapRouter.patch(
  "/:roadmapId/milestones/:milestoneId",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const userId =
        currentUserId(
          request,
        );

      const roadmapId =
        routeParam(
          request,
          "roadmapId",
        );

      const milestoneId =
        routeParam(
          request,
          "milestoneId",
        );

      const input =
        lessonProgressSchema.parse(
          request.body,
        );

      const milestone =
        await prisma.savedMilestone.findFirst({
          where: {
            id:
              milestoneId,

            savedRoadmapId:
              roadmapId,

            savedRoadmap: {
              userId,
            },
          },
        });

      if (!milestone) {
        throw new HttpError(
          404,
          "MILESTONE_NOT_FOUND",
          "The roadmap step was not found.",
        );
      }

      const milestones =
        await prisma.$transaction(
          async transaction => {
            /*
             * When a learner starts or completes
             * a later step, all earlier untouched
             * or active steps are considered
             * skipped.
             *
             * Already completed steps remain
             * completed.
             */
            if (
              input.status ===
                "IN_PROGRESS" ||
              input.status ===
                "COMPLETED"
            ) {
              await transaction.savedMilestone.updateMany({
                where: {
                  savedRoadmapId:
                    roadmapId,

                  sortOrder: {
                    lt:
                      milestone.sortOrder,
                  },

                  status: {
                    in: [
                      "NOT_STARTED",
                      "IN_PROGRESS",
                    ],
                  },
                },

                data: {
                  status:
                    "SKIPPED",
                  completedAt:
                    null,
                },
              });
            }

            /*
             * Normally only one lesson should
             * be active at once.
             */
            if (
              input.status ===
              "IN_PROGRESS"
            ) {
              await transaction.savedMilestone.updateMany({
                where: {
                  savedRoadmapId:
                    roadmapId,

                  id: {
                    not:
                      milestone.id,
                  },

                  status:
                    "IN_PROGRESS",
                },

                data: {
                  status:
                    "NOT_STARTED",

                  completedAt:
                    null,
                },
              });
            }

            await transaction.savedMilestone.update({
              where: {
                id:
                  milestone.id,
              },

              data: {
                status:
                  input.status,

                completedAt:
                  input.status ===
                  "COMPLETED"
                    ? new Date()
                    : null,
              },
            });

            /*
             * Completing one lesson activates
             * the next untouched lesson unless
             * another lesson is already active.
             */
            if (
              input.status ===
              "COMPLETED"
            ) {
              const activeLesson =
                await transaction.savedMilestone.findFirst({
                  where: {
                    savedRoadmapId:
                      roadmapId,

                    status:
                      "IN_PROGRESS",
                  },
                });

              if (!activeLesson) {
                const nextLesson =
                  await transaction.savedMilestone.findFirst({
                    where: {
                      savedRoadmapId:
                        roadmapId,

                      sortOrder: {
                        gt:
                          milestone.sortOrder,
                      },

                      status:
                        "NOT_STARTED",
                    },

                    orderBy: {
                      sortOrder:
                        "asc",
                    },
                  });

                if (nextLesson) {
                  await transaction.savedMilestone.update({
                    where: {
                      id:
                        nextLesson.id,
                    },

                    data: {
                      status:
                        "IN_PROGRESS",
                    },
                  });
                }
              }
            }

            return transaction.savedMilestone.findMany({
              where: {
                savedRoadmapId:
                  roadmapId,
              },

              orderBy: {
                sortOrder:
                  "asc",
              },
            });
          },
        );

      const updatedMilestone =
        milestones.find(
          item =>
            item.id ===
            milestone.id,
        );

      await captureEvent({
        userId,

        sessionId:
          visitorId(request),

        eventName:
          input.status ===
          "COMPLETED"
            ? "MILESTONE_COMPLETED"
            : input.status ===
                "IN_PROGRESS"
              ? "MILESTONE_STARTED"
              : "MILESTONE_RESET",

        properties: {
          roadmapId,

          milestoneId,

          status:
            input.status,
        },
      });

      response.json({
        milestone:
          updatedMilestone,

        /*
         * Return the entire collection because
         * one action can update skipped lessons
         * and activate another lesson.
         */
        milestones,
      });
    },
  ),
);

/*
 * DELETE /api/roadmaps/:roadmapId
 */
roadmapRouter.delete(
  "/:roadmapId",

  asyncHandler(
    async (
      request,
      response,
    ) => {
      const userId =
        currentUserId(
          request,
        );

      const roadmapId =
        routeParam(
          request,
          "roadmapId",
        );

      const deleted =
        await prisma.savedRoadmap.deleteMany({
          where: {
            id:
              roadmapId,

            userId,
          },
        });

      if (!deleted.count) {
        throw new HttpError(
          404,
          "ROADMAP_NOT_FOUND",
          "The saved roadmap was not found.",
        );
      }

      response
        .status(204)
        .send();
    },
  ),
);