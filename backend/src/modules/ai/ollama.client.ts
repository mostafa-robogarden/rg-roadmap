import { z } from "zod";

import { env } from "../../config/env.js";
import { HttpError } from "../../errors/http-error.js";

export interface OllamaMessage {
  role:
    | "system"
    | "user"
    | "assistant";

  content: string;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };

  error?: string;
}

export async function callOllamaStructured<T>(
  schema: z.ZodType<T>,
  messages: OllamaMessage[],
): Promise<T> {
  if (!env.AI_ENABLED) {
    throw new HttpError(
      503,
      "AI_DISABLED",
      "AI generation is currently disabled.",
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    env.AI_TIMEOUT_MS,
  );

  try {
    const response = await fetch(
      `${env.OLLAMA_BASE_URL}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        signal: controller.signal,

        body: JSON.stringify({
          model: env.AI_MODEL,

          messages,

          stream: false,

          /*
           * Zod 4 converts our validation
           * schema into JSON Schema.
           */
          format:
            z.toJSONSchema(schema),

          /*
           * Keep the model loaded briefly so
           * the second request is faster.
           */
          keep_alive: "10m",

          options: {
            temperature: 0.2,
          },
        }),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      let providerMessage =
        responseText;

      try {
        const errorPayload =
          JSON.parse(
            responseText,
          ) as OllamaChatResponse;

        providerMessage =
          errorPayload.error ??
          responseText;
      } catch {
        // Use the raw text.
      }

      throw new HttpError(
        503,
        "OLLAMA_REQUEST_FAILED",
        `Ollama request failed: ${providerMessage}`,
      );
    }

    const payload =
      JSON.parse(
        responseText,
      ) as OllamaChatResponse;

    const content =
      payload.message?.content;

    if (!content) {
      throw new HttpError(
        502,
        "OLLAMA_EMPTY_RESPONSE",
        "Ollama returned an empty response.",
      );
    }

    let parsedContent: unknown;

    try {
      parsedContent =
        JSON.parse(content);
    } catch {
      throw new HttpError(
        502,
        "OLLAMA_INVALID_JSON",
        "Ollama returned content that was not valid JSON.",
      );
    }

    /*
     * Never trust the model output merely
     * because Ollama used a JSON Schema.
     *
     * Validate again inside our application.
     */
    const validated =
      schema.safeParse(
        parsedContent,
      );

    if (!validated.success) {
      console.error(
        "Ollama schema validation failed:",
        validated.error.flatten(),
      );

      throw new HttpError(
        502,
        "OLLAMA_SCHEMA_VALIDATION_FAILED",
        "Ollama returned JSON that did not match the required structure.",
      );
    }

    return validated.data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new HttpError(
        504,
        "OLLAMA_TIMEOUT",
        `Ollama did not respond within ${env.AI_TIMEOUT_MS} ms.`,
      );
    }

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      503,
      "OLLAMA_UNAVAILABLE",
      error instanceof Error
        ? `Could not contact Ollama: ${error.message}`
        : "Could not contact Ollama.",
    );
  } finally {
    clearTimeout(timeout);
  }
}