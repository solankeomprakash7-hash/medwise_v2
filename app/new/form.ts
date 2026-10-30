// The patient-entry form: its fields, the checks shown next to each field, and the creatinine clearance
// helper. Pure functions with no screen code, so they can be tested (tests/entry-form.test.ts).
// The server checks everything again (lib/recommend/input.ts); this file only helps the clinician.

export interface Form {
  age: string;
  sex: string;
  weight_kg: string;
  height_cm: string; // optional: only used to adjust Cockcroft-Gault in obesity
  pregnancy: string;
  source: string; // main source
  extra_sources: string[];
  setting: string;
  source_control: string;
  severity: string;
  sofa: string;
  renalMode: "" | "creatinine" | "crcl";
  creatinine: string;
  creatinineUnit: "mg_dl" | "umol_l";
  crclOverride: boolean; // creatinine entered, but the clinician types their own CrCl instead
  crcl_ml_min: string; // typed CrCl / eGFR (crcl mode, or the override)
  onDialysis: "" | "no" | "yes";
  dialysisType: string;
  hepatic: string;
  antibioticsGiven: "" | "no" | "yes";
  antibiotics_90d: { drug: string; days: string }[];
  admission_90d: string;
  prior_mdr: string[];
  devices: string[];
  current_antibiotics: string[];
  comorbidities: string[];
  immunocompromise: string[];
  allergiesKnown: "" | "no" | "yes";
  allergies: { drug: string; reaction: string }[];
  confirmed: Record<string, string>; // unusual values the clinician confirmed, keyed by field, with the value confirmed
}

export const EMPTY: Form = {
  age: "", sex: "", weight_kg: "", height_cm: "", pregnancy: "", source: "", extra_sources: [], setting: "",
  source_control: "", severity: "", sofa: "", renalMode: "", creatinine: "", creatinineUnit: "mg_dl",
  crclOverride: false, crcl_ml_min: "", onDialysis: "", dialysisType: "", hepatic: "", antibioticsGiven: "",
  antibiotics_90d: [], admission_90d: "", prior_mdr: [], devices: [], current_antibiotics: [], comorbidities: [],
  immunocompromise: [], allergiesKnown: "", allergies: [], confirmed: {},
};

// Sections of the one-page form, in order, and the fields each one holds.
export const SECTIONS = [
  { id: "basics", title: "Basics", hint: "Age, sex, weight", fields: ["age", "sex", "weight_kg", "height_cm", "pregnancy"] },
  { id: "source", title: "Source & setting", hint: "Where the infection is and where it was acquired", fields: ["source", "setting", "source_control"] },
  { id: "severity", title: "Severity", hint: "Sepsis or septic shock, SOFA", fields: ["severity", "sofa"] },
  { id: "organs", title: "Organs", hint: "Kidneys and liver, for dosing", fields: ["renal", "dialysis", "hepatic"] },
  { id: "exposures", title: "Exposures", hint: "Last 90 days", fields: ["antibiotics_90d", "admission_90d", "prior_mdr", "devices", "current_antibiotics"] },
  { id: "host", title: "Host", hint: "Comorbidities, immunity, allergies", fields: ["comorbidities", "immunocompromise", "allergies"] },
] as const;

export const LABELS: Record<string, string> = {
  age: "Age (years)",
  sex: "Sex",
  weight_kg: "Weight (kg)",
  height_cm: "Height (cm, optional)",
  pregnancy: "Pregnant?",
  source: "Suspected source(s)",
  setting: "Where was it acquired?",
  source_control: "Source control",
  severity: "Severity",
  sofa: "SOFA score (0 to 24)",
  renal: "Kidney function",
  creatinine: "Creatinine value",
  crcl_ml_min: "CrCl or eGFR (mL/min)",
  dialysis: "On dialysis?",
  dialysisType: "Type of dialysis",
  hepatic: "Liver function",
  antibiotics_90d: "Antibiotics in the last 90 days",
  admission_90d: "Hospital admission in the last 90 days",
  prior_mdr: "Previous MDR organism",
  devices: "Devices in place",
  current_antibiotics: "Antibiotics being given now (optional)",
  comorbidities: "Comorbidities",
  immunocompromise: "Immunocompromise",
  allergies: "Drug allergies",
};

