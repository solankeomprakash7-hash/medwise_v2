import { describe, expect, it } from "vitest";
import { loadKnowledge } from "@/lib/recommend/kb";
import { precheck } from "@/lib/recommend/precheck";

// The server-side check behind "Get recommendation" on the entry screen.
const kb = loadKnowledge();
const patient = {
  age: 62, sex: "male", weight_kg: 70, pregnancy: "not_applicable", source: "lung", setting: "community_acquired",
  source_control: "not_needed", severity: "sepsis", crcl_ml_min: 80, dialysis: "no", hepatic: "normal",
  antibiotics_90d: [], admission_90d: "no", prior_mdr: ["none"], devices: ["none"], comorbidities: ["diabetes", "copd"],
  immunocompromise: ["none"], allergies: [], current_antibiotics: [],
};

describe("entry screen check", () => {
  it("accepts complete details", () => {
    expect(precheck(patient, kb)).toEqual({ status: "complete", messages: [] });
  });
  it("accepts a known allergy", () => {
    expect(precheck({ ...patient, allergies: [{ drug: "amoxicillin", reaction: "rash" }] }, kb).status).toBe("complete");
  });
  it("stops an allergy that cannot be checked", () => {
    expect(precheck({ ...patient, allergies: [{ drug: "xyzocillin", reaction: "rash" }] }, kb).status).toBe("allergy_unknown");
  });
  it("stops out-of-scope patients even if the screen's own check were bypassed", () => {
    expect(precheck({ ...patient, immunocompromise: ["neutropenia"] }, kb).status).toBe("out_of_scope");
    expect(precheck({ ...patient, age: 17 }, kb).status).toBe("out_of_scope");
  });
  it("reports missing details", () => {
    expect(precheck({ ...patient, weight_kg: undefined }, kb)).toEqual({ status: "missing_input", messages: ["Please enter: weight_kg"] });
  });
});
