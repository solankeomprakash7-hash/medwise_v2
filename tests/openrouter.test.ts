import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// OpenRouter is never called in tests: fetch is replaced by a stand-in that records the request.
vi.mock("server-only", () => ({}));
const { OpenRouterAiClient, OPENROUTER_URL } = await import("@/lib/ai/openrouter");
const { AiNoAnswer } = await import("@/lib/ai/client");

let lastCall: { url: string; init: RequestInit } | null = null;
const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    lastCall = { url, init };
    return new Response(JSON.stringify(body), { status });
  });
const answer = (content: string, finish = "stop") => ({ model: "provider/model-1", choices: [{ finish_reason: finish, message: { content } }] });

describe("OpenRouter client", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    delete process.env.OPENROUTER_MODEL;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the instructions and the evidence pack, asks for JSON from providers that do not collect data", async () => {
    respond(200, answer('{"regimen":"x"}'));
    const client = new OpenRouterAiClient();
    expect(await client.complete("SYSTEM", "PACK")).toBe('{"regimen":"x"}');
    expect(lastCall?.url).toBe(OPENROUTER_URL);
    expect((lastCall?.init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(String(lastCall?.init.body))).toMatchObject({
      model: "openrouter/auto",
      messages: [
        { role: "system", content: "SYSTEM" },
        { role: "user", content: "PACK" },
      ],
      response_format: { type: "json_object" },
      provider: { data_collection: "deny" },
    });
    expect(client.model).toBe("provider/model-1"); // the model that answered, for the audit trail
  });

  it("uses OPENROUTER_MODEL when set, and removes a ```json fence", async () => {
    process.env.OPENROUTER_MODEL = "some/model";
    respond(200, answer('```json\n{"regimen":"x"}\n```'));
    expect(await new OpenRouterAiClient().complete("S", "P")).toBe('{"regimen":"x"}');
    expect(JSON.parse(String(lastCall?.init.body)).model).toBe("some/model");
  });

  it("a cut-off or filtered answer gives a clear 'no answer'", async () => {
    for (const finish of ["length", "content_filter"]) {
      respond(200, answer("{", finish));
      await expect(new OpenRouterAiClient().complete("S", "P")).rejects.toBeInstanceOf(AiNoAnswer);
    }
  });

  it("a bad key, no credits, the usage limit and other errors give plain messages", async () => {
    for (const [status, text] of [
      [401, "not valid"],
      [402, "no credits"],
      [429, "usage limit"],
      [404, "OpenRouter says: No endpoints found"],
    ] as const) {
      respond(status, { error: { message: "No endpoints found matching your data policy" } });
      await expect(new OpenRouterAiClient().complete("S", "P")).rejects.toThrow(text);
    }
  });
});
