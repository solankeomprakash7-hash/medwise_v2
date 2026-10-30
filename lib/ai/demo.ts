import type { Row } from "@/lib/knowledge/tables";
import type { AiAnswer } from "./answer";
import { AiNoAnswer } from "./client";
import type { AiClient } from "./client";

// DEMO stand-in for the real AI, used until the paid API key is set up. It does not reason: it takes the
// guideline table's choice from the evidence pack, so the result screen and every safety check can be shown
// working. Every answer is labelled as a demo.

interface Pack {
  patient: { source: string; setting: string; severity: string; prior_mdr: string[] };
  passages: { passage_id: string; organisms: string; text: string }[];
  guideline_table: { base_regimen: Row | null; mdr_coverage: Row[] };
  allowed_drugs: string[];
  organisms: string[];
}

const split = (list: string) => list.split(";").map((s) => s.trim()).filter(Boolean);
const words = (code: string) => code.replace(/_/g, " ");
const drugsOf = (regimen: string) => regimen.split("+").map((d) => d.trim());

// A quote copied from a passage: the words around the first mention of the drug. The national guideline's
// tables (NCDC) are searched first, and passages about the patient's high-risk organisms before others, so
// the quote comes from the row the table choice was taken from.
function quoteFor(drug: string, passages: Pack["passages"], high: string[]): { passage_id: string; quote: string } | null {
  const score = (p: Pack["passages"][number]) =>
    (split(p.organisms).some((o) => high.includes(o)) ? 2 : 0) + (p.passage_id.startsWith("ncdc") ? 1 : 0);
  const ordered = [...passages].sort((a, b) => score(b) - score(a));
  for (const p of ordered) {
    const at = p.text.toLowerCase().indexOf(drug.toLowerCase());
    if (at < 0) continue;
    const words = p.text.slice(at).split(/\s+/).slice(0, 6).join(" ");
    return { passage_id: p.passage_id, quote: words.replace(/[|…]+$/, "").trim() };
  }
  return null;
}

export function demoAnswer(pack: Pack): AiAnswer | null {
  const base = pack.guideline_table.base_regimen;
  if (!base) return null;
  const allowed = new Set(pack.allowed_drugs);
  const usable = (regimen: string) => drugsOf(regimen).every((d) => allowed.has(d));
  const high = pack.organisms.filter((o) => pack.patient.prior_mdr.includes(o));

  let options = [base.first_choice, ...split(base.alternative)];
  if (high.length > 0) {
    const rule = pack.guideline_table.mdr_coverage.find((r) => split(r.organisms).sort().join(";") === [...high].sort().join(";"));
    if (rule) options = [rule.action === "replace" ? rule.regimen : `${base.first_choice} + ${rule.regimen}`];
  }
  const choices = options.filter(usable);
  const regimen = choices[0] ?? options[0];

  const citations = drugsOf(regimen).flatMap((d) => quoteFor(d, pack.passages, high) ?? []).slice(0, 2);
  citations.push(
    high.length > 0
      ? { passage_id: "ssc-25", quote: "at high risk of infection with a specific multidrug resistant (MDR) pathogen" }
      : { passage_id: "ssc-26", quote: "at low risk of infection with a specific MDR pathogen" },
  );

  const lungCommunity = pack.patient.source === "lung" && pack.patient.setting === "community_acquired";
  const need = (category: AiAnswer["coverage_needed"][number]["category"], needed: boolean, reason: string) => ({
    category,
    needed,
    reason,
  });
  return {
    regimen,
    alternatives: choices.slice(1, 3),
    mdr_assessment: pack.organisms.map((organism) => ({
      organism,
      risk: high.includes(organism) ? "high" : "low",
      reason: high.includes(organism) ? "Previous MDR organism recorded (demo rule)." : "No previous organism recorded (demo rule).",
    })),
    why_this_choice: `DEMO: the guideline table's choice for a ${words(pack.patient.source)} source, ${words(pack.patient.setting)}, ${words(pack.patient.severity)}.`,
    interactions: drugsOf(regimen).map((drug) => ({
      drug,
      text: "DEMO: the real AI will list the interactions and cautions that matter for this patient.",
    })),
    key_reasons: [
      "Guideline table choice for this source, setting and severity.",
      high.length > 0 ? `Previous ${high.join(", ").toUpperCase()} recorded.` : "No previous MDR organism recorded.",
      "DEMO stand-in: the real AI will give patient-specific reasons.",
    ],
    coverage_needed: [
      need("gram_positive", true, "Usual pathogens (demo rule)."),
      need("gram_negative", true, "Usual pathogens (demo rule)."),
      need("pseudomonas", high.includes("pseudomonas"), "Demo rule: previous organism only."),
      need("mrsa", high.includes("mrsa"), "Demo rule: previous organism only."),
      need("esbl", high.includes("esbl"), "Demo rule: previous organism only."),
      need("cre", high.includes("cre"), "Demo rule: previous organism only."),
      need("anaerobes", pack.patient.source === "intra_abdominal", "Demo rule: intra-abdominal source only."),
      need("atypicals", lungCommunity, "Demo rule: community-acquired pneumonia only."),
    ],
    reasoning:
      "DEMO stand-in answer. This is the guideline table's choice for the entered source, setting and severity, " +
      "not AI reasoning. The real AI will weigh the patient's risk factors and the evidence passages.",
    citations,
    stewardship: [{ action: "review_at_48_72h", text: "Review cultures and narrow or stop antibiotics when possible." }],
    flags: ["DEMO stand-in answer: not real AI reasoning."],
  };
}

export class DemoAiClient implements AiClient {
  model = "demo-stand-in";
  demo = true;

  async complete(_system: string, user: string): Promise<string> {
    const answer = demoAnswer(JSON.parse(user) as Pack);
    if (!answer) throw new AiNoAnswer("Demo stand-in: the guideline table has no regimen yet for this source, setting and severity.");
    return JSON.stringify(answer);
  }
}
