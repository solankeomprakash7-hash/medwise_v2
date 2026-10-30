import type { Knowledge } from "./kb";

// The patient as entered on the form. No identifiers (CLAUDE.md rule 4): there are no free-text fields,
// only codes from knowledge/vocabulary.csv, numbers, and drug names checked to contain no digits.
export interface PatientInput {
  age: number;
  sex: string;
  weight_kg: number;
  source: string; // the main source: the guideline table comparison uses this one
  extra_sources: string[]; // other suspected sources (may be empty); the regimen must cover them too
  setting: string;
  source_control: string;
  severity: string;
  crcl_ml_min: number;
  dialysis: string;
  hepatic: string;
  antibiotics_90d: { drug: string; days: number }[]; // empty = none
  admission_90d: string;
  prior_mdr: string[]; // ["none"] or organisms
  devices: string[];
  comorbidities: string[];
  immunocompromise: string[];
  allergies: { drug: string; reaction: string }[]; // empty = none
  current_antibiotics: string[];
  pregnancy: string;
}

export type InputCheck =
  | { ok: true; patient: PatientInput }
  | { ok: false; kind: "missing" | "invalid" | "out_of_scope"; messages: string[] };

const NUMBERS: [keyof PatientInput, number, number][] = [
  ["age", 0, 110], // below 18 is stopped as out of scope, not as an error
  ["weight_kg", 20, 300],
  ["crcl_ml_min", 0, 250],
];
const CODES: (keyof PatientInput)[] = [
  "sex", "source", "setting", "source_control", "severity", "dialysis", "hepatic", "admission_90d", "pregnancy",
];
const CODE_LISTS: (keyof PatientInput)[] = ["prior_mdr", "devices", "comorbidities", "immunocompromise"];
// A drug name: letters, spaces and hyphens only, so a phone or UHID number cannot be typed into it.
const DRUG_NAME = /^[a-z][a-z \-/]{1,39}$/;

export function checkInput(raw: unknown, kb: Knowledge): InputCheck {
  if (typeof raw !== "object" || raw === null) return { ok: false, kind: "invalid", messages: ["No patient details received."] };
  const p = raw as Record<string, unknown>;
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [field, min, max] of NUMBERS) {
    const value = p[field];
    if (value === undefined || value === null || value === "") missing.push(field);
    else if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      invalid.push(`${field} must be a number from ${min} to ${max}`);
    }
  }
  for (const field of CODES) {
    const value = p[field];
    if (field === "pregnancy" && p.sex !== "female" && (value === undefined || value === "")) continue;
    if (value === undefined || value === "") missing.push(field);
    else if (!kb.vocabulary.get(field)?.has(value as string)) invalid.push(`${field}: "${String(value)}" is not an allowed answer`);
  }
  for (const field of CODE_LISTS) {
    const value = p[field];
    if (!Array.isArray(value) || value.length === 0) {
      missing.push(field);
      continue;
    }
    for (const item of value) {
      if (!kb.vocabulary.get(field)?.has(item)) invalid.push(`${field}: "${String(item)}" is not an allowed answer`);
    }
    if (value.includes("none") && value.length > 1) invalid.push(`${field}: "none" cannot be combined with other answers`);
  }
  for (const field of ["antibiotics_90d", "allergies", "current_antibiotics"] as const) {
    if (!Array.isArray(p[field])) missing.push(field);
  }
  if (Array.isArray(p.antibiotics_90d)) {
    for (const item of p.antibiotics_90d as { drug?: unknown; days?: unknown }[]) {
      if (!DRUG_NAME.test(String(item?.drug ?? ""))) invalid.push("antibiotics_90d: drug names may contain only letters");
      if (typeof item?.days !== "number" || item.days < 0 || item.days > 90) invalid.push("antibiotics_90d: days must be 0 to 90");
    }
  }
  if (Array.isArray(p.allergies)) {
    for (const item of p.allergies as { drug?: unknown; reaction?: unknown }[]) {
      if (!DRUG_NAME.test(String(item?.drug ?? ""))) invalid.push("allergies: drug names may contain only letters");
      if (!kb.vocabulary.get("allergy_reaction")?.has(String(item?.reaction))) invalid.push("allergies: reaction must be rash, anaphylaxis or other");
    }
  }
  if (Array.isArray(p.current_antibiotics)) {
    for (const item of p.current_antibiotics) {
      if (!DRUG_NAME.test(String(item))) invalid.push("current_antibiotics: drug names may contain only letters");
    }
  }

  // Extra sources: optional; codes from the same list as the main source, no repeats.
  if (p.extra_sources !== undefined) {
    if (!Array.isArray(p.extra_sources)) invalid.push("extra_sources must be a list");
    else {
      for (const item of p.extra_sources) {
        if (!kb.vocabulary.get("source")?.has(item)) invalid.push(`extra_sources: "${String(item)}" is not an allowed answer`);
        if (item === p.source) invalid.push("extra_sources: the main source cannot also be an extra source");
      }
      if (new Set(p.extra_sources).size !== p.extra_sources.length) invalid.push("extra_sources: a source is listed twice");
    }
  }

  if (missing.length > 0) return { ok: false, kind: "missing", messages: missing.map((f) => `Please enter: ${f}`) };
  if (invalid.length > 0) return { ok: false, kind: "invalid", messages: invalid };

  // Out of scope (CLINICAL_RULES.md safety rules): stop before the AI is asked.
  const outOfScope: string[] = [];
  if ((p.age as number) < 18) outOfScope.push("Age under 18 is outside MedWise version 1.");
  if (p.pregnancy === "yes") outOfScope.push("Pregnancy is outside MedWise version 1.");
  if ((p.immunocompromise as string[]).includes("neutropenia")) {
    outOfScope.push("Neutropenic sepsis is outside MedWise version 1. Follow your hospital's febrile-neutropenia protocol.");
  }
  if (outOfScope.length > 0) return { ok: false, kind: "out_of_scope", messages: outOfScope };

  const patient = { ...(p as unknown as PatientInput) };
  patient.extra_sources = Array.isArray(p.extra_sources) ? (p.extra_sources as string[]) : [];
  if (patient.sex !== "female" && !patient.pregnancy) patient.pregnancy = "not_applicable";
  return { ok: true, patient };
}
