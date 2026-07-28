import { aiQuestionnaireDraftSchema, aiRoadmapDraftSchema, } from "./ai.schemas.js";
import { questionnaireMessages, roadmapMessages, } from "./ai.prompts.js";
import { callOllamaStructured, } from "./ollama.client.js";
export function generateQuestionnaireDraft(input) {
    return callOllamaStructured(aiQuestionnaireDraftSchema, questionnaireMessages(input));
}
export function generateRoadmapDraft(input) {
    return callOllamaStructured(aiRoadmapDraftSchema, roadmapMessages(input));
}
