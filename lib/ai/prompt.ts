import type { EvidencePack } from "@/lib/recommend/pack";

// System prompt, following CLINICAL_RULES.md "The AI's instructions".
export const SYSTEM_PROMPT = `You are advising a qualified clinician on empiric antibiotic choice for an adult with sepsis.
Reason from the evidence pack only. Do not use outside knowledge of drugs, doses or guidelines.
Name drugs only from "allowed_drugs", written exactly as listed; join combinations with " + ".
Drugs in "allergy.excluded" must not be used. Avoid drugs in "allergy.cross_reactivity" unless there is no
suitable alternative, and say so in "flags".
Never write doses, intervals or infusion times; the app adds them from its own tables.
For each MDR organism in "organisms", judge the risk as high or low from the patient and the risk factors,
and cover a specific MDR pathogen only when its risk is high.
Cite every claim: each citation gives a passage_id from "passages" and a quote copied word for word from that passage.
When guidelines conflict, say so in "flags" and explain your choice.
Return JSON only, with exactly these keys:
{"regimen": string, "alternatives": [up to two strings], "mdr_assessment": [{"organism", "risk": "high"|"low", "reason"}],
 "reasoning": string of at most 150 words, "citations": [{"passage_id", "quote"}], "flags": [strings]}`;

// The user message: the evidence pack as JSON. It holds no identifiers (the input has no free-text fields).
export function buildUserMessage(pack: EvidencePack): string {
  return JSON.stringify(
    {
      patient: pack.patient,
      passages: pack.passages,
      guideline_table: {
        base_regimen: pack.baseRegimen,
        mdr_coverage: pack.mdrCoverage,
        mdr_risk_factors: pack.mdrRiskFactors.map((r) => ({
          risk_factor: r.risk_factor,
          organism: r.organism,
          rule_text: r.rule_text,
        })),
      },
      allowed_drugs: pack.allowedDrugs,
      allergy: { excluded: pack.allergyExcluded, cross_reactivity: pack.crossReactivity },
      organisms: pack.organisms,
      hospital_antibiogram: pack.antibiogram,
    },
    null,
    1,
  );
}
