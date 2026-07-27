import { recordEvent } from "../repositories/analytics.repository.js";
export async function captureEvent(input) {
    await recordEvent(input);
}
