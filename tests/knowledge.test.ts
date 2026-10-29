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

// Line number the next appended row will have (header is line 1).
const nextLine = (file: string) => readFileSync(join(KNOWLEDGE_DIR, file), "utf8").trimEnd().split("\n").length + 1;

// A drug name that will never be in drugs.csv.
const FAKE = "madeupcillin";

describe("knowledge base checks catch mistakes", () => {
  it("regimen naming a drug with no dose row", () => {
    const problems = brokenCopy((dir) => {
      const coverage = join(dir, "coverage.csv");
      writeFileSync(coverage, readFileSync(coverage, "utf8").replace("cns,community_acquired,sepsis,empty", "cns,community_acquired,sepsis,draft"));
      append(dir, "regimens.csv", `cns,community_acquired,sepsis,ceftriaxone + ${FAKE},,,test ref`);
    });
    expect(problems).toContain(`regimens.csv line ${nextLine("regimens.csv")}: first_choice names "${FAKE}", which has no row in drugs.csv`);
  });

  it("regimen without a guideline reference, for a combination still marked empty", () => {
    const problems = brokenCopy((dir) => {
      append(dir, "regimens.csv", "cns,community_acquired,sepsis,ceftriaxone,,,");
    });
    const line = nextLine("regimens.csv");
    expect(problems).toContain(`regimens.csv line ${line}: guideline_ref is empty (every regimen must cite its source)`);
    expect(problems).toContain(`regimens.csv line ${line}: coverage.csv still marks this combination "empty"`);
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
    const problems = brokenCopy((dir) => append(dir, "drugs.csv", `${FAKE},1 g,every 12 h,,,,,,,`));
    expect(problems).toContain(`drugs.csv line ${nextLine("drugs.csv")}: "${FAKE}" has no entry in provenance.csv`);
  });

  it("MDR weight left empty after sign-off", () => {
    const problems = brokenCopy((dir) => writeFileSync(join(dir, "VERSION"), "v1.0\n"));
    expect(problems).toContain("mdr_risk.csv line 2: weight is empty; every weight must be set before sign-off");
  });

  it("MDR coverage naming an unknown organism and a drug with no dose row", () => {
    const problems = brokenCopy((dir) =>
      append(dir, "mdr_coverage.csv", `esbl;crab,any,any,replace,meropenem + ${FAKE},,IDSA 2026 Q5.1,`));
    const line = nextLine("mdr_coverage.csv");
    expect(problems).toContain(`mdr_coverage.csv line ${line}: unknown organism "crab"`);
    expect(problems).toContain(`mdr_coverage.csv line ${line}: regimen names "${FAKE}", which has no row in drugs.csv`);
  });

  it("MDR coverage with an action other than add or replace", () => {
    const problems = brokenCopy((dir) => append(dir, "mdr_coverage.csv", "esbl,any,any,swap,meropenem,,IDSA 2026 Q1.3,"));
    expect(problems).toContain(`mdr_coverage.csv line ${nextLine("mdr_coverage.csv")}: action must be add or replace`);
  });

  it("two MDR coverage rows for the same set of organisms", () => {
    const problems = brokenCopy((dir) => {
      append(dir, "mdr_coverage.csv", "esbl;mrsa,any,any,replace,meropenem,,ref,");
      append(dir, "mdr_coverage.csv", "mrsa;esbl,any,any,replace,ertapenem,,ref,");
    });
    expect(problems).toContain(`mdr_coverage.csv line ${nextLine("mdr_coverage.csv") + 1}: another row already covers "esbl;mrsa|any|any"`);
  });

  it("MDR threshold left empty after sign-off", () => {
    const problems = brokenCopy((dir) => writeFileSync(join(dir, "VERSION"), "v1.0\n"));
    expect(problems).toContain("mdr_thresholds.csv line 2: high_risk_threshold is empty; it must be set before sign-off");
  });

  it("more than one regimen in first_choice", () => {
    const problems = brokenCopy((dir) => {
      const regimens = join(dir, "regimens.csv");
      writeFileSync(regimens, readFileSync(regimens, "utf8").replace(",piperacillin-tazobactam,cefoperazone-sulbactam,", ",piperacillin-tazobactam; meropenem,cefoperazone-sulbactam,"));
    });
    expect(problems.some((p) => p.endsWith("first_choice must be one regimen (put others in alternative)"))).toBe(true);
  });

  it("wrong columns", () => {
    const problems = brokenCopy((dir) => writeFileSync(join(dir, "drugs.csv"), "drug,dose\n"));
    expect(problems.some((p) => p.startsWith("drugs.csv: columns should be"))).toBe(true);
  });
});
