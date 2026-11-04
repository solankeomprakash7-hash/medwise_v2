import "server-only";
import { AiNoAnswer } from "./client";
import type { AiClient } from "./client";

// OpenRouter as the AI (owner decision 2026-11-04; CLAUDE.md rule 3: server only). Used when OPENROUTER_API_KEY is
// set in the hosting settings. Every answer still goes through the safety checks in lib/recommend/checks.ts before
// anything is shown. Request format from OpenRouter's own SDK (@openrouter/sdk 1.5.42): POST /chat/completions,
// Bearer key, response_format json_object, provider.data_collection.

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// "openrouter/auto" lets OpenRouter pick a model. Set OPENROUTER_MODEL to pin one (recommended for consistent
// answers). The model that actually answered is recorded for the audit trail.
export const OPENROUTER_DEFAULT_MODEL = "openrouter/auto";

export const openRouterConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

// Some models wrap JSON in a ```json fence even when asked for JSON only; the fence is removed, nothing else.
const unfence = (text: string) => text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");

interface ChatResponse {
  model?: string;
  choices?: { finish_reason?: string | null; message?: { content?: string | null } }[];
  error?: { message?: string };
}

export class OpenRouterAiClient implements AiClient {
  model = process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL;

  async complete(system: string, user: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "MedWise" },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          // Patient details go only to providers that do not store or train on what they are sent.
          provider: { data_collection: "deny" },
          stream: false,
        }),
        signal: AbortSignal.timeout(240_000),
      });
    } catch {
      throw new AiNoAnswer("Could not reach the AI service (OpenRouter), or it took too long.");
    }
    const body = (await res.json().catch(() => ({}))) as ChatResponse;
    if (!res.ok) {
      const detail = body.error?.message ? ` OpenRouter says: ${body.error.message}` : "";
      if (res.status === 401) throw new AiNoAnswer("The AI key is not valid. Check OPENROUTER_API_KEY in the hosting settings.");
      if (res.status === 402) throw new AiNoAnswer("The OpenRouter account has no credits left. Add credits on openrouter.ai.");
      if (res.status === 429) throw new AiNoAnswer("The AI is busy or its usage limit is reached. Please try again in a minute.");
      throw new AiNoAnswer(`The AI could not answer (error ${res.status}).${detail}`);
    }
    if (body.model) this.model = body.model;
    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") throw new AiNoAnswer("The AI answer was cut off before it finished.");
    if (choice?.finish_reason === "content_filter" || choice?.finish_reason === "error") throw new AiNoAnswer("The AI declined to answer this case.");
    // The text is returned so the app's own checks parse and verify it.
    return unfence(choice?.message?.content ?? "");
  }
}
