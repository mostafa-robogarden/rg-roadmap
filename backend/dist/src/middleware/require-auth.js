import { HttpError } from "../errors/http-error.js";
export function requireAuth(request, _response, next) {
    if (!request.session.user) {
        next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
        return;
    }
    next();
}
export function requireAdmin(request, _response, next) {
    if (!request.session.user) {
        next(new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required."));
        return;
    }
    if (request.session.user.role !== "ADMIN") {
        next(new HttpError(403, "ADMIN_REQUIRED", "Administrator access is required."));
        return;
    }
    next();
}
export function currentUserId(request) {
    const id = request.session.user?.id;
    if (!id) {
        throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Authentication is required.");
    }
    return id;
}
export function visitorId(request) {
    const id = request.session.visitorId;
    if (!id) {
        throw new HttpError(500, "SESSION_CONTEXT_MISSING", "Session context is unavailable.");
    }
    return id;
}
