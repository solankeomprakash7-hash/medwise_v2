import "server-only";
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
import { AiNoAnswer } from "./client";
import type { AiClient } from "./client";

// Google Gemini as the AI (owner decision 2026-10-30; CLAUDE.md rule 3: server only). Used when GEMINI_API_KEY is
// set in the hosting settings. Every answer still goes through the safety checks in lib/recommend/checks.ts
// before anything is shown.

// "gemini-pro-latest" follows Google's current Pro model. Set GEMINI_MODEL to pin an exact model instead.
// The version that actually answered is recorded for the audit trail (response.modelVersion).
export const GEMINI_DEFAULT_MODEL = "gemini-pro-latest";

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export class GeminiAiClient implements AiClient {
  model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  private readonly ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 240_000 } });

  async complete(system: string, user: string): Promise<string> {
    let response;
    try {
      response = await this.ai.models.generateContent({
        model: this.model,
        contents: user,
        // JSON only; the app's own checks verify the exact format (lib/ai/answer.ts).
        config: { systemInstruction: system, responseMimeType: "application/json" },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 && /api key/i.test(error.message)) throw new AiNoAnswer("The AI key is not valid. Check the hosting settings.");
        if (error.status === 401 || error.status === 403) throw new AiNoAnswer("The AI key is not valid or not allowed. Check the hosting settings.");
        if (error.status === 404) throw new AiNoAnswer(`The AI model "${this.model}" is not available. Check GEMINI_MODEL in the hosting settings.`);
        if (error.status === 429) throw new AiNoAnswer("The AI is busy or its usage limit is reached. Please try again in a minute.");
      }
      throw error;
    }
    if (response.modelVersion) this.model = response.modelVersion;
    if (response.promptFeedback?.blockReason) throw new AiNoAnswer("The AI declined to answer this case.");
    const finish = response.candidates?.[0]?.finishReason;
    if (finish === FinishReason.MAX_TOKENS) throw new AiNoAnswer("The AI answer was cut off before it finished.");
    if (finish && finish !== FinishReason.STOP) throw new AiNoAnswer("The AI declined to answer this case.");
    // The raw text is returned so the app's own checks parse and verify it.
    return response.text ?? "";
  }
}
