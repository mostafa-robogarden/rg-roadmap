import { recordEvent } from "../repositories/analytics.repository.js";

export async function captureEvent(input: {
  userId?: string;
  sessionId: string;
  eventName: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  await recordEvent(input);
}