// Drug names: letters, spaces, hyphens and slashes only (the server checks the same), so no number can be typed.
const DRUG_NAME = /^[a-z][a-z \-/]{1,39}$/;
export const isDrugName = (s: string) => DRUG_NAME.test(s.trim().toLowerCase());
export const lettersOnly = (s: string) => s.replace(/[^A-Za-z \-/]/g, "");

export const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const between = (s: string, min: number, max: number) => Number.isFinite(num(s)) && num(s) >= min && num(s) <= max;

// ---------- Kidney function: Cockcroft-Gault (CLINICAL_RULES.md, owner decision 2026-10-30) ----------

export const UMOL_PER_MG_DL = 88.4;

export function creatinineMgDl(f: Pick<Form, "creatinine" | "creatinineUnit">): number {
  const value = num(f.creatinine);
  return f.creatinineUnit === "umol_l" ? value / UMOL_PER_MG_DL : value;
}

// Ideal body weight (Devine): male 50 kg, female 45.5 kg, plus 0.91 kg per cm above 152.4 cm.
export function idealWeight(sex: string, heightCm: number): number {
  return (sex === "female" ? 45.5 : 50) + 0.91 * (heightCm - 152.4);
}

export interface CockcroftGault {
  crcl: number; // mL/min, rounded
  weightUsed: number;
  weightKind: "actual" | "adjusted";
  formula: string; // shown to the clinician
}

// CrCl = (140 − age) × weight ÷ (72 × creatinine mg/dL), × 0.85 for women. Actual weight, unless height is
// given and actual weight is over 120% of ideal: then adjusted weight = ideal + 0.4 × (actual − ideal).
// Null when it cannot be calculated (sex "other" has no formula: enter CrCl directly).
export function cockcroftGault(f: Pick<Form, "age" | "sex" | "weight_kg" | "height_cm" | "creatinine" | "creatinineUnit">): CockcroftGault | null {
  const age = num(f.age);
  const weight = num(f.weight_kg);
  const scr = creatinineMgDl(f);
  if (!(f.sex === "male" || f.sex === "female")) return null;
  if (![age, weight, scr].every(Number.isFinite) || scr <= 0 || age >= 140) return null;
  let weightUsed = weight;
  let weightKind: CockcroftGault["weightKind"] = "actual";
  const height = num(f.height_cm);
  if (between(f.height_cm, 120, 230)) {
    const ideal = idealWeight(f.sex, height);
    if (weight > 1.2 * ideal) {
      weightUsed = ideal + 0.4 * (weight - ideal);
      weightKind = "adjusted";
    }
  }
  const female = f.sex === "female" ? 0.85 : 1;
  const crcl = Math.round(((140 - age) * weightUsed * female) / (72 * scr));
  const w = `${round1(weightUsed)} kg${weightKind === "adjusted" ? " (adjusted)" : ""}`;
  const formula =
    `CrCl = (140 − ${age}) × ${w} ÷ (72 × ${round2(scr)} mg/dL)` + (female < 1 ? " × 0.85" : "") + ` = ${crcl} mL/min`;
  return { crcl, weightUsed: round1(weightUsed), weightKind, formula };
}
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// The CrCl that will be sent: typed (CrCl mode or override) or calculated.
export function effectiveCrcl(f: Form): number {
  if (f.renalMode === "crcl" || f.crclOverride) return num(f.crcl_ml_min);
  if (f.renalMode === "creatinine") return cockcroftGault(f)?.crcl ?? NaN;
  return NaN;
}

// ---------- Checks shown next to each field ----------

export interface Problems {
  missing: Set<string>; // required and not answered
  invalid: Map<string, string>; // impossible or not allowed: must be corrected
  unusual: Map<string, { value: string; message: string }>; // possible but unusual: must be confirmed
  stop: Map<string, string>; // out of scope for MedWise version 1
}

export const STOP_MESSAGE = "MedWise v1 does not cover this patient. Consult ID / microbiology.";

export const pregnancyAsked = (f: Form) => f.sex === "female" && !between(f.age, 0, 17.99);

