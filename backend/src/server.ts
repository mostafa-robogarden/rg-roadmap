import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { prisma } from "./lib/prisma.js";

const app = express();

const port = Number(process.env.PORT ?? 4001);
const appName = process.env.APP_NAME ?? "RG Connect API";

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_request: Request, response: Response) => {
  await prisma.$queryRaw`SELECT 1`;

  response.status(200).json({
    status: "ok",
    application: appName,
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error(error);

    response.status(500).json({
      message: "An unexpected server error occurred.",
    });
  },
);

app.listen(port, "0.0.0.0", () => {
  console.log(`${appName} is running on http://localhost:${port}`);
});