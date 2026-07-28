import { z } from "zod";

import {
  aiQuestionnaireDraftSchema,
  aiRoadmapDraftSchema,
} from "./ai.schemas.js";

export interface QuestionnairePromptInput {
  trackTitle: string;
  trackDescription: string;
  learnerGoal: string;
  weeklyHours: number;
  targetMonths: number;
}

export interface RoadmapAnswerInput {
  topic: string;
  question: string;
  selectedAnswer: string;
  score: number;
}

export interface RoadmapPromptInput {
  trackTitle: string;
  trackDescription: string;
  learnerGoal: string;
  weeklyHours: number;
  targetMonths: number;

  computedLevel:
    | "BEGINNER"
    | "TINKERER"
    | "COMPETENT";

  answers: RoadmapAnswerInput[];
}

function schemaText(
  schema: z.ZodType,
): string {
  return JSON.stringify(
    z.toJSONSchema(schema),
  );
}

export function questionnaireMessages(
  input: QuestionnairePromptInput,
) {
  return [
    {
      role: "system" as const,

      content:
        "You are an expert curriculum designer. " +
        "Create fair and practical skill-assessment questions. " +
        "Return JSON only. " +
        "Do not use Markdown. " +
        "Do not include explanations outside the JSON.",
    },

    {
      role: "user" as const,

      content: `
Create exactly 10 multiple-choice assessment questions for this learner.

Track: ${input.trackTitle}

Track description:
${input.trackDescription}

Learner goal:
${input.learnerGoal}

Available study time:
${input.weeklyHours} hours per week

Target timeline:
${input.targetMonths} months

Rules:

1. Cover technical familiarity, practical experience, goals, and realistic study commitment.
2. Each question must have exactly four answer labels.
3. Order the four answers from least experienced to most experienced.
4. Do not include scores or IDs.
5. Avoid trick questions.
6. Avoid duplicate topics.
7. The questions must distinguish beginner, tinkerer, and competent learners.
8. Return data matching this JSON Schema exactly:

${schemaText(
  aiQuestionnaireDraftSchema,
)}
`.trim(),
    },
  ];
}

export function roadmapMessages(
  input: RoadmapPromptInput,
) {
  return [
    {
      role: "system" as const,

      content:
        "You are an expert curriculum designer. " +
        "Build a realistic and ordered learning roadmap. " +
        "Return JSON only. " +
        "Do not use Markdown. " +
        "Do not include IDs, XP, statuses, child links, or URLs. " +
        "The application will add those fields safely.",
    },

    {
      role: "user" as const,

      content: `
Create a personalized roadmap for this learner.

Track: ${input.trackTitle}

Track description:
${input.trackDescription}

Learner goal:
${input.learnerGoal}

Available study time:
${input.weeklyHours} hours per week

Target timeline:
${input.targetMonths} months

Computed level:
${input.computedLevel}

Assessment answers:

${JSON.stringify(
  input.answers,
  null,
  2,
)}

Rules:

1. Create 3 to 10 ordered modules.
2. Each module must contain 2 to 8 ordered lessons.
3. Begin with the learner's demonstrated gaps.
4. Do not unnecessarily repeat skills the learner already knows.
5. Keep the workload realistic for the available weekly time and timeline.
6. estimatedHours must be a positive integer representing focused study time for one lesson.
7. Do not add resource URLs yet.
8. Do not add module IDs.
9. Do not add lesson IDs.
10. Do not add XP rewards.
11. Do not add statuses.
12. Do not add child relationships.
13. Return data matching this JSON Schema exactly:

${schemaText(
  aiRoadmapDraftSchema,
)}
`.trim(),
    },
  ];
}