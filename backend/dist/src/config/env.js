import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    APP_NAME: z
        .string()
        .default("RG Roadmap API"),
    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(4002),
    NODE_ENV: z
        .enum([
        "development",
        "test",
        "production",
    ])
        .default("development"),
    DATABASE_URL: z
        .string()
        .min(1),
    FRONTEND_ORIGIN: z
        .string()
        .url()
        .default("http://localhost:4200"),
    SESSION_SECRET: z
        .string()
        .min(32),
    SESSION_TTL_DAYS: z.coerce
        .number()
        .int()
        .positive()
        .default(7),
    AI_ENABLED: z
        .string()
        .default("true")
        .transform(value => value.toLowerCase() === "true"),
    AI_PROVIDER: z
        .literal("ollama")
        .default("ollama"),
    AI_MODEL: z
        .string()
        .min(1)
        .default("qwen3:4b-instruct"),
    OLLAMA_BASE_URL: z
        .string()
        .url()
        .default("http://localhost:11434"),
    AI_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(10_000)
        .max(600_000)
        .default(600_000),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment configuration.");
}
export const env = parsed.data;
