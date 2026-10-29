import { appendFileSync, cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KNOWLEDGE_DIR } from "@/lib/knowledge/tables";
import { validateKnowledge } from "@/lib/knowledge/validate";

describe("knowledge base", () => {
  it("has no problems", () => {
    expect(validateKnowledge()).toEqual([]);
  });
});

// Each case breaks a copy of the knowledge base in one way and checks the validator notices.
function brokenCopy(edit: (dir: string) => void): string[] {
  const dir = mkdtempSync(join(tmpdir(), "kb-"));
  cpSync(KNOWLEDGE_DIR, dir, { recursive: true });
  edit(dir);
  return validateKnowledge(dir);
}

const append = (dir: string, file: string, line: string) => appendFileSync(join(dir, file), `${line}\n`);

describe("knowledge base checks catch mistakes", () => {
  it("regimen naming a drug with no dose row", () => {
    const problems = brokenCopy((dir) => {
      const coverage = join(dir, "coverage.csv");
      writeFileSync(coverage, readFileSync(coverage, "utf8").replace("lung,community_acquired,sepsis,empty", "lung,community_acquired,sepsis,draft"));
      append(dir, "regimens.csv", "lung,community_acquired,sepsis,ceftriaxone + azithromycin,,,SSC 2026 test");
    });
    expect(problems).toContain('regimens.csv line 2: first_choice names "ceftriaxone", which has no row in drugs.csv');
  });

  it("regimen without a guideline reference, for a combination still marked empty", () => {
    const problems = brokenCopy((dir) => {
      append(dir, "drugs.csv", "ceftriaxone,,,,,,,,,");
      append(dir, "regimens.csv", "lung,community_acquired,sepsis,ceftriaxone,,,");
    });
    expect(problems).toContain("regimens.csv line 2: guideline_ref is empty (every regimen must cite its source)");
    expect(problems).toContain('regimens.csv line 2: coverage.csv still marks this combination "empty"');
  });

  it("misspelled source", () => {
    const problems = brokenCopy((dir) => append(dir, "coverage.csv", "pneumonia,community_acquired,sepsis,empty,"));
    expect(problems).toContain('coverage.csv line 66: unknown source "pneumonia"');
  });

  it("gap in the coverage checklist", () => {
    const problems = brokenCopy((dir) => {
      const coverage = join(dir, "coverage.csv");
      writeFileSync(coverage, readFileSync(coverage, "utf8").replace("cns,hospital_acquired,septic_shock,empty,\n", ""));
    });
    expect(problems).toContain('coverage.csv: "cns / hospital_acquired / septic_shock" is missing from the checklist');
  });

  it("test case sent for review with inputs missing", () => {
    const problems = brokenCopy((dir) => {
      const golden = join(dir, "golden_tests.csv");
      writeFileSync(golden, readFileSync(golden, "utf8").replace("REF-01,CLINICAL_RULES.md reference case 1,inputs_incomplete", "REF-01,CLINICAL_RULES.md reference case 1,ready_for_review"));
    });
    expect(problems).toContain("golden_tests.csv REF-01: weight_kg is required before review");
  });

  it("possible patient identifier in a test case", () => {
    const problems = brokenCopy((dir) => {
      const golden = join(dir, "golden_tests.csv");
      writeFileSync(golden, readFileSync(golden, "utf8").replace("Atypical cover.", "UHID 12345. Atypical cover."));
    });
    expect(problems).toContain("golden_tests.csv REF-01: notes looks like it may contain a patient identifier; remove it");
  });

  it("drug row with no record of where it came from", () => {
    const problems = brokenCopy((dir) => append(dir, "drugs.csv", "linezolid,600 mg,every 12 h,,,,,,,"));
    expect(problems).toContain('drugs.csv line 29: "linezolid" has no entry in provenance.csv');
  });

  it("MDR weight left empty after sign-off", () => {
    const problems = brokenCopy((dir) => writeFileSync(join(dir, "VERSION"), "v1.0\n"));
    expect(problems).toContain("mdr_risk.csv line 2: weight is empty; every weight must be set before sign-off");
  });

  it("MDR coverage naming an unknown organism and a drug with no dose row", () => {
    const problems = brokenCopy((dir) =>
      append(dir, "mdr_coverage.csv", "esbl;crab,any,any,replace,meropenem + sulbactam-durlobactam,,IDSA 2026 Q5.1,"));
    expect(problems).toContain('mdr_coverage.csv line 2: unknown organism "crab"');
  });

  it("MDR coverage with an action other than add or replace", () => {
    const problems = brokenCopy((dir) => append(dir, "mdr_coverage.csv", "esbl,any,any,swap,meropenem,,IDSA 2026 Q1.3,"));
    expect(problems).toContain("mdr_coverage.csv line 2: action must be add or replace");
  });

  it("two MDR coverage rows for the same set of organisms", () => {
    const problems = brokenCopy((dir) => {
      append(dir, "mdr_coverage.csv", "esbl;mrsa,any,any,replace,meropenem,,ref,");
      append(dir, "mdr_coverage.csv", "mrsa;esbl,any,any,replace,ertapenem,,ref,");
    });
    expect(problems).toContain('mdr_coverage.csv line 3: another row already covers "esbl;mrsa|any|any"');
  });

  it("MDR threshold left empty after sign-off", () => {
    const problems = brokenCopy((dir) => writeFileSync(join(dir, "VERSION"), "v1.0\n"));
    expect(problems).toContain("mdr_thresholds.csv line 2: high_risk_threshold is empty; it must be set before sign-off");
  });

  it("wrong columns", () => {
    const problems = brokenCopy((dir) => writeFileSync(join(dir, "drugs.csv"), "drug,dose\n"));
    expect(problems.some((p) => p.startsWith("drugs.csv: columns should be"))).toBe(true);
  });
});
