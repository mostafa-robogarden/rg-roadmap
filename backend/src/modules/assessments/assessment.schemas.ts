import { z } from "zod";

export const startAssessmentSchema = z.object({
  trackSlug: z.string().trim().min(1).max(100),
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
