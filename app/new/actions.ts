"use server";

import { ClaudeAiClient, claudeConfigured } from "@/lib/ai/claude";
import { DemoAiClient } from "@/lib/ai/demo";
import { GeminiAiClient, geminiConfigured } from "@/lib/ai/gemini";
import { loadKnowledge } from "@/lib/recommend/kb";
import { recommend } from "@/lib/recommend/recommend";
import type { Result } from "@/lib/recommend/recommend";

// Runs on the server. Nothing is saved yet (saving comes with login). The AI is chosen from the hosting settings:
// Gemini when GEMINI_API_KEY is set (owner decision 2026-10-30), otherwise Claude when ANTHROPIC_API_KEY is set,
// otherwise the DEMO stand-in; the result screen says when it is the demo.
export async function getRecommendation(details: unknown): Promise<Omit<Result, "audit">> {
  const ai = geminiConfigured() ? new GeminiAiClient() : claudeConfigured() ? new ClaudeAiClient() : new DemoAiClient();
  const { audit, ...shown } = await recommend(details, ai, loadKnowledge());
  void audit; // kept for the saved case once login exists; not sent to the browser
  return shown;
}
