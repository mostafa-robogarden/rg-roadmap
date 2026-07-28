import { z } from "zod";

export const startAssessmentSchema = z.object({
  trackSlug: z
    .string()
    .trim()
    .min(1)
    .max(100),

  learnerGoal: z
    .string()
    .trim()
    .min(5)
    .max(500),

  weeklyHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(40),

  targetMonths: z.coerce
    .number()
    .int()
    .min(1)
    .max(36),
});

export const submitAssessmentSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        optionId: z.string().uuid(),
      }),
    )
    .min(1),
});