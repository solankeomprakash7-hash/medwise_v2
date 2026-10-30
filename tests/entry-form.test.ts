import { describe, expect, it } from "vitest";
import { EMPTY, checkForm, cockcroftGault, effectiveCrcl, pregnancyAsked, sectionDone, toPatient } from "@/app/new/form";
import type { Form } from "@/app/new/form";
import { loadKnowledge } from "@/lib/recommend/kb";
import { checkInput } from "@/lib/recommend/input";

const kb = loadKnowledge();

// Reference cases from CLINICAL_RULES.md, used only by these tests (owner removed the on-screen test buttons 2026-10-30).
// From CLINICAL_RULES.md "Reference cases". Values the case does not state are PLACEHOLDERS chosen for
// testing (owner decision 2026-10-30), listed in `placeholders`; they are not clinical facts about the case.

const TEST_CASES: { id: string; title: string; placeholders: string; form: Form }[] = [
  {
    id: "case-1",
    title: "Case 1: community pneumonia",
    placeholders: "weight 70 kg, source control not applicable, liver normal, no devices, no immunocompromise, no allergies",
    form: {
      ...EMPTY,
      age: "62", sex: "male", weight_kg: "70",
      source: "lung", setting: "community_acquired", source_control: "not_needed",
      severity: "sepsis",
      renalMode: "crcl", crcl_ml_min: "80", onDialysis: "no", hepatic: "normal",
      antibioticsGiven: "no", admission_90d: "no", prior_mdr: ["none"], devices: ["none"],
      comorbidities: ["diabetes", "copd"], immunocompromise: ["none"], allergiesKnown: "no",
    },
  },
  {
    id: "case-2",
    title: "Case 2: urosepsis with a catheter",
    placeholders: "weight 70 kg, community-acquired (healthcare contact is captured by the exposures), sepsis without shock, source control not achieved, liver normal, no comorbidities, no immunocompromise, no allergies",
    form: {
      ...EMPTY,
      age: "65", sex: "male", weight_kg: "70",
      source: "urinary", setting: "community_acquired", source_control: "needed_not_done",
      severity: "sepsis",
      renalMode: "crcl", crcl_ml_min: "40", onDialysis: "no", hepatic: "normal",
      antibioticsGiven: "yes", antibiotics_90d: [{ drug: "cefixime", days: "5" }], admission_90d: "yes",
      prior_mdr: ["none"], devices: ["urinary_catheter"], comorbidities: ["none"], immunocompromise: ["none"],
      allergiesKnown: "no",
    },
  },
];

const case1 = TEST_CASES[0].form;
const withCase = (change: Partial<Form>): Form => ({ ...case1, ...change });

describe("Cockcroft-Gault", () => {
  const base = { age: "62", sex: "male", weight_kg: "70", height_cm: "", creatinine: "1", creatinineUnit: "mg_dl" as const };

  it("calculates CrCl for a man with actual weight and shows the formula", () => {
    const cg = cockcroftGault(base);
    expect(cg?.crcl).toBe(76); // (140 − 62) × 70 ÷ 72
    expect(cg?.weightKind).toBe("actual");
    expect(cg?.formula).toBe("CrCl = (140 − 62) × 70 kg ÷ (72 × 1 mg/dL) = 76 mL/min");
  });

  it("multiplies by 0.85 for a woman", () => expect(cockcroftGault({ ...base, sex: "female" })?.crcl).toBe(64));

  it("gives the same answer for µmol/L", () => expect(cockcroftGault({ ...base, creatinine: "88.4", creatinineUnit: "umol_l" })?.crcl).toBe(76));

  it("uses adjusted weight when height is given and weight is over 120% of ideal", () => {
    const cg = cockcroftGault({ ...base, weight_kg: "100", height_cm: "170" });
    expect(cg?.weightKind).toBe("adjusted");
    expect(cg?.weightUsed).toBe(79.6); // ideal 66.0 + 0.4 × (100 − 66.0)
    expect(cg?.crcl).toBe(86);
  });

  it("keeps actual weight when height is given and weight is not over 120% of ideal", () =>
    expect(cockcroftGault({ ...base, height_cm: "170" })?.weightKind).toBe("actual"));

  it("has no formula for sex Other", () => expect(cockcroftGault({ ...base, sex: "other" })).toBeNull());

  it("lets the clinician's own CrCl replace the calculated one", () => {
    const f = withCase({ renalMode: "creatinine", creatinine: "1", crclOverride: true, crcl_ml_min: "55" });
    expect(effectiveCrcl(f)).toBe(55);
  });
});

