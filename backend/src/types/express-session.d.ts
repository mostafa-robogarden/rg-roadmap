import "express-session";

declare module "express-session" {
  interface SessionData {
    visitorId?: string;
    csrfToken?: string;

    user?: {
      id: string;
      name: string;
      email: string;
      role: "LEARNER" | "ADMIN";
    };
  }
}