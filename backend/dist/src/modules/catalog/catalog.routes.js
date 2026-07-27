import { Router } from "express";
import { HttpError } from "../../errors/http-error.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { findPublishedTrackBySlug, listPublishedTracks } from "../../repositories/catalog.repository.js";
import { captureEvent } from "../../services/analytics.service.js";
import { routeParam } from "../../utils/route-param.js";
export const catalogRouter = Router();
catalogRouter.get("/", asyncHandler(async (request, response) => {
    const tracks = await listPublishedTracks();
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: request.session.visitorId,
        eventName: "CATALOG_VIEWED",
    });
    response.json({ tracks });
}));
catalogRouter.get("/:slug", asyncHandler(async (request, response) => {
    const slug = routeParam(request, "slug");
    const track = await findPublishedTrackBySlug(slug);
    if (!track)
        throw new HttpError(404, "TRACK_NOT_FOUND", "The roadmap track was not found.");
    await captureEvent({
        userId: request.session.user?.id,
        sessionId: request.session.visitorId,
        eventName: "TRACK_VIEWED",
        properties: { trackId: track.id, slug: track.slug },
    });
    response.json({ track });
}));
