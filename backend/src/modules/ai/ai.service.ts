import {
  aiQuestionnaireDraftSchema,
  aiRoadmapDraftSchema,
  type AiQuestionnaireDraft,
  type AiRoadmapDraft,
} from "./ai.schemas.js";

import {
  questionnaireMessages,
  roadmapMessages,
  type QuestionnairePromptInput,
  type RoadmapPromptInput,
} from "./ai.prompts.js";

import {
  callOllamaStructured,
} from "./ollama.client.js";

export function generateQuestionnaireDraft(
  input: QuestionnairePromptInput,
): Promise<AiQuestionnaireDraft> {
  return callOllamaStructured(
    aiQuestionnaireDraftSchema,
    questionnaireMessages(input),
  );
}

export function generateRoadmapDraft(
  input: RoadmapPromptInput,
): Promise<AiRoadmapDraft> {
  return callOllamaStructured(
    aiRoadmapDraftSchema,
    roadmapMessages(input),
  );
}