import { z } from "zod";
import { COVERAGE_KEYS } from "@/lib/recommend/spectrum";

export const STEWARDSHIP_ACTIONS = [
  "review_at_48_72h", "de_escalate", "stop", "iv_to_oral", "review_duration", "source_control", "send_cultures",
] as const;

// The only answer format the app accepts from the AI (CLINICAL_RULES.md, "The AI's instructions").
export const AiAnswerSchema = z
  .object({
    regimen: z.string().min(1),
    alternatives: z.array(z.string().min(1)).max(2),
    mdr_assessment: z.array(
      z.object({ organism: z.string(), risk: z.enum(["high", "low"]), reason: z.string() }).strict(),
    ),
    why_this_choice: z.string().min(1),
    key_reasons: z.array(z.string().min(1)).min(1).max(4),
    coverage_needed: z.array(
      z.object({ category: z.enum(COVERAGE_KEYS), needed: z.boolean(), reason: z.string() }).strict(),
    ),
    reasoning: z.string().min(1),
    citations: z.array(z.object({ passage_id: z.string(), quote: z.string().min(1) }).strict()).min(1),
    stewardship: z.array(z.object({ action: z.enum(STEWARDSHIP_ACTIONS), text: z.string().min(1) }).strict()).max(4),
    // AI-written from general pharmacology, not from the knowledge base: shown labelled "AI-written — verify"
    // (owner decision, DECISIONS 2026-10-29). Still checked for doses and drug names.
    interactions: z.array(z.object({ drug: z.string(), text: z.string().min(1) }).strict()).max(8),
    flags: z.array(z.string()),
  })
  .strict();

export type AiAnswer = z.infer<typeof AiAnswerSchema>;
