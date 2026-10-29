import { AiAnswerSchema } from "@/lib/ai/answer";
import type { AiAnswer } from "@/lib/ai/answer";
import type { EvidencePack } from "./pack";
import { COVERAGE_KEYS } from "./spectrum";

// CLAUDE.md rule 2: code checks every AI answer before it is shown. Any problem → no recommendation.

export type AnswerCheck = { ok: true; answer: AiAnswer } | { ok: false; problems: string[] };

export const MAX_REASONING_WORDS = 150;

// Anything that looks like a dose: a number followed by a dose unit (rule 1: the AI never writes a dose).
const DOSE = /\d+(?:[.,]\d+)?\s*(?:mg\/kg|mg|mcg|µg|g|gm|grams?|mu|iu|units?|lakhs?|million)\b/i;

export function regimenDrugs(regimen: string): string[] {
  return regimen.split("+").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

// Text compared for citations: same words, ignoring case, spacing, curly quotes and dash styles.
function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function checkAnswer(raw: string, pack: EvidencePack): AnswerCheck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, problems: ["The AI answer was not valid JSON."] };
  }
  const result = AiAnswerSchema.safeParse(parsed);
  if (!result.success) return { ok: false, problems: ["The AI answer was not in the required format."] };
  const answer = result.data;
  const problems: string[] = [];
  const allowed = new Set(pack.allowedDrugs);
  const excluded = new Map(pack.allergyExcluded.map((e) => [e.drug, e.reason]));

  // Drugs: every drug must be in drugs.csv and not excluded for allergy.
  for (const regimen of [answer.regimen, ...answer.alternatives]) {
    for (const drug of regimenDrugs(regimen)) {
      if (excluded.has(drug)) problems.push(`"${drug}" is excluded because of ${excluded.get(drug)}.`);
      else if (!allowed.has(drug)) problems.push(`"${drug}" is not in the knowledge base drug list.`);
    }
  }

  // No doses anywhere in the AI's text.
  const texts = [
    answer.regimen, ...answer.alternatives, answer.reasoning, ...answer.flags, ...answer.key_reasons,
    ...answer.mdr_assessment.map((m) => m.reason), ...answer.coverage_needed.map((c) => c.reason),
    ...answer.stewardship.map((s) => s.text),
  ];
  if (texts.some((t) => DOSE.test(t))) problems.push("The AI answer contains a dose; doses may come only from the knowledge base.");

  // Reasoning length.
  const words = answer.reasoning.trim().split(/\s+/).length;
  if (words > MAX_REASONING_WORDS) problems.push(`The reasoning is ${words} words; the limit is ${MAX_REASONING_WORDS}.`);

  // MDR assessment: known organisms, each at most once.
  const seen = new Set<string>();
  for (const m of answer.mdr_assessment) {
    if (!pack.organisms.includes(m.organism)) problems.push(`Unknown MDR organism "${m.organism}".`);
    if (seen.has(m.organism)) problems.push(`MDR organism "${m.organism}" is assessed twice.`);
    seen.add(m.organism);
  }

  // Coverage needed: every category answered exactly once.
  for (const key of COVERAGE_KEYS) {
    const count = answer.coverage_needed.filter((c) => c.category === key).length;
    if (count !== 1) problems.push(`Coverage needed for "${key}" must be answered once (answered ${count} times).`);
  }

  // Citations: passage must be in this patient's evidence pack, quote word for word from it.
  const passages = new Map(pack.passages.map((p) => [p.passage_id, normalise(p.text)]));
  for (const c of answer.citations) {
    const text = passages.get(c.passage_id);
    if (text === undefined) problems.push(`Citation "${c.passage_id}" is not in the evidence given for this patient.`);
    else if (normalise(c.quote).split(" ").length < 3) problems.push(`Citation "${c.passage_id}": the quote is too short to check.`);
    else if (!text.includes(normalise(c.quote))) problems.push(`Citation "${c.passage_id}": the quote does not match the guideline text word for word.`);
  }

  return problems.length === 0 ? { ok: true, answer } : { ok: false, problems };
}
