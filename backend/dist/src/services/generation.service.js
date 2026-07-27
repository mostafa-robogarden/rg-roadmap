import { HttpError } from "../errors/http-error.js";
import { findTemplate } from "../repositories/roadmap.repository.js";
export async function generateRoadmap(trackId, level) {
    const template = await findTemplate(trackId, level);
    if (!template) {
        throw new HttpError(404, "ROADMAP_TEMPLATE_NOT_FOUND", "No roadmap template is available for this result.");
    }
    return {
        templateId: template.id,
        track: template.track,
        level: template.level,
        title: template.title,
        description: template.description,
        milestones: template.milestones.map((milestone) => ({
            id: milestone.id,
            sortOrder: milestone.sortOrder,
            title: milestone.title,
            description: milestone.description,
            estimatedHours: milestone.estimatedHours,
            resources: milestone.resources,
        })),
    };
}
