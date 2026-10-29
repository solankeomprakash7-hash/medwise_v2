import { z } from "zod";

// The only answer format the app accepts from the AI (CLINICAL_RULES.md, "The AI's instructions").
export const AiAnswerSchema = z
  .object({
    regimen: z.string().min(1),
    alternatives: z.array(z.string().min(1)).max(2),
    mdr_assessment: z.array(
      z.object({ organism: z.string(), risk: z.enum(["high", "low"]), reason: z.string() }).strict(),
    ),
    reasoning: z.string().min(1),
    citations: z.array(z.object({ passage_id: z.string(), quote: z.string().min(1) }).strict()).min(1),
    flags: z.array(z.string()),
  })
  .strict();

export type AiAnswer = z.infer<typeof AiAnswerSchema>;
