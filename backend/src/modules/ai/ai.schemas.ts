import { z } from "zod";

const optionLabelSchema = z
  .string()
  .trim()
  .min(2)
  .max(180);

/*
 * The AI produces content only.
 *
 * The backend will later add:
 * - questionId
 * - optionId
 * - scores
 * - sort orders
 */
export const aiQuestionnaireDraftSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(5)
      .max(140),

    questions: z
      .array(
        z.object({
          prompt: z
            .string()
            .trim()
            .min(10)
            .max(300),

          topic: z
            .string()
            .trim()
            .min(2)
            .max(80),

          options: z
            .array(optionLabelSchema)
            .length(4),
        }),
      )
      .length(10),
  });

export type AiQuestionnaireDraft =
  z.infer<
    typeof aiQuestionnaireDraftSchema
  >;

/*
 * The AI does not generate technical fields.
 *
 * The backend will later add:
 * - moduleId
 * - lessonId
 * - xpReward
 * - status
 * - children
 * - approved resources
 */
export const aiRoadmapDraftSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(5)
      .max(160),

    summary: z
      .string()
      .trim()
      .min(20)
      .max(1_200),

    modules: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(3)
            .max(140),

          description: z
            .string()
            .trim()
            .min(20)
            .max(1_000),

          lessons: z
            .array(
              z.object({
                name: z
                  .string()
                  .trim()
                  .min(3)
                  .max(140),

                description: z
                  .string()
                  .trim()
                  .min(20)
                  .max(1_000),

                estimatedHours: z
                  .number()
                  .int()
                  .min(1)
                  .max(80),
              }),
            )
            .min(2)
            .max(8),
        }),
      )
      .min(3)
      .max(10),
  });

export type AiRoadmapDraft =
  z.infer<
    typeof aiRoadmapDraftSchema
  >;