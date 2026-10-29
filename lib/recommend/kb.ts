import { KNOWLEDGE_DIR, readTable, readVersion } from "@/lib/knowledge/tables";
import type { Row } from "@/lib/knowledge/tables";

// Everything the recommendation needs from /knowledge, read once per directory. Server-side only.
export interface Knowledge {
  version: string;
  vocabulary: Map<string, Set<string>>;
  multi: Set<string>;
  drugs: Map<string, Row>;
  drugClasses: Map<string, Row>;
  drugSpectrum: Map<string, Row>;
  regimens: Row[];
  mdrRisk: Row[];
  mdrCoverage: Row[];
  guidelines: Row[];
  evidence: Row[];
}

const cache = new Map<string, Knowledge>();

export function loadKnowledge(dir = KNOWLEDGE_DIR): Knowledge {
  const cached = cache.get(dir);
  if (cached) return cached;
  const vocabulary = new Map<string, Set<string>>();
  const multi = new Set<string>();
  for (const row of readTable("vocabulary", dir).rows) {
    vocabulary.set(row.field, (vocabulary.get(row.field) ?? new Set()).add(row.value));
    if (row.multi === "yes") multi.add(row.field);
  }
  const knowledge: Knowledge = {
    version: readVersion(dir),
    vocabulary,
    multi,
    drugs: new Map(readTable("drugs", dir).rows.map((row) => [row.drug, row])),
    drugClasses: new Map(readTable("drug_classes", dir).rows.map((row) => [row.drug, row])),
    drugSpectrum: new Map(readTable("drug_spectrum", dir).rows.map((row) => [row.drug, row])),
    regimens: readTable("regimens", dir).rows,
    mdrRisk: readTable("mdr_risk", dir).rows,
    mdrCoverage: readTable("mdr_coverage", dir).rows,
    guidelines: readTable("guidelines", dir).rows,
    evidence: readTable("evidence", dir).rows,
  };
  cache.set(dir, knowledge);
  return knowledge;
}

// MDR organism codes: the prior_mdr input values except "none".
export function mdrOrganisms(kb: Knowledge): string[] {
  return [...(kb.vocabulary.get("prior_mdr") ?? [])].filter((o) => o !== "none");
}
