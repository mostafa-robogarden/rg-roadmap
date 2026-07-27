import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    APP_NAME: z.string().default("RG Roadmap API"),
    PORT: z.coerce
        .number()
        .int()
        .positive()
        .default(4002),
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    DATABASE_URL: z.string().min(1),
    FRONTEND_ORIGIN: z
        .string()
        .url()
        .default("http://localhost:4200"),
    SESSION_SECRET: z.string().min(32),
    SESSION_TTL_DAYS: z.coerce
        .number()
        .int()
        .positive()
        .default(7),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment configuration.");
}
export const env = parsed.data;
