import { AiNoAnswer } from "@/lib/ai/client";
import type { AiClient } from "@/lib/ai/client";
import { assessAllergies } from "./allergy";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/ai/prompt";
import { checkAnswer, regimenDrugs } from "./checks";
import { doseLines } from "./doses";
import type { DoseLine } from "./doses";
import { checkInput } from "./input";
import type { Knowledge } from "./kb";
import { buildEvidencePack } from "./pack";
import type { AntibiogramRow } from "./pack";
import { COVERAGE, coverageGiven, spectrumFit } from "./spectrum";
import type { CoverageKey, CoverageLevel, FitLine } from "./spectrum";
import { guidelineTable, sameRegimen } from "./table";
import { reviewTimeline } from "./timeline";
import type { TimelineStep } from "./timeline";
import type { TableView } from "./table";

export const DISCLAIMERS = [
  "Decision support only — verify with clinical judgement and local policy.",
  "Review at 48–72 h with culture results; de-escalate when possible.",
];
export const DISCUSS = "Discuss with ID / microbiology.";

export interface Result {
  status: "recommendation" | "no_recommendation" | "out_of_scope" | "missing_input" | "invalid_input";
  messages: string[];
  regimen?: { name: string; drugs: DoseLine[] };
  alternatives?: { name: string; drugs: DoseLine[] }[];
  mdrAssessment?: { organism: string; risk: "high" | "low"; reason: string }[];
  whyThisChoice?: string;
  interactions?: { drug: string; text: string }[]; // AI-written, not from the knowledge base
  keyReasons?: string[];
  reasoning?: string;
  coverage?: { key: CoverageKey; label: string; level: CoverageLevel }[];
  spectrumFit?: FitLine[];
  stewardship?: { action: string; text: string }[];
  timeline?: TimelineStep[];
  citations?: { passage_id: string; guideline: string; location: string; quote: string }[];
  flags: string[];
  guidelineTable?: TableView;
  tableMatch?: "matches" | "differs" | "no_table"; // the AI's regimen against the guideline table (rule 2)
  versions: { knowledgeBase: string; guidelines: { guideline: string; title: string; version: string }[] };
  disclaimers: string[];
  demo: boolean; // answered by the DEMO stand-in, not the real AI
  // Kept for the audit trail (saved with the case), not shown to clinicians.
  audit: { aiModel?: string; aiRaw?: string };
}

export async function recommend(
  rawInput: unknown,
  ai: AiClient,
  kb: Knowledge,
  antibiogram: AntibiogramRow[] = [],
): Promise<Result> {
  const versions = {
    knowledgeBase: kb.version,
    guidelines: kb.guidelines.map((g) => ({ guideline: g.guideline, title: g.title, version: g.version })),
  };
  const flags = kb.version.endsWith("-draft")
    ? [`Knowledge base ${kb.version} is a draft and not signed off: not for patient care.`]
    : [];
  const base = { flags, versions, disclaimers: DISCLAIMERS, demo: ai.demo === true, audit: {} };

  // 1. Inputs (no AI call if anything is missing or out of scope).
  const input = checkInput(rawInput, kb);
  if (!input.ok) {
    const status = input.kind === "out_of_scope" ? "out_of_scope" : input.kind === "missing" ? "missing_input" : "invalid_input";
    return { ...base, status, messages: input.messages };
  }
  const patient = input.patient;

  // Allergies that cannot be checked → stop before the AI is asked.
  const allergy = assessAllergies(patient, kb);
  if (allergy.unknown.length > 0) {
    return {
      ...base,
      status: "no_recommendation",
      messages: [
        `Allergy to ${allergy.unknown.join(", ")} cannot be checked: not found in the knowledge base drug classes.`,
        DISCUSS,
      ],
    };
  }

  // 2. Evidence pack, 3. AI decides.
  const pack = buildEvidencePack(patient, kb, allergy, antibiogram);
  let raw: string;
  try {
    raw = await ai.complete(SYSTEM_PROMPT, buildUserMessage(pack));
  } catch (error) {
    const why = error instanceof AiNoAnswer ? error.message : "The AI did not answer.";
    return { ...base, status: "no_recommendation", messages: [why, DISCUSS], audit: { aiModel: ai.model } };
  }
  const audit = { aiModel: ai.model, aiRaw: raw };

  // 4. Safety checks.
  const check = checkAnswer(raw, pack);
  if (!check.ok) return { ...base, status: "no_recommendation", messages: [...check.problems, DISCUSS], audit };
  const answer = check.answer;

  // 5. Doses from the tables, comparison with the guideline table, citations with their locations.
  const evidence = new Map(kb.evidence.map((e) => [e.passage_id, e]));
  const highRisk = answer.mdr_assessment.filter((m) => m.risk === "high").map((m) => m.organism);
  const table = guidelineTable(pack, highRisk);
  const resultFlags = [...flags, ...answer.flags];
  for (const drug of new Set([answer.regimen, ...answer.alternatives].flatMap(regimenDrugs))) {
    const reason = allergy.crossReactive.get(drug);
    if (reason) resultFlags.push(`Possible cross-reactivity: ${drug} is a beta-lactam and the patient had ${reason}.`);
  }
  for (const line of doseLines(answer.regimen, patient, kb)) {
    if (line.aware === "Not recommended") {
      resultFlags.push(`${line.drug} is on the WHO AWaRe "Not recommended" list of fixed-dose combinations.`);
    }
  }
  const given = coverageGiven(answer.regimen, kb);
  const fit = spectrumFit(answer.coverage_needed, given);
  for (const line of fit.filter((f) => f.status === "missing")) {
    resultFlags.push(`Coverage needed but not given: ${line.label}.`);
  }
  const sourceLabel = (code: string) => kb.vocabularyLabels.get(`source:${code}`) ?? code;
  if (patient.extra_sources.length > 0) {
    resultFlags.push(
      `More than one suspected source: the guideline table comparison uses the main source (${sourceLabel(patient.source)}). ` +
        `Check that the regimen also covers: ${patient.extra_sources.map(sourceLabel).join(", ")}.`,
    );
  }
  let tableMatch: Result["tableMatch"] = "no_table";
  if (table.note) resultFlags.push(table.note);
  else if (table.firstChoice) {
    tableMatch = [table.firstChoice, ...table.alternatives].some((option) => sameRegimen(option, answer.regimen))
      ? "matches"
      : "differs";
    if (tableMatch === "differs") resultFlags.push(`Differs from guideline table: the table suggests ${table.firstChoice}.`);
  }

  return {
    ...base,
    status: "recommendation",
    messages: [],
    regimen: { name: answer.regimen, drugs: doseLines(answer.regimen, patient, kb) },
    alternatives: answer.alternatives.map((name) => ({ name, drugs: doseLines(name, patient, kb) })),
    mdrAssessment: answer.mdr_assessment,
    whyThisChoice: answer.why_this_choice,
    interactions: answer.interactions,
    keyReasons: answer.key_reasons,
    reasoning: answer.reasoning,
    coverage: COVERAGE.map(({ key, label }) => ({ key, label, level: given[key] })),
    spectrumFit: fit,
    stewardship: answer.stewardship,
    timeline: reviewTimeline(patient, kb),
    citations: answer.citations.map((c) => ({
      passage_id: c.passage_id,
      guideline: evidence.get(c.passage_id)?.guideline ?? "",
      location: evidence.get(c.passage_id)?.location ?? "",
      quote: c.quote,
    })),
    flags: resultFlags,
    guidelineTable: table,
    tableMatch,
    audit,
  };
}
