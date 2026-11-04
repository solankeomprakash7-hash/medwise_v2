import { beforeEach, describe, expect, it, vi } from "vitest";

// The real Gemini service is never called in tests: the library's client is replaced by a stand-in that returns
// what each test sets. Enums and error types are the library's own.
const reply = vi.hoisted(() => ({ value: {} as unknown, error: null as unknown, lastRequest: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@google/genai", async (importOriginal) => {
  const real = await importOriginal<typeof import("@google/genai")>();
  class GoogleGenAI {
    models = {
      generateContent: async (request: unknown) => {
        reply.lastRequest = request;
        if (reply.error) throw reply.error;
        return reply.value;
      },
    };
  }
  return { ...real, GoogleGenAI };
});

const { ApiError, FinishReason } = await import("@google/genai");
const { GeminiAiClient } = await import("@/lib/ai/gemini");
const { AiNoAnswer } = await import("@/lib/ai/client");

const ok = (text: string) => ({ text, modelVersion: "gemini-test-001", candidates: [{ finishReason: FinishReason.STOP }] });

describe("Gemini client", () => {
  beforeEach(() => {
    reply.error = null;
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;
    delete process.env.GOOGLE_GEMMA;
  });

  it("sends the instructions and the evidence pack, asks for JSON, and returns the raw text", async () => {
    reply.value = ok('{"regimen":"x"}');
    const client = new GeminiAiClient();
    expect(client.model).toBe("gemini-pro-latest");
    expect(await client.complete("SYSTEM", "PACK")).toBe('{"regimen":"x"}');
    expect(reply.lastRequest).toMatchObject({
      model: "gemini-pro-latest",
      contents: "PACK",
      config: { systemInstruction: "SYSTEM", responseMimeType: "application/json" },
    });
    expect(client.model).toBe("gemini-test-001"); // the version that answered, for the audit trail
  });

  it("uses GEMINI_MODEL when set", () => {
    process.env.GEMINI_MODEL = "gemini-pinned";
    expect(new GeminiAiClient().model).toBe("gemini-pinned");
  });

  it("a blocked prompt, a cut-off answer or a refusal gives a clear 'no answer'", async () => {
    for (const value of [
      { promptFeedback: { blockReason: "SAFETY" }, candidates: [] },
      { text: "{", candidates: [{ finishReason: FinishReason.MAX_TOKENS }] },
      { text: "", candidates: [{ finishReason: FinishReason.SAFETY }] },
    ]) {
      reply.value = value;
      await expect(new GeminiAiClient().complete("S", "P")).rejects.toBeInstanceOf(AiNoAnswer);
    }
  });

  it("a bad key, a missing model and the usage limit give plain messages", async () => {
    for (const [status, text] of [
      [403, "not valid or not allowed"],
      [404, "is not available"],
      [429, "usage limit"],
    ] as const) {
      reply.error = new ApiError({ message: "error", status });
      await expect(new GeminiAiClient().complete("S", "P")).rejects.toThrow(text);
    }
  });

  it("with only the GOOGLE_GEMMA key, uses Gemma: instructions in the message, JSON taken from the reply", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_GEMMA = "gemma-key";
    reply.value = ok('Here is the answer:\n```json\n{"regimen":"x"}\n```');
    const client = new GeminiAiClient();
    expect(client.model).toBe("gemma-4-31b-it");
    expect(await client.complete("SYSTEM", "PACK")).toBe('{"regimen":"x"}');
    const request = reply.lastRequest as { contents: string; config?: unknown };
    expect(request.config).toBeUndefined();
    expect(request.contents.startsWith("SYSTEM")).toBe(true);
    expect(request.contents).toContain("PACK");
  });

  it("any other Google error shows Google's own short explanation", async () => {
    reply.error = new ApiError({ message: "Developer instruction is not enabled", status: 400 });
    await expect(new GeminiAiClient().complete("S", "P")).rejects.toThrow("Google says: Developer instruction is not enabled");
  });
});
