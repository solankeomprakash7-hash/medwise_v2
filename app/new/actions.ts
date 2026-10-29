"use server";

import { DemoAiClient } from "@/lib/ai/demo";
import { loadKnowledge } from "@/lib/recommend/kb";
import { recommend } from "@/lib/recommend/recommend";
import type { Result } from "@/lib/recommend/recommend";

// Runs on the server. Nothing is saved yet (saving comes with login). Uses the DEMO stand-in until the real
// AI is connected; the result screen says so.
export async function getRecommendation(details: unknown): Promise<Omit<Result, "audit">> {
  const { audit, ...shown } = await recommend(details, new DemoAiClient(), loadKnowledge());
  void audit; // kept for the saved case once login exists; not sent to the browser
  return shown;
}
