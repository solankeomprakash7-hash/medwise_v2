import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiAnswerSchema } from "./answer";
import { AiNoAnswer } from "./client";
import type { AiClient } from "./client";

// The real AI (CLAUDE.md rule 3: server only). Used only when ANTHROPIC_API_KEY is set in the hosting settings;
// otherwise the app keeps the DEMO stand-in. Every answer still goes through the safety checks in
// lib/recommend/checks.ts before anything is shown.

export const CLAUDE_MODEL = "claude-opus-5-5";

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export class ClaudeAiClient implements AiClient {
  model = CLAUDE_MODEL;
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 240_000, maxRetries: 1 });

  async complete(system: string, user: string): Promise<string> {
    let response;
    try {
      response = await this.client.beta.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: user }],
        // Careful reasoning; the answer is held to the app's JSON format.
        output_config: { effort: "high", format: zodOutputFormat(AiAnswerSchema) },
        // If the model declines, the service may retry on another Claude model; the model used is recorded.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) throw new AiNoAnswer("The AI key is not valid. Check the hosting settings.");
      if (error instanceof Anthropic.RateLimitError) throw new AiNoAnswer("The AI is busy. Please try again in a minute.");
      if (error instanceof Anthropic.APIConnectionError) throw new AiNoAnswer("Could not reach the AI service.");
      throw error;
    }
    this.model = response.model;
    if (response.stop_reason === "refusal") throw new AiNoAnswer("The AI declined to answer this case.");
    if (response.stop_reason === "max_tokens") throw new AiNoAnswer("The AI answer was cut off before it finished.");
    // The raw text is returned so the app's own checks parse and verify it (the parsed copy is not trusted).
    return response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  }
}
