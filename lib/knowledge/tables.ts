import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";

// Reads the knowledge-base CSV tables in /knowledge. Server-side only.

export const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");

// Columns of each table, in order. regimens/mdr_risk/drugs/antibiogram follow docs/CLINICAL_RULES.md.
export const TABLE_COLUMNS = {
  vocabulary: ["field", "value", "label", "multi"],
  coverage: ["source", "setting", "severity", "status", "panel_note"],
  // Base regimen for a patient with no high-risk MDR organism.
  regimens: [
    "source", "setting", "severity", "first_choice", "alternative", "beta_lactam_allergy_alt",
    "guideline_ref",
  ],
  mdr_risk: ["risk_factor", "organism", "weight", "rule_text", "guideline_ref"],
  // An organism is high risk when its matching risk-factor weights add up to this threshold.
  mdr_thresholds: ["organism", "high_risk_threshold", "basis"],
  // What to do for an exact set of high-risk organisms: add a drug to, or replace, the base regimen.
  mdr_coverage: [
    "organisms", "source", "severity", "action", "regimen", "beta_lactam_allergy_alt",
    "guideline_ref", "notes",
  ],
  drugs: [
    "drug", "standard_dose", "interval", "infusion", "max_dose", "renal_bands",
    "hepatic_adjustment", "interactions", "monitoring", "site_penetration_notes",
  ],
  // Class of each drug, for allergy checks (CLAUDE.md rule 1: allergy classes only from the tables).
  drug_classes: ["drug", "class", "beta_lactam", "source"],
  // Coverage given by each drug (yes / limited / no) and its WHO AWaRe group (Access / Watch / Reserve,
  // or "Not recommended" for WHO's list of fixed-dose combinations it advises against).
  drug_spectrum: [
    "drug", "gram_positive", "gram_negative", "pseudomonas", "mrsa", "esbl", "cre", "anaerobes", "atypicals",
    "aware", "source", "aware_source",
  ],
  antibiogram_template: ["year", "unit", "organism", "antibiotic", "isolates_n", "percent_susceptible"],
  // Guidelines MedWise uses; every result shows their versions (CLAUDE.md rule 6).
  guidelines: ["guideline", "title", "version", "published", "citation"],
  // Guideline passages copied word for word; the only text the AI may cite (CLAUDE.md rule 2).
  evidence: [
    "passage_id", "guideline", "location", "pdf_page", "format", "table_columns", "sources", "settings",
    "organisms", "topics", "text",
  ],
  // Where each drafted row came from (guideline, page, recommendation) and known gaps.
  provenance: ["table", "row_key", "fields", "source", "location", "note"],
  golden_tests: [
    "case_id", "origin", "review_status", "age", "sex", "weight_kg", "source", "setting",
    "source_control", "severity", "sofa", "crcl_ml_min", "dialysis", "hepatic", "antibiotics_90d",
    "admission_90d", "prior_mdr", "devices", "comorbidities", "immunocompromise", "allergies",
    "current_antibiotics", "pregnancy", "expected_regimen", "acceptable_alternatives",
    "expected_flags", "notes",
  ],
} as const;

export type TableName = keyof typeof TABLE_COLUMNS;
export type Row = Record<string, string>;

export interface Table {
  columns: string[];
  rows: Row[];
}

export function readTable(name: TableName, dir = KNOWLEDGE_DIR): Table {
  const text = readFileSync(join(dir, `${name}.csv`), "utf8");
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const e = parsed.errors[0];
    throw new Error(`${name}.csv row ${e.row}: ${e.message}`);
  }
  const rows = parsed.data.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, (v ?? "").trim()])),
  );
  return { columns: parsed.meta.fields ?? [], rows };
}

export function readVersion(dir = KNOWLEDGE_DIR): string {
  return readFileSync(join(dir, "VERSION"), "utf8").trim();
}

// "a;b" -> ["a", "b"]; "" -> []
export function splitList(cell: string): string[] {
  return cell.split(";").map((s) => s.trim()).filter(Boolean);
}

// "ceftriaxone + azithromycin" -> ["ceftriaxone", "azithromycin"]
export function regimenDrugs(cell: string): string[] {
  return cell.split("+").map((s) => s.trim()).filter(Boolean);
}