export function checkForm(f: Form): Problems {
  const p: Problems = { missing: new Set(), invalid: new Map(), unusual: new Map(), stop: new Map() };
  const need = (field: string, answered: boolean) => {
    if (!answered) p.missing.add(field);
  };
  const unusual = (field: string, value: string, message: string) => {
    if (f.confirmed[field] !== value) p.unusual.set(field, { value, message });
  };

  // Basics
  need("age", f.age !== "");
  if (f.age !== "") {
    if (!between(f.age, 0, 110)) p.invalid.set("age", "Age cannot be over 110 years.");
    else if (num(f.age) < 18) p.stop.set("age", `Age under 18. ${STOP_MESSAGE}`);
    else if (num(f.age) >= 100) unusual("age", f.age, `Age ${f.age} years is unusual.`);
  }
  need("sex", f.sex !== "");
  need("weight_kg", f.weight_kg !== "");
  if (f.weight_kg !== "") {
    if (!between(f.weight_kg, 20, 300)) p.invalid.set("weight_kg", "Weight must be 20 to 300 kg.");
    else if (num(f.weight_kg) < 25 || num(f.weight_kg) > 200) unusual("weight_kg", f.weight_kg, `Weight ${f.weight_kg} kg is unusual.`);
  }
  if (f.height_cm !== "" && !between(f.height_cm, 120, 230)) p.invalid.set("height_cm", "Height must be 120 to 230 cm, or leave it empty.");
  if (pregnancyAsked(f)) {
    need("pregnancy", f.pregnancy !== "");
    if (f.pregnancy === "yes") p.stop.set("pregnancy", `Pregnancy. ${STOP_MESSAGE}`);
  }

  // Source & setting
  need("source", f.source !== "");
  need("setting", f.setting !== "");
  need("source_control", f.source_control !== "");

  // Severity
  need("severity", f.severity !== "");
  need("sofa", f.sofa !== "");
  if (f.sofa !== "" && !between(f.sofa, 0, 24)) p.invalid.set("sofa", "SOFA score is 0 to 24.");

  // Organs
  need("renal", f.renalMode !== "");
  if (f.renalMode === "creatinine") {
    if (f.sex === "other") p.invalid.set("renal", "Cockcroft-Gault has no formula for sex Other: enter CrCl or eGFR directly.");
    need("renal", f.creatinine !== "");
    const mgdl = creatinineMgDl(f);
    if (f.creatinine !== "" && !(mgdl >= 0.1 && mgdl <= 20)) {
      p.invalid.set("renal", f.creatinineUnit === "mg_dl" ? "Creatinine must be 0.1 to 20 mg/dL." : "Creatinine must be 9 to 1768 µmol/L.");
    }
  }
  if (f.renalMode === "crcl" || f.crclOverride) need("renal", f.crcl_ml_min !== "");
  const crcl = effectiveCrcl(f);
  if (Number.isFinite(crcl) && !p.invalid.has("renal")) {
    if (crcl < 0 || crcl > 250) p.invalid.set("renal", `CrCl ${crcl} mL/min is outside 0 to 250. Check the values, or enter a measured CrCl.`);
    else if (crcl > 200) unusual("renal", String(crcl), `CrCl ${crcl} mL/min is unusual.`);
  } else if (f.renalMode === "creatinine" && !f.crclOverride && f.creatinine !== "" && !p.invalid.has("renal")) {
    p.missing.add("renal"); // age, sex or weight still needed to calculate
  }
  need("dialysis", f.onDialysis !== "" && (f.onDialysis === "no" || f.dialysisType !== ""));
  need("hepatic", f.hepatic !== "");

  // Exposures
  need("antibiotics_90d", f.antibioticsGiven !== "" && (f.antibioticsGiven === "no" || f.antibiotics_90d.length > 0));
  if (f.antibioticsGiven === "yes") {
    for (const a of f.antibiotics_90d) {
      if (a.drug.trim() === "" || a.days === "") p.missing.add("antibiotics_90d");
      else if (!isDrugName(a.drug)) p.invalid.set("antibiotics_90d", "Antibiotic names may contain letters only.");
      else if (!between(a.days, 0, 90)) p.invalid.set("antibiotics_90d", "Days must be 0 to 90.");
    }
  }
  need("admission_90d", f.admission_90d !== "");
  need("prior_mdr", f.prior_mdr.length > 0);
  need("devices", f.devices.length > 0);
  for (const d of f.current_antibiotics) {
    if (d.trim() !== "" && !isDrugName(d)) p.invalid.set("current_antibiotics", "Antibiotic names may contain letters only.");
  }

  // Host
  need("comorbidities", f.comorbidities.length > 0);
  need("immunocompromise", f.immunocompromise.length > 0);
  if (f.immunocompromise.includes("neutropenia")) {
    p.stop.set("immunocompromise", `Neutropenic sepsis. ${STOP_MESSAGE} Follow your hospital's febrile-neutropenia protocol.`);
  }
  need("allergies", f.allergiesKnown !== "" && (f.allergiesKnown === "no" || f.allergies.length > 0));
  if (f.allergiesKnown === "yes") {
    for (const a of f.allergies) {
      if (a.drug.trim() === "" || a.reaction === "") p.missing.add("allergies");
      else if (!isDrugName(a.drug)) p.invalid.set("allergies", "Allergy names may contain letters only.");
    }
  }
  return p;
}

