import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiAnswerSchema } from "@/lib/ai/answer";

// The real AI is held to the same answer format the safety checks expect.
describe("AI answer format sent to the real AI", () => {
  it("converts to a JSON schema with every answer key required", () => {
    const format = zodOutputFormat(AiAnswerSchema) as unknown as { schema: { required: string[]; additionalProperties: boolean } };
    expect(format.schema.required).toEqual(expect.arrayContaining(["regimen", "why_this_choice", "interactions", "citations"]));
    expect(format.schema.additionalProperties).toBe(false);
  });
});
