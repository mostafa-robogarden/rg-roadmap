import { z } from "zod";

export const trackSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1000),
  isTrending: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

const optionSchema = z.object({
  label: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(80),
  score: z.number().int().min(0).max(10),
  sortOrder: z.number().int().min(1),
});

export const questionSchema = z.object({
  trackId: z.string().uuid().nullable().optional(),
  prompt: z.string().trim().min(5).max(500),
  sortOrder: z.number().int().min(1),
  isActive: z.boolean().default(true),
  options: z.array(optionSchema).min(2).max(8),
});

const resourceSchema = z.object({
  label: z.string().trim().min(1).max(100),
  url: z.string().url(),
});

const milestoneSchema = z.object({
  sortOrder: z.number().int().min(1),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(1000),
  estimatedHours: z.number().int().positive().nullable().optional(),
  resources: z.array(resourceSchema).default([]),
});

export const templateSchema = z.object({
  trackId: z.string().uuid(),
  level: z.enum(["BEGINNER", "TINKERER", "COMPETENT"]),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(1000),
  isActive: z.boolean().default(true),
  milestones: z.array(milestoneSchema).min(1).max(30),
});
