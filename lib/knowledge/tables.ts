import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";

// Reads the knowledge-base CSV tables in /knowledge. Server-side only.

export const KNOWLEDGE_DIR = join(process.cwd(), "knowledge");

// Columns of each table, in order. regimens/mdr_risk/drugs/antibiogram follow docs/CLINICAL_RULES.md.
export const TABLE_COLUMNS = {
  vocabulary: ["field", "value", "label", "multi"],
  coverage: ["source", "setting", "severity", "status", "panel_note"],
  regimens: [
    "source", "setting", "severity", "risk_tier", "first_choice", "alternative",
    "beta_lactam_allergy_alt", "guideline_ref",
  ],
  mdr_risk: ["risk_factor", "organism", "weight", "rule_text", "guideline_ref"],
  drugs: [
    "drug", "standard_dose", "interval", "infusion", "max_dose", "renal_bands",
    "hepatic_adjustment", "interactions", "monitoring", "site_penetration_notes",
  ],
  antibiogram_template: ["year", "unit", "organism", "antibiotic", "isolates_n", "percent_susceptible"],
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
