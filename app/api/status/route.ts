import { connection } from "next/server";
import { claudeConfigured } from "@/lib/ai/claude";
import { geminiConfigured } from "@/lib/ai/gemini";

// Which AI this deployment would use, and which build it is. Never shows any key or part of one.
// Helps answer "is the key reaching this site?" without opening Vercel.
export async function GET() {
  await connection(); // read the settings at request time, not at build time
  const ai = geminiConfigured() ? "gemini" : claudeConfigured() ? "claude" : "demo (no AI key found in this deployment's settings)";
  return Response.json({
    ai,
    gemini_model: geminiConfigured() ? process.env.GEMINI_MODEL || "gemini-pro-latest" : null,
    vercel_environment: process.env.VERCEL_ENV ?? "not on Vercel",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
