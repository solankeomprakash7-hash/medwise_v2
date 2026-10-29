import { describe, expect, it } from "vitest";
import { StubAiClient } from "@/lib/ai/client";
import { loadKnowledge } from "@/lib/recommend/kb";
import { DISCUSS, recommend } from "@/lib/recommend/recommend";

const kb = loadKnowledge();

// Like reference case 1: community pneumonia, sepsis without shock, no MDR risk.
const pneumonia = {
  age: 62, sex: "male", weight_kg: 70, source: "lung", setting: "community_acquired",
  source_control: "not_needed", severity: "sepsis", sofa: 3, crcl_ml_min: 80, dialysis: "no",
  hepatic: "normal", antibiotics_90d: [], admission_90d: "no", prior_mdr: ["none"], devices: ["none"],
  comorbidities: ["diabetes", "copd"], immunocompromise: ["none"], allergies: [], current_antibiotics: [],
};

const lowRisk = ["esbl", "cre", "mrsa", "pseudomonas", "vre", "other"].map((organism) => ({
  organism, risk: "low", reason: "No risk factors recorded.",
}));

const goodAnswer = {
  regimen: "ceftriaxone + azithromycin",
  alternatives: ["ceftriaxone + doxycycline"],
  mdr_assessment: lowRisk,
  key_reasons: ["Community-acquired pneumonia with sepsis", "No MDR risk factors", "Atypical cover needed"],
  coverage_needed: [
    { category: "gram_positive", needed: true, reason: "Pneumococcus" },
    { category: "gram_negative", needed: true, reason: "Haemophilus and enteric organisms" },
    { category: "pseudomonas", needed: false, reason: "No Pseudomonas risk factors" },
    { category: "mrsa", needed: false, reason: "No MRSA risk factors" },
    { category: "esbl", needed: false, reason: "No ESBL risk factors" },
    { category: "cre", needed: false, reason: "No CRE risk factors" },
    { category: "anaerobes", needed: false, reason: "Lung source without anaerobic risk" },
    { category: "atypicals", needed: true, reason: "Community-acquired pneumonia" },
  ],
  stewardship: [{ action: "review_at_48_72h", text: "Review cultures and narrow if possible." }],
  reasoning: "Community-acquired pneumonia with sepsis and no MDR risk factors. The national guideline's ICU row gives ceftriaxone with azithromycin. COPD alone is not a Pseudomonas risk factor here.",
  citations: [
    { passage_id: "ncdc-12.5-icu", quote: "Ceftriaxone 2g OD IV + Azithromycin 500 mg daily" },
    { passage_id: "ssc-26", quote: "at low risk of infection with a specific MDR pathogen" },
  ],
  flags: [],
};

const ask = (answer: unknown, patient: object = pneumonia) => {
  const ai = new StubAiClient(typeof answer === "string" ? answer : JSON.stringify(answer));
  return { ai, result: recommend(patient, ai, kb) };
};

describe("recommendation with a correct AI answer", () => {
  it("returns the regimen with doses from drugs.csv, versions and disclaimers", async () => {
    const { result } = ask(goodAnswer);
    const r = await result;
    expect(r.status).toBe("recommendation");
    expect(r.regimen?.drugs.map((d) => [d.drug, d.dose, d.interval])).toEqual([
      ["ceftriaxone", kb.drugs.get("ceftriaxone")?.standard_dose, kb.drugs.get("ceftriaxone")?.interval],
      ["azithromycin", kb.drugs.get("azithromycin")?.standard_dose, kb.drugs.get("azithromycin")?.interval],
    ]);
    expect(r.versions.knowledgeBase).toBe(kb.version);
    expect(r.versions.guidelines.map((g) => g.guideline)).toEqual(["ssc2026", "idsa2026", "ncdc2025", "aware2023"]);
    expect(r.disclaimers).toContain("Decision support only — verify with clinical judgement and local policy.");
    expect(r.citations?.[0].location).toBe("§12.5 Community acquired pneumonia, p83");
    expect(r.flags.some((f) => f.startsWith("Differs from guideline table"))).toBe(false);
  });

  it("flags the draft knowledge base and the missing kidney dosing", async () => {
    const r = await ask(goodAnswer).result;
    expect(r.flags[0]).toMatch(/is a draft and not signed off/);
    expect(r.regimen?.drugs[0].notes[0]).toMatch(/Kidney-adjusted dose is not yet in the knowledge base/);
  });

  it("flags an answer that differs from the guideline table and shows the table's choice", async () => {
    const r = await ask({ ...goodAnswer, regimen: "meropenem + azithromycin" }).result;
    expect(r.status).toBe("recommendation");
    expect(r.flags).toContain("Differs from guideline table: the table suggests ceftriaxone + azithromycin.");
  });

  it("sends the AI only passages for this patient's source and setting, and no identifiers", async () => {
    const { ai, result } = ask(goodAnswer);
    await result;
    expect(ai.lastUserMessage).toContain("ncdc-12.5-icu");
    expect(ai.lastUserMessage).not.toContain("ncdc-5.2"); // urinary passage
    expect(ai.lastUserMessage).not.toMatch(/name|uhid|phone|address|date of birth/i);
  });
});

