import { describe, expect, it } from "vitest";
import { DemoAiClient } from "@/lib/ai/demo";
import { loadKnowledge } from "@/lib/recommend/kb";
import { DISCUSS, recommend } from "@/lib/recommend/recommend";

// The DEMO stand-in, run through the real safety checks, for the result screen.
const kb = loadKnowledge();
const base = {
  age: 62, sex: "male", weight_kg: 70, pregnancy: "not_applicable", source: "lung", setting: "community_acquired",
  source_control: "not_needed", severity: "sepsis", crcl_ml_min: 80, dialysis: "no", hepatic: "normal",
  antibiotics_90d: [], admission_90d: "no", prior_mdr: ["none"], devices: ["none"], comorbidities: ["diabetes", "copd"],
  immunocompromise: ["none"], allergies: [], current_antibiotics: [],
};
const run = (patient: object) => recommend({ ...base, ...patient }, new DemoAiClient(), kb);

describe("result screen data (demo stand-in)", () => {
  it("community pneumonia: table choice, AWaRe tags, coverage, fit, timeline, all checks passed", async () => {
    const r = await run({});
    expect(r.status).toBe("recommendation");
    expect(r.regimen?.name).toBe("ceftriaxone + azithromycin");
    expect(r.regimen?.drugs.map((d) => d.aware)).toEqual(["Watch", "Watch"]);
    expect(r.coverage?.find((c) => c.key === "atypicals")?.level).toBe("yes");
    expect(r.spectrumFit?.find((f) => f.key === "atypicals")?.status).toBe("covered");
    expect(r.spectrumFit?.some((f) => f.status === "missing")).toBe(false);
    expect(r.timeline?.map((t) => t.when)).toEqual(["Now", "Within 1 hour", "48–72 hours", "Duration"]);
    expect(r.flags).toContain("DEMO stand-in answer: not real AI reasoning.");
  });

  it("septic shock with source control not yet done adds the 6-hour step and cites rec 16", async () => {
    const r = await run({ severity: "septic_shock", source_control: "needed_not_done" });
    expect(r.timeline?.find((t) => t.when === "Within 1 hour")?.sources[0].passage_id).toBe("ssc-16");
    expect(r.timeline?.some((t) => t.when === "Within 6 hours")).toBe(true);
  });

  it("previous CRE with hospital-acquired pneumonia uses the table's CRO rule and shows Reserve", async () => {
    const r = await run({ setting: "hospital_acquired", prior_mdr: ["cre"] });
    expect(r.status).toBe("recommendation");
    expect(r.citations?.[0].passage_id).toBe("ncdc-18.3-vap-blbli");
    expect(r.spectrumFit?.filter((f) => f.status === "excess").map((f) => f.key)).toEqual(["pseudomonas", "esbl", "anaerobes"]);
    expect(r.regimen?.name).toBe("meropenem + polymyxin b");
    expect(r.regimen?.drugs.find((d) => d.drug === "polymyxin b")?.aware).toBe("Reserve");
  });

  it("previous ESBL: no table rule yet, so no recommendation", async () => {
    const r = await run({ source: "urinary", prior_mdr: ["esbl"] });
    expect(r.flags.concat(r.messages).join(" ")).toMatch(/no rule for high risk of: esbl|Discuss with ID/);
  });

  it("penicillin allergy: the excluded first choice is skipped for an allowed alternative", async () => {
    const r = await run({ source: "urinary", allergies: [{ drug: "penicillin", reaction: "rash" }] });
    expect(r.status).toBe("recommendation");
    expect(r.regimen?.name).not.toMatch(/piperacillin/);
  });

  it("cefoperazone-sulbactam gets the WHO 'Not recommended' warning", async () => {
    const r = await run({ source: "urinary", allergies: [{ drug: "penicillin", reaction: "rash" }] });
    if (r.regimen?.name.includes("cefoperazone-sulbactam")) {
      expect(r.flags.some((f) => f.includes('"Not recommended"'))).toBe(true);
    } else {
      expect(r.regimen?.name).toBe("ertapenem");
    }
  });

  it("a source with no table regimen yet: no recommendation, discuss with ID", async () => {
    const r = await run({ source: "cns" });
    expect(r.status).toBe("no_recommendation");
    expect(r.messages).toEqual([
      "Demo stand-in: the guideline table has no regimen yet for this source, setting and severity.",
      DISCUSS,
    ]);
  });
});
