import { z } from "zod";
export const milestoneProgressSchema = z.object({ completed: z.boolean() });