describe("safety checks stop unsafe AI answers", () => {
  const stopped = async (answer: unknown, expected: string, patient: object = pneumonia) => {
    const r = await ask(answer, patient).result;
    expect(r.status).toBe("no_recommendation");
    expect(r.regimen).toBeUndefined();
    expect(r.messages).toContain(DISCUSS);
    expect(r.messages.join(" ")).toContain(expected);
  };

  it("a drug that is not in drugs.csv", () =>
    stopped({ ...goodAnswer, regimen: "ceftriaxone + clarithromycin" }, '"clarithromycin" is not in the knowledge base drug list'));

  it("a dose written by the AI", () =>
    stopped({ ...goodAnswer, reasoning: "Give ceftriaxone 2 g daily with azithromycin." }, "contains a dose"));

  it("a quote that is not word for word from the guideline", () =>
    stopped(
      { ...goodAnswer, citations: [{ passage_id: "ncdc-12.5-icu", quote: "Ceftriaxone 1g OD IV + Azithromycin 500 mg daily" }] },
      "does not match the guideline text word for word",
    ));

  it("a made-up citation", () =>
    stopped({ ...goodAnswer, citations: [{ passage_id: "idsa-2030-q9", quote: "carbapenems are always preferred" }] }, "is not in the evidence given"));

  it("a real passage that was not given for this patient", () =>
    stopped(
      { ...goodAnswer, citations: [{ passage_id: "ncdc-5.2", quote: "Collect urine and blood specimens" }] },
      "is not in the evidence given for this patient",
    ));

  it("reasoning over 150 words", () => stopped({ ...goodAnswer, reasoning: "word ".repeat(151) }, "the limit is 150"));

  it("an answer that is not JSON", () => stopped("I recommend ceftriaxone.", "not valid JSON"));

  it("an answer with extra or missing fields", () => stopped({ ...goodAnswer, dose: "2 g" }, "not in the required format"));

  it("a drug from the class the patient is allergic to", () =>
    stopped(
      { ...goodAnswer, regimen: "piperacillin-tazobactam + azithromycin" },
      '"piperacillin-tazobactam" is excluded because of allergy to amoxicillin (rash)',
      { ...pneumonia, allergies: [{ drug: "amoxicillin", reaction: "rash" }] },
    ));

  it("any beta-lactam when the patient is allergic to beta-lactams", () =>
    stopped(goodAnswer, '"ceftriaxone" is excluded because of allergy to beta-lactam (anaphylaxis)', {
      ...pneumonia,
      allergies: [{ drug: "beta-lactam", reaction: "anaphylaxis" }],
    }));

  it("an AI that does not answer", async () => {
    const ai = { model: "stub", complete: () => Promise.reject(new Error("timeout")) };
    const r = await recommend(pneumonia, ai, kb);
    expect(r.status).toBe("no_recommendation");
    expect(r.messages).toEqual(["The AI did not answer.", DISCUSS]);
  });
});

describe("allergies", () => {
  const withAllergy = (drug: string, reaction: string) => ({ ...pneumonia, allergies: [{ drug, reaction }] });

  it("removes the allergy class from the drugs the AI may use", async () => {
    const { ai, result } = ask(goodAnswer, withAllergy("penicillins", "rash"));
    await result;
    const allowed = JSON.parse(ai.lastUserMessage).allowed_drugs as string[];
    expect(allowed).not.toContain("piperacillin-tazobactam");
    expect(allowed).toContain("ceftriaxone");
  });

  it("allows another class after a rash, without a cross-reactivity flag", async () => {
    const r = await ask(goodAnswer, withAllergy("penicillin", "rash")).result;
    expect(r.status).toBe("recommendation");
    expect(r.flags.some((f) => f.startsWith("Possible cross-reactivity"))).toBe(false);
  });

  it("flags cross-reactivity for another beta-lactam after anaphylaxis to a penicillin", async () => {
    const r = await ask(goodAnswer, withAllergy("amoxicillin", "anaphylaxis")).result;
    expect(r.status).toBe("recommendation");
    expect(r.flags).toContain(
      "Possible cross-reactivity: ceftriaxone is a beta-lactam and the patient had anaphylaxis to amoxicillin.",
    );
  });

  it("stops before the AI is asked when the allergen is not in the drug classes", async () => {
    const { ai, result } = ask(goodAnswer, withAllergy("xyzocillin", "rash"));
    const r = await result;
    expect(r.status).toBe("no_recommendation");
    expect(r.messages[0]).toBe("Allergy to xyzocillin cannot be checked: not found in the knowledge base drug classes.");
    expect(ai.calls).toBe(0);
  });
});

describe("inputs are checked before the AI is asked", () => {
  const notAsked = async (patient: object, status: string, message: RegExp) => {
    const { ai, result } = ask(goodAnswer, patient);
    const r = await result;
    expect(r.status).toBe(status);
    expect(r.messages.join(" ")).toMatch(message);
    expect(ai.calls).toBe(0);
  };

  it("missing field", () => notAsked({ ...pneumonia, sofa: undefined }, "missing_input", /Please enter: sofa/));
  it("under 18", () => notAsked({ ...pneumonia, age: 16 }, "out_of_scope", /Age under 18/));
  it("pregnancy", () => notAsked({ ...pneumonia, sex: "female", pregnancy: "yes" }, "out_of_scope", /Pregnancy/));
  it("pregnancy not answered for a female patient", () => notAsked({ ...pneumonia, sex: "female" }, "missing_input", /pregnancy/));
  it("neutropenia", () => notAsked({ ...pneumonia, immunocompromise: ["neutropenia"] }, "out_of_scope", /Neutropenic sepsis/));
  it("a value not in the vocabulary", () => notAsked({ ...pneumonia, source: "pneumonia" }, "invalid_input", /source/));
  it("a number typed into a drug-name field (possible phone or UHID)", () =>
    notAsked({ ...pneumonia, current_antibiotics: ["9876543210"] }, "invalid_input", /only letters/));
});
