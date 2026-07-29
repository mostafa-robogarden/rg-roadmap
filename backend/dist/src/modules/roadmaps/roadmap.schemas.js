import { z } from "zod";
/*
 * SKIPPED is intentionally not accepted from
 * the frontend. The backend calculates it when
 * a learner starts a later step.
 */
export const lessonProgressSchema = z.object({
    status: z.enum([
        "NOT_STARTED",
        "IN_PROGRESS",
        "COMPLETED",
    ]),
});
