import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/async-handler.js";
import { visitorId } from "../../middleware/require-auth.js";
import { captureEvent } from "../../services/analytics.service.js";
const schema = z.object({
    eventName: z.enum(["SAVE_PROMPT_VIEWED", "LOGIN_PROMPT_VIEWED", "ROADMAP_RESOURCE_CLICKED"]),
    properties: z.record(z.string(), z.unknown()).optional(),
});
export const analyticsRouter = Router();
analyticsRouter.post("/", asyncHandler(async (request, response) => {
    const input = schema.parse(request.body);
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: visitorId(request),
        eventName: input.eventName,
        properties: input.properties,
    });
    response.status(202).json({ accepted: true });
}));
