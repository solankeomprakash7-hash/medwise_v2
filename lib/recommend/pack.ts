import type { Row } from "@/lib/knowledge/tables";
import type { PatientInput } from "./input";
import type { Knowledge } from "./kb";
import { mdrOrganisms } from "./kb";

// One row of a hospital antibiogram (knowledge/antibiogram_template.csv format).
export interface AntibiogramRow {
  year: number;
  unit: string;
  organism: string;
  antibiotic: string;
  isolates_n: number;
  percent_susceptible: number;
}

// Everything the AI is given for one patient. It may reason only from this (CLINICAL_RULES.md).
export interface EvidencePack {
  patient: PatientInput;
  passages: { passage_id: string; guideline: string; location: string; table_columns: string; text: string }[];
  baseRegimen: Row | null;
  mdrCoverage: Row[];
  mdrRiskFactors: Row[];
  allowedDrugs: string[];
  organisms: string[];
  antibiogram: AntibiogramRow[];
}

const applies = (tags: string, value: string) => tags.split(";").some((t) => t.trim() === "any" || t.trim() === value);

export function buildEvidencePack(patient: PatientInput, kb: Knowledge, antibiogram: AntibiogramRow[] = []): EvidencePack {
  return {
    patient,
    passages: kb.evidence
      .filter((p) => applies(p.sources, patient.source) && applies(p.settings, patient.setting))
      .map((p) => ({
        passage_id: p.passage_id,
        guideline: p.guideline,
        location: p.location,
        table_columns: p.table_columns,
        text: p.text,
      })),
    baseRegimen:
      kb.regimens.find(
        (r) => r.source === patient.source && r.setting === patient.setting && r.severity === patient.severity,
      ) ?? null,
    mdrCoverage: kb.mdrCoverage.filter(
      (r) => (r.source === "any" || r.source === patient.source) && (r.severity === "any" || r.severity === patient.severity),
    ),
    mdrRiskFactors: kb.mdrRisk,
    allowedDrugs: [...kb.drugs.keys()],
    organisms: mdrOrganisms(kb),
    antibiogram,
  };
}
