import { randomBytes, randomUUID, timingSafeEqual, } from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
const SAFE_METHODS = new Set([
    "GET",
    "HEAD",
    "OPTIONS",
]);
export function sessionContext(request, response, next) {
    request.session.visitorId ??= randomUUID();
    request.session.csrfToken ??=
        randomBytes(32).toString("base64url");
    response.cookie("XSRF-TOKEN", request.session.csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
    if (!SAFE_METHODS.has(request.method)) {
        const header = request.header("x-xsrf-token");
        const expected = request.session.csrfToken;
        if (!header || !expected) {
            next(new HttpError(403, "XSRF_TOKEN_REQUIRED", "A valid XSRF token is required."));
            return;
        }
        const left = Buffer.from(header);
        const right = Buffer.from(expected);
        if (left.length !== right.length ||
            !timingSafeEqual(left, right)) {
            next(new HttpError(403, "INVALID_XSRF_TOKEN", "The XSRF token is invalid."));
            return;
        }
    }
    next();
}
export function regenerateSession(request) {
    const visitorId = request.session.visitorId;
    const csrfToken = request.session.csrfToken;
    return new Promise((resolve, reject) => {
        request.session.regenerate(error => {
            if (error) {
                reject(error);
                return;
            }
            request.session.visitorId =
                visitorId ?? randomUUID();
            request.session.csrfToken =
                csrfToken ??
                    randomBytes(32).toString("base64url");
            resolve();
        });
    });
}
export function destroySession(request) {
    return new Promise((resolve, reject) => {
        request.session.destroy(error => error ? reject(error) : resolve());
    });
}
