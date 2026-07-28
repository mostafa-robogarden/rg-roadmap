import { env } from "../config/env.js";
import { generateQuestionnaireDraft, generateRoadmapDraft, } from "../modules/ai/ai.service.js";
async function main() {
    console.log(`Testing Ollama at ${env.OLLAMA_BASE_URL}`);
    console.log(`Model: ${env.AI_MODEL}`);
    console.log("\nGenerating questionnaire...");
    const questionnaire = await generateQuestionnaireDraft({
        trackTitle: "Front-End Development",
        trackDescription: "Build accessible and responsive browser applications using HTML, CSS, JavaScript, and a modern framework.",
        learnerGoal: "Become employable as a junior front-end developer.",
        weeklyHours: 8,
        targetMonths: 6,
    });
    console.log("\nQuestionnaire generated successfully:");
    console.log(JSON.stringify({
        title: questionnaire.title,
        questionCount: questionnaire.questions
            .length,
        firstQuestion: questionnaire.questions[0],
    }, null, 2));
    /*
     * Create pretend answers so we can test
     * roadmap generation without Angular.
     */
    const answers = questionnaire.questions.map((question, index) => {
        const score = index % 4;
        return {
            topic: question.topic,
            question: question.prompt,
            selectedAnswer: question.options[score],
            score,
        };
    });
    console.log("\nGenerating roadmap...");
    const roadmap = await generateRoadmapDraft({
        trackTitle: "Front-End Development",
        trackDescription: "Build accessible and responsive browser applications using HTML, CSS, JavaScript, and a modern framework.",
        learnerGoal: "Become employable as a junior front-end developer.",
        weeklyHours: 8,
        targetMonths: 6,
        computedLevel: "BEGINNER",
        answers,
    });
    console.log("\nRoadmap generated successfully:");
    console.log(JSON.stringify({
        title: roadmap.title,
        summary: roadmap.summary,
        moduleCount: roadmap.modules.length,
        firstModule: roadmap.modules[0],
    }, null, 2));
}
main().catch(error => {
    console.error("\nAI test failed:", error);
    process.exitCode = 1;
});