describe("checks next to each field", () => {
  it("an empty form has every required field missing and nothing out of scope", () => {
    const p = checkForm(EMPTY);
    for (const field of ["age", "sex", "weight_kg", "source", "setting", "severity", "renal", "dialysis", "allergies"]) {
      expect(p.missing.has(field)).toBe(true);
    }
    expect(p.missing.has("height_cm")).toBe(false); // optional
    expect(p.stop.size).toBe(0);
  });

  it("blocks impossible values", () => {
    expect(checkForm(withCase({ age: "111" })).invalid.has("age")).toBe(true);
    expect(checkForm(withCase({ weight_kg: "19" })).invalid.has("weight_kg")).toBe(true);
    expect(checkForm(withCase({ crcl_ml_min: "260" })).invalid.has("renal")).toBe(true);
  });

  it("asks to confirm unusual values, and accepts them once confirmed", () => {
    for (const [field, change] of [
      ["weight_kg", { weight_kg: "22" }],
      ["age", { age: "104" }],
      ["renal", { crcl_ml_min: "210" }],
    ] as const) {
      const f = withCase(change);
      const p = checkForm(f);
      expect(p.unusual.has(field)).toBe(true);
      const value = p.unusual.get(field)!.value;
      expect(checkForm({ ...f, confirmed: { [field]: value } }).unusual.has(field)).toBe(false);
    }
  });

  it("asks again if a confirmed value is changed", () => {
    const f = withCase({ weight_kg: "23", confirmed: { weight_kg: "22" } });
    expect(checkForm(f).unusual.has("weight_kg")).toBe(true);
  });

  it("stops out-of-scope patients", () => {
    expect(checkForm(withCase({ age: "17" })).stop.get("age")).toContain("MedWise v1 does not cover this patient. Consult ID / microbiology.");
    expect(checkForm(withCase({ sex: "female", pregnancy: "yes" })).stop.has("pregnancy")).toBe(true);
    expect(checkForm(withCase({ immunocompromise: ["neutropenia"] })).stop.get("immunocompromise")).toContain("febrile-neutropenia");
  });

  it("asks about pregnancy for every woman aged 18 or over, and not for men", () => {
    expect(pregnancyAsked(withCase({ sex: "female", age: "55" }))).toBe(true);
    expect(pregnancyAsked(withCase({ sex: "female", age: "30" }))).toBe(true);
    expect(pregnancyAsked(withCase({ sex: "male" }))).toBe(false);
    expect(checkForm(withCase({ sex: "female" })).missing.has("pregnancy")).toBe(true);
  });

  it("needs the dialysis type only when on dialysis", () => {
    expect(checkForm(withCase({ onDialysis: "yes" })).missing.has("dialysis")).toBe(true);
    expect(checkForm(withCase({ onDialysis: "yes", dialysisType: "haemodialysis" })).missing.has("dialysis")).toBe(false);
  });

  it("needs a reaction for every allergy added", () => {
    const f = withCase({ allergiesKnown: "yes", allergies: [{ drug: "penicillin", reaction: "" }] });
    expect(checkForm(f).missing.has("allergies")).toBe(true);
  });

  it("asks for CrCl directly when sex is Other and creatinine was chosen", () => {
    expect(checkForm(withCase({ sex: "other", renalMode: "creatinine", creatinine: "1" })).invalid.has("renal")).toBe(true);
  });
});

describe("test cases", () => {
  for (const t of TEST_CASES) {
    it(`${t.title} is complete and accepted by the server's input check`, () => {
      const p = checkForm(t.form);
      expect([...p.missing, ...p.invalid.keys(), ...p.unusual.keys(), ...p.stop.keys()]).toEqual([]);
      expect([0, 1, 2, 3, 4, 5].every((i) => sectionDone(p, i))).toBe(true);
      expect(checkInput(toPatient(t.form), kb).ok).toBe(true);
    });
  }

  it("sends dialysis as the type, and the calculated CrCl", () => {
    const f = withCase({ onDialysis: "yes", dialysisType: "crrt", renalMode: "creatinine", creatinine: "1" });
    expect(toPatient(f).dialysis).toBe("crrt");
    expect(toPatient(f).crcl_ml_min).toBe(76);
  });
});

describe("owner decisions 2026-10-30", () => {
  it("healthcare-associated is no longer a setting, and the server refuses it", () => {
    expect([...(kb.vocabulary.get("setting") ?? [])]).toEqual(["community_acquired", "hospital_acquired", "ventilator_associated"]);
    expect(checkInput({ ...toPatient(case1), setting: "healthcare_associated" }, kb).ok).toBe(false);
  });

  it("source control reads Not applicable / Achieved / Not achieved", () => {
    expect(["not_needed", "needed_done", "needed_not_done"].map((v) => kb.vocabularyLabels.get(`source_control:${v}`))).toEqual([
      "Not applicable", "Achieved", "Not achieved",
    ]);
  });

  it("SOFA is not asked and not needed", () => {
    expect("sofa" in toPatient(case1)).toBe(false);
    expect(checkInput(toPatient(case1), kb).ok).toBe(true);
  });
});
