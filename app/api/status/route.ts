import { connection } from "next/server";
import { claudeConfigured } from "@/lib/ai/claude";
import { geminiConfigured } from "@/lib/ai/gemini";
import { OPENROUTER_DEFAULT_MODEL, openRouterConfigured } from "@/lib/ai/openrouter";

// Which AI this deployment would use, and which build it is. Never shows any key or part of one: only the NAMES
// of settings that look like AI keys, so a misspelt name can be spotted.
// Helps answer "is the key reaching this site?" without opening Vercel.
export async function GET() {
  await connection(); // read the settings at request time, not at build time
  const ai = openRouterConfigured()
    ? "openrouter"
    : geminiConfigured()
      ? "gemini"
      : claudeConfigured()
        ? "claude"
        : "demo (no AI key found in this deployment's settings)";
  return Response.json({
    ai,
    ai_setting_names_found: Object.keys(process.env)
      .filter((name) => /gemini|anthropic|google|openrouter|^default$/i.test(name))
      .map((name) => JSON.stringify(name)), // quoted, so a stray space shows
    openrouter_model: openRouterConfigured() ? process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL : null,
    gemini_model: geminiConfigured() ? process.env.GEMINI_MODEL || "gemini-pro-latest" : null,
    vercel_environment: process.env.VERCEL_ENV ?? "not on Vercel",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
