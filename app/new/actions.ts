"use server";

import { ClaudeAiClient, claudeConfigured } from "@/lib/ai/claude";
import { DemoAiClient } from "@/lib/ai/demo";
import { loadKnowledge } from "@/lib/recommend/kb";
import { recommend } from "@/lib/recommend/recommend";
import type { Result } from "@/lib/recommend/recommend";

// Runs on the server. Nothing is saved yet (saving comes with login). Uses the real AI when ANTHROPIC_API_KEY
// is set in the hosting settings, otherwise the DEMO stand-in; the result screen says which.
export async function getRecommendation(details: unknown): Promise<Omit<Result, "audit">> {
  const ai = claudeConfigured() ? new ClaudeAiClient() : new DemoAiClient();
  const { audit, ...shown } = await recommend(details, ai, loadKnowledge());
  void audit; // kept for the saved case once login exists; not sent to the browser
  return shown;
}