export const fieldOk = (p: Problems, field: string) =>
  !p.missing.has(field) && !p.invalid.has(field) && !p.unusual.has(field) && !p.stop.has(field);

export const sectionDone = (p: Problems, index: number) => SECTIONS[index].fields.every((field) => fieldOk(p, field));

// ---------- What is sent to the server (lib/recommend/input.ts format, unchanged) ----------

export function toPatient(f: Form) {
  const clean = (s: string) => s.trim().toLowerCase();
  return {
    age: num(f.age),
    sex: f.sex,
    weight_kg: num(f.weight_kg),
    pregnancy: f.sex === "female" ? f.pregnancy : "not_applicable",
    source: f.source,
    extra_sources: f.extra_sources,
    setting: f.setting,
    source_control: f.source_control,
    severity: f.severity,
    sofa: num(f.sofa),
    crcl_ml_min: effectiveCrcl(f),
    dialysis: f.onDialysis === "yes" ? f.dialysisType : "no",
    hepatic: f.hepatic,
    antibiotics_90d: f.antibioticsGiven === "yes" ? f.antibiotics_90d.map((a) => ({ drug: clean(a.drug), days: num(a.days) })) : [],
    admission_90d: f.admission_90d,
    prior_mdr: f.prior_mdr,
    devices: f.devices,
    comorbidities: f.comorbidities,
    immunocompromise: f.immunocompromise,
    allergies: f.allergiesKnown === "yes" ? f.allergies.map((a) => ({ drug: clean(a.drug), reaction: a.reaction })) : [],
    current_antibiotics: f.current_antibiotics.map(clean).filter(Boolean),
  };
}

// ---------- Test cases (preview and staging only, never on the live site) ----------
// From CLINICAL_RULES.md "Reference cases". Values the case does not state are PLACEHOLDERS chosen for
// testing (owner decision 2026-10-30), listed in `placeholders`; they are not clinical facts about the case.

export const TEST_CASES: { id: string; title: string; placeholders: string; form: Form }[] = [
  {
    id: "case-1",
    title: "Case 1: community pneumonia",
    placeholders: "weight 70 kg, SOFA 3, source control not needed, liver normal, no devices, no immunocompromise, no allergies",
    form: {
      ...EMPTY,
      age: "62", sex: "male", weight_kg: "70",
      source: "lung", setting: "community_acquired", source_control: "not_needed",
      severity: "sepsis", sofa: "3",
      renalMode: "crcl", crcl_ml_min: "80", onDialysis: "no", hepatic: "normal",
      antibioticsGiven: "no", admission_90d: "no", prior_mdr: ["none"], devices: ["none"],
      comorbidities: ["diabetes", "copd"], immunocompromise: ["none"], allergiesKnown: "no",
    },
  },
  {
    id: "case-2",
    title: "Case 2: urosepsis with a catheter",
    placeholders: "weight 70 kg, healthcare-associated, sepsis without shock, source control needed and not yet done, liver normal, no comorbidities, no immunocompromise, no allergies",
    form: {
      ...EMPTY,
      age: "65", sex: "male", weight_kg: "70",
      source: "urinary", setting: "healthcare_associated", source_control: "needed_not_done",
      severity: "sepsis", sofa: "4",
      renalMode: "crcl", crcl_ml_min: "40", onDialysis: "no", hepatic: "normal",
      antibioticsGiven: "yes", antibiotics_90d: [{ drug: "cefixime", days: "5" }], admission_90d: "yes",
      prior_mdr: ["none"], devices: ["urinary_catheter"], comorbidities: ["none"], immunocompromise: ["none"],
      allergiesKnown: "no",
    },
  },
];
