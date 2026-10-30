import type { Knowledge } from "./kb";

// Coverage categories of knowledge/drug_spectrum.csv, in the order shown on the result screen.
export const COVERAGE = [
  { key: "gram_positive", label: "Gram-positive" },
  { key: "gram_negative", label: "Gram-negative" },
  { key: "pseudomonas", label: "Pseudomonas" },
  { key: "mrsa", label: "MRSA" },
  { key: "esbl", label: "ESBL" },
  { key: "cre", label: "CRE" },
  { key: "anaerobes", label: "Anaerobes" },
  { key: "atypicals", label: "Atypicals" },
] as const;
export type CoverageKey = (typeof COVERAGE)[number]["key"];
export const COVERAGE_KEYS = COVERAGE.map((c) => c.key) as [CoverageKey, ...CoverageKey[]];
export type CoverageLevel = "yes" | "limited" | "no";

const RANK: Record<CoverageLevel, number> = { no: 0, limited: 1, yes: 2 };

// Coverage given by a regimen: for each category, the best level among its drugs (table values only).
export function coverageGiven(regimen: string, kb: Knowledge): Record<CoverageKey, CoverageLevel> {
  const given = Object.fromEntries(COVERAGE_KEYS.map((k) => [k, "no"])) as Record<CoverageKey, CoverageLevel>;
  for (const drug of regimen.split("+").map((d) => d.trim().toLowerCase())) {
    const row = kb.drugSpectrum.get(drug);
    if (!row) continue;
    for (const key of COVERAGE_KEYS) {
      const level = row[key] as CoverageLevel;
      if (RANK[level] > RANK[given[key]]) given[key] = level;
    }
  }
  return given;
}

export interface FitLine {
  key: CoverageKey;
  label: string;
  status: "covered" | "partly" | "missing" | "excess";
  reason: string;
}

// Spectrum fit: coverage needed (judged by the AI) against coverage given (from the table). Words only.
export function spectrumFit(
  needed: { category: CoverageKey; needed: boolean; reason: string }[],
  given: Record<CoverageKey, CoverageLevel>,
): FitLine[] {
  const lines: FitLine[] = [];
  for (const { key, label } of COVERAGE) {
    const need = needed.find((n) => n.category === key);
    const level = given[key];
    if (need?.needed) {
      const status = level === "yes" ? "covered" : level === "limited" ? "partly" : "missing";
      lines.push({ key, label, status, reason: need.reason });
    } else if (level === "yes") {
      lines.push({ key, label, status: "excess", reason: need?.reason ?? "" });
    }
  }
  return lines;
}
