import cors from "cors";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import pg from "pg";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFoundHandler, } from "./middleware/error-handler.js";
import { sessionContext } from "./utils/session.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { assessmentRouter } from "./modules/assessments/assessment.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { roadmapRouter } from "./modules/roadmaps/roadmap.routes.js";
const app = express();
const PgStore = connectPgSimple(session);
const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
});
app.disable("x-powered-by");
if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}
app.use(helmet());
app.use(cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
}));
app.use(express.json({
    limit: "100kb",
}));
app.use(session({
    name: "rg_roadmap.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: new PgStore({
        pool,
        tableName: "session",
        createTableIfMissing: false,
    }),
    cookie: {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: env.SESSION_TTL_DAYS *
            24 *
            60 *
            60 *
            1000,
    },
}));
app.use(sessionContext);
app.get("/api/health", async (_request, response) => {
    await prisma.$queryRaw `SELECT 1`;
    response.json({
        status: "ok",
        application: env.APP_NAME,
        database: "connected",
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/auth", authRouter);
app.use("/api/tracks", catalogRouter);
app.use("/api/assessments", assessmentRouter);
app.use("/api/roadmaps", roadmapRouter);
app.use("/api/events", analyticsRouter);
app.use("/api/admin", adminRouter);
app.use(notFoundHandler);
app.use(errorHandler);
const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`${env.APP_NAME} is running on http://localhost:${env.PORT}`);
});
async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down...`);
    server.close(async () => {
        await Promise.all([
            prisma.$disconnect(),
            pool.end(),
        ]);
        process.exit(0);
    });
}
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
