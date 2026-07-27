import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";

export function notFoundHandler(
  request: Request,
  response: Response,
): void {
  response.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message:
        `No route exists for ${request.method} ${request.path}.`,
    },
  });
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid data.",
        fields: error.flatten().fieldErrors,
      },
    });

    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  console.error("Unhandled error:", error);

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected server error occurred."
          : error instanceof Error
            ? error.message
            : "An unexpected server error occurred.",
    },
  });
}