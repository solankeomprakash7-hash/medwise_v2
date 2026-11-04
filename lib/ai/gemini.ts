import "server-only";
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { AiNoAnswer } from "./client";
import type { AiClient } from "./client";

// Google's AI service (generativelanguage.googleapis.com) as the AI (owner decisions 2026-10-30 and 2026-11-04;
// CLAUDE.md rule 3: server only). The key is GEMINI_API_KEY, or GOOGLE_GEMMA for the open Gemma models (same
// service, same kind of key). Every answer still goes through the safety checks in lib/recommend/checks.ts
// before anything is shown.

// "gemini-pro-latest" follows Google's current Pro model. Set GEMINI_MODEL to pin an exact model instead.
// The version that actually answered is recorded for the audit trail (response.modelVersion).
export const GEMINI_DEFAULT_MODEL = "gemini-pro-latest";
// With only the GOOGLE_GEMMA key, the largest Gemma model listed by Google's library (@google/genai 2.32).
export const GEMMA_DEFAULT_MODEL = "gemma-4-31b-it";

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMMA;
export const geminiConfigured = () => Boolean(apiKey());
export const googleModel = () =>
  process.env.GEMINI_MODEL || (process.env.GEMINI_API_KEY ? GEMINI_DEFAULT_MODEL : GEMMA_DEFAULT_MODEL);

// Gemma models do not take a separate system instruction or a JSON-only mode, so the instructions go at the start
// of the message and the JSON object is taken from the reply (the checks still verify it exactly).
const isGemma = (model: string) => /^gemma/i.test(model);
const jsonObject = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
};

export class GeminiAiClient implements AiClient {
  model = googleModel();
  private readonly ai = new GoogleGenAI({ apiKey: apiKey(), httpOptions: { timeout: 240_000 } });

  async complete(system: string, user: string): Promise<string> {
    const gemma = isGemma(this.model);
    let response;
    try {
      response = await this.ai.models.generateContent(
        gemma
          ? { model: this.model, contents: `${system}\n\nEvidence pack (JSON):\n${user}` }
          : // JSON only; the app's own checks verify the exact format (lib/ai/answer.ts).
            { model: this.model, contents: user, config: { systemInstruction: system, responseMimeType: "application/json" } },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 && /api key/i.test(error.message)) {
          throw new AiNoAnswer(`The AI key is not valid. Check the hosting settings. Google says: ${error.message.slice(0, 300)}`);
        }
        if (error.status === 401 || error.status === 403) throw new AiNoAnswer("The AI key is not valid or not allowed. Check the hosting settings.");
        if (error.status === 404) throw new AiNoAnswer(`The AI model "${this.model}" is not available. Check GEMINI_MODEL in the hosting settings.`);
        if (error.status === 429) throw new AiNoAnswer("The AI is busy or its usage limit is reached. Please try again in a minute.");
        throw new AiNoAnswer(`The AI could not answer (error ${error.status}). Google says: ${error.message.slice(0, 300)}`);
      }
      throw error;
    }
    if (response.modelVersion) this.model = response.modelVersion;
    if (response.promptFeedback?.blockReason) throw new AiNoAnswer("The AI declined to answer this case.");
    const finish = response.candidates?.[0]?.finishReason;
    if (finish === FinishReason.MAX_TOKENS) throw new AiNoAnswer("The AI answer was cut off before it finished.");
    if (finish && finish !== FinishReason.STOP) throw new AiNoAnswer("The AI declined to answer this case.");
    // The raw text is returned so the app's own checks parse and verify it.
    return gemma ? jsonObject(response.text ?? "") : (response.text ?? "");
  }
}
