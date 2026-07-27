import type { Request } from "express";

import { HttpError } from "../errors/http-error.js";

export function routeParam(
  request: Request,
  name: string,
): string {
  const value = request.params[name];

  if (
    typeof value !== "string" ||
    !value
  ) {
    throw new HttpError(
      400,
      "INVALID_ROUTE_PARAMETER",
      `${name} is invalid.`,
    );
  }

  return value;
}