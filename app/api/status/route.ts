import { connection } from "next/server";
import { claudeConfigured } from "@/lib/ai/claude";
import { geminiConfigured, googleModel } from "@/lib/ai/gemini";
import { OPENROUTER_DEFAULT_MODEL, openRouterConfigured } from "@/lib/ai/openrouter";

// Which AI this deployment would use, and which build it is. Never shows any key or part of one: only the NAMES
// of settings that look like AI keys, so a misspelt name can be spotted, and what kind of key each one looks like.
// Helps answer "is the key reaching this site?" without opening Vercel.
// What kind of key a setting holds, judged only from its shape (never shown, not even in part).
function keyShape(value: string) {
  const v = value.trim().replace(/^["']+|["']+$/g, "").trim();
  const looksLike = v.startsWith("AIza")
    ? "Google AI key"
    : v.startsWith("sk-or-")
      ? "OpenRouter key"
      : v.startsWith("sk-ant-")
        ? "Anthropic key"
        : v.startsWith("hf_")
          ? "Hugging Face token"
          : v.startsWith("sk-")
            ? "OpenAI-style key"
            : "unknown kind of key";
  return { looks_like: looksLike, length: value.length, extra_spaces_or_quotes: value !== v || /["'\s]/.test(v) };
}

export async function GET() {
  await connection(); // read the settings at request time, not at build time
  const ai = openRouterConfigured()
    ? "openrouter"
    : geminiConfigured()
      ? "google (gemini / gemma)"
      : claudeConfigured()
        ? "claude"
        : "demo (no AI key found in this deployment's settings)";
  return Response.json({
    ai,
    ai_setting_names_found: Object.keys(process.env)
      .filter((name) => /gemini|gemma|anthropic|google|openrouter|^default$/i.test(name))
      .map((name) => JSON.stringify(name)), // quoted, so a stray space shows
    ai_key_shapes: Object.fromEntries(
      ["OPENROUTER_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMMA", "ANTHROPIC_API_KEY"]
        .filter((name) => process.env[name])
        .map((name) => [name, keyShape(process.env[name] as string)]),
    ),
    openrouter_model: openRouterConfigured() ? process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL : null,
    google_model: geminiConfigured() ? googleModel() : null,
    vercel_environment: process.env.VERCEL_ENV ?? "not on Vercel",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
