import { KNOWLEDGE_DIR, TABLE_COLUMNS, readTable, readVersion, regimenDrugs, splitList } from "./tables";
import type { Row, TableName } from "./tables";

// Checks the knowledge-base tables for mistakes. Returns a list of problems in plain words;
// an empty list means the tables are consistent. It does NOT judge whether the clinical content
// is right; that is the advisory group's job.

const COVERAGE_STATUSES = ["empty", "draft", "signed_off", "not_applicable"];
const REVIEW_STATUSES = ["inputs_incomplete", "ready_for_review", "signed_off"];

// golden_tests column -> vocabulary field, for coded columns.
const CODED_COLUMNS: Record<string, string> = {
  sex: "sex",
  source: "source",
  setting: "setting",
  source_control: "source_control",
  severity: "severity",
  dialysis: "dialysis",
  hepatic: "hepatic",
  admission_90d: "admission_90d",
  prior_mdr: "prior_mdr",
  devices: "devices",
  comorbidities: "comorbidities",
  immunocompromise: "immunocompromise",
  pregnancy: "pregnancy",
};

// Required inputs from the CLINICAL_RULES.md input table ("none" counts as filled).
const REQUIRED_INPUTS = [
  "age", "sex", "weight_kg", "source", "setting", "source_control", "severity", "sofa",
  "crcl_ml_min", "dialysis", "hepatic", "antibiotics_90d", "admission_90d", "prior_mdr",
  "devices", "comorbidities", "immunocompromise", "allergies",
];

// Rough guard for CLAUDE.md rule 4: words or numbers that suggest a patient identifier.
const IDENTIFIER_PATTERNS = [/\buhid\b/i, /\bip\s*no\b/i, /\bdob\b/i, /\bdate of birth\b/i, /\b\d{10}\b/, /\bmr\.?\s|\bmrs\.?\s|\bms\.?\s/i];

export function validateKnowledge(dir = KNOWLEDGE_DIR): string[] {
  const problems: string[] = [];
  const tables = {} as Record<TableName, Row[]>;

  for (const name of Object.keys(TABLE_COLUMNS) as TableName[]) {
    try {
      const table = readTable(name, dir);
      const expected = TABLE_COLUMNS[name].join(",");
      if (table.columns.join(",") !== expected) {
        problems.push(`${name}.csv: columns should be "${expected}" but are "${table.columns.join(",")}"`);
      }
      tables[name] = table.rows;
    } catch (e) {
      problems.push(`${name}.csv: cannot be read (${(e as Error).message})`);
      tables[name] = [];
    }
  }

  let version = "";
  try {
    version = readVersion(dir);
  } catch {
    problems.push("VERSION file is missing");
  }
  if (version && !/^v\d+\.\d+(-draft)?$/.test(version)) {
    problems.push(`VERSION "${version}" should look like v0.1-draft or v1.0`);
  }

  // Provenance: every drafted row in drugs, mdr_risk and regimens must say where it came from.
  const provenance = new Set<string>();
  for (const [i, row] of tables.provenance.entries()) {
    if (!["drugs", "mdr_risk", "regimens", "mdr_coverage"].includes(row.table)) {
      problems.push(`provenance.csv line ${i + 2}: table must be drugs, mdr_risk, regimens or mdr_coverage`);
    }
    if (!row.source || !row.location) problems.push(`provenance.csv line ${i + 2}: source and location are required`);
    provenance.add(`${row.table}|${row.row_key}`);
  }
  const traced = (table: string, key: string) => provenance.has(`${table}|${key}`);

  // Vocabulary
  const vocab = new Map<string, Set<string>>();
  const multi = new Map<string, boolean>();
  for (const [i, row] of tables.vocabulary.entries()) {
    const values = vocab.get(row.field) ?? new Set<string>();
    if (values.has(row.value)) problems.push(`vocabulary.csv line ${i + 2}: "${row.field} = ${row.value}" appears twice`);
    values.add(row.value);
    vocab.set(row.field, values);
    if (row.multi !== "yes" && row.multi !== "no") problems.push(`vocabulary.csv line ${i + 2}: multi must be yes or no`);
    multi.set(row.field, row.multi === "yes");
  }
  const allowed = (field: string, value: string) => vocab.get(field)?.has(value) ?? false;

  // Drugs
  const drugs = new Set<string>();
  for (const [i, row] of tables.drugs.entries()) {
    if (!row.drug) problems.push(`drugs.csv line ${i + 2}: drug name is empty`);
    else if (row.drug !== row.drug.toLowerCase()) problems.push(`drugs.csv line ${i + 2}: write "${row.drug}" in lower case`);
    else if (drugs.has(row.drug)) problems.push(`drugs.csv line ${i + 2}: "${row.drug}" appears twice`);
    drugs.add(row.drug);
    if (row.drug && !traced("drugs", row.drug)) problems.push(`drugs.csv line ${i + 2}: "${row.drug}" has no entry in provenance.csv`);
  }

  // Drug classes: every drug MedWise can recommend must have a class, for allergy checks.
  const classed = new Set<string>();
  for (const [i, row] of tables.drug_classes.entries()) {
    const where = `drug_classes.csv line ${i + 2}`;
    if (!row.drug || row.drug !== row.drug.toLowerCase()) problems.push(`${where}: drug must be written in lower case`);
    if (classed.has(row.drug)) problems.push(`${where}: "${row.drug}" appears twice`);
    classed.add(row.drug);
    if (!row.class) problems.push(`${where}: class is empty`);
    if (row.beta_lactam !== "yes" && row.beta_lactam !== "no") problems.push(`${where}: beta_lactam must be yes or no`);
    if (!row.source) problems.push(`${where}: source is empty`);
  }
  for (const drug of drugs) {
    if (!classed.has(drug)) problems.push(`drug_classes.csv: "${drug}" (in drugs.csv) has no class, so allergies to it cannot be checked`);
  }

  // Coverage checklist: every source × setting × severity exactly once
  const coverage = new Map<string, string>();
  for (const [i, row] of tables.coverage.entries()) {
    const key = `${row.source} / ${row.setting} / ${row.severity}`;
    for (const field of ["source", "setting", "severity"]) {
      if (!allowed(field, row[field])) problems.push(`coverage.csv line ${i + 2}: unknown ${field} "${row[field]}"`);
    }
    if (!COVERAGE_STATUSES.includes(row.status)) {
      problems.push(`coverage.csv line ${i + 2}: status must be one of ${COVERAGE_STATUSES.join(", ")}`);
    }
    if (coverage.has(key)) problems.push(`coverage.csv line ${i + 2}: "${key}" appears twice`);
    coverage.set(key, row.status);
  }
  for (const source of vocab.get("source") ?? []) {
    for (const setting of vocab.get("setting") ?? []) {
      for (const severity of vocab.get("severity") ?? []) {
        const key = `${source} / ${setting} / ${severity}`;
        if (!coverage.has(key)) problems.push(`coverage.csv: "${key}" is missing from the checklist`);
      }
    }
  }

  // Regimens
  for (const [i, row] of tables.regimens.entries()) {
    const where = `regimens.csv line ${i + 2}`;
    for (const field of ["source", "setting", "severity"]) {
      if (!allowed(field, row[field])) problems.push(`${where}: unknown ${field} "${row[field]}"`);
    }
    if (!row.first_choice) problems.push(`${where}: first_choice is empty`);
    if (splitList(row.first_choice).length > 1) problems.push(`${where}: first_choice must be one regimen (put others in alternative)`);
    if (!row.guideline_ref) problems.push(`${where}: guideline_ref is empty (every regimen must cite its source)`);
    for (const column of ["first_choice", "alternative", "beta_lactam_allergy_alt"]) {
      for (const drug of splitList(row[column]).flatMap(regimenDrugs)) {
        if (!drugs.has(drug)) problems.push(`${where}: ${column} names "${drug}", which has no row in drugs.csv`);
      }
    }
    const regimenKey = [row.source, row.setting, row.severity].join("|");
    if (!traced("regimens", regimenKey)) problems.push(`${where}: "${regimenKey}" has no entry in provenance.csv`);
    const status = coverage.get(`${row.source} / ${row.setting} / ${row.severity}`);
    if (status === "empty" || status === "not_applicable") {
      problems.push(`${where}: coverage.csv still marks this combination "${status}"`);
    }
  }

  // MDR risk rules
  for (const [i, row] of tables.mdr_risk.entries()) {
    const where = `mdr_risk.csv line ${i + 2}`;
    if (!row.risk_factor) problems.push(`${where}: risk_factor is empty`);
    if (row.organism === "none" || !allowed("prior_mdr", row.organism)) {
      problems.push(`${where}: unknown organism "${row.organism}"`);
    }
    // Weights are optional (DECISIONS 2026-10-29: the AI weighs MDR risk); if given, they must be numbers.
    if (row.weight !== "" && !/^-?\d+(\.\d+)?$/.test(row.weight)) {
      problems.push(`${where}: weight "${row.weight}" is not a number`);
    }
    if (!traced("mdr_risk", `${row.risk_factor}|${row.organism}`)) {
      problems.push(`${where}: "${row.risk_factor}|${row.organism}" has no entry in provenance.csv`);
    }
    if (!row.guideline_ref) problems.push(`${where}: guideline_ref is empty`);
  }

  // MDR organisms are the prior_mdr input values except "none".
  const organisms = [...(vocab.get("prior_mdr") ?? [])].filter((o) => o !== "none");

  // MDR thresholds: one row per organism; empty only while the knowledge base is a draft.
  const thresholdOrganisms = new Set<string>();
  for (const [i, row] of tables.mdr_thresholds.entries()) {
    const where = `mdr_thresholds.csv line ${i + 2}`;
    if (!organisms.includes(row.organism)) problems.push(`${where}: unknown organism "${row.organism}"`);
    if (thresholdOrganisms.has(row.organism)) problems.push(`${where}: "${row.organism}" appears twice`);
    thresholdOrganisms.add(row.organism);
    // Thresholds are optional (DECISIONS 2026-10-29); if given, they must be above 0.
    if (row.high_risk_threshold !== "" && !(Number(row.high_risk_threshold) > 0)) {
      problems.push(`${where}: high_risk_threshold "${row.high_risk_threshold}" must be a number above 0`);
    }
    if (!row.basis) problems.push(`${where}: basis is empty (say where the threshold comes from)`);
  }
  for (const organism of organisms) {
    if (!thresholdOrganisms.has(organism)) problems.push(`mdr_thresholds.csv: "${organism}" has no threshold row`);
  }

  // MDR coverage: the exact set of high-risk organisms -> add to, or replace, the base regimen.
  const coverageKeys = new Set<string>();
  for (const [i, row] of tables.mdr_coverage.entries()) {
    const where = `mdr_coverage.csv line ${i + 2}`;
    const set = splitList(row.organisms);
    if (set.length === 0) problems.push(`${where}: organisms is empty`);
    for (const organism of set) {
      if (!organisms.includes(organism)) problems.push(`${where}: unknown organism "${organism}"`);
    }
    if (new Set(set).size !== set.length) problems.push(`${where}: an organism is listed twice`);
    if (row.source !== "any" && !allowed("source", row.source)) problems.push(`${where}: unknown source "${row.source}"`);
    if (row.severity !== "any" && !allowed("severity", row.severity)) problems.push(`${where}: unknown severity "${row.severity}"`);
    if (row.action !== "add" && row.action !== "replace") problems.push(`${where}: action must be add or replace`);
    if (!row.regimen) problems.push(`${where}: regimen is empty`);
    if (!row.guideline_ref) problems.push(`${where}: guideline_ref is empty (every coverage rule must cite its source)`);
    for (const column of ["regimen", "beta_lactam_allergy_alt"]) {
      for (const drug of splitList(row[column]).flatMap(regimenDrugs)) {
        if (!drugs.has(drug)) problems.push(`${where}: ${column} names "${drug}", which has no row in drugs.csv`);
      }
    }
    // Organism order does not matter: "esbl;mrsa" and "mrsa;esbl" are the same set.
    const key = [[...set].sort().join(";"), row.source, row.severity].join("|");
    if (coverageKeys.has(key)) problems.push(`${where}: another row already covers "${key}"`);
    coverageKeys.add(key);
    if (!traced("mdr_coverage", [row.organisms, row.source, row.severity].join("|"))) {
      problems.push(`${where}: "${[row.organisms, row.source, row.severity].join("|")}" has no entry in provenance.csv`);
    }
  }

  // Guidelines and evidence library
  const guidelines = new Set(tables.guidelines.map((row) => row.guideline));
  for (const [i, row] of tables.guidelines.entries()) {
    if (!row.guideline || !row.title || !row.version) problems.push(`guidelines.csv line ${i + 2}: guideline, title and version are required`);
  }
  const passageIds = new Set<string>();
  const tagFields: [string, string, string[]][] = [
    ["sources", "source", []],
    ["settings", "setting", []],
    ["organisms", "prior_mdr", ["none"]],
  ];
  for (const [i, row] of tables.evidence.entries()) {
    const where = `evidence.csv ${row.passage_id || `line ${i + 2}`}`;
    if (!row.passage_id) problems.push(`evidence.csv line ${i + 2}: passage_id is empty`);
    if (passageIds.has(row.passage_id)) problems.push(`${where}: passage_id appears twice`);
    passageIds.add(row.passage_id);
    if (!guidelines.has(row.guideline)) problems.push(`${where}: guideline "${row.guideline}" is not in guidelines.csv`);
    if (!row.location) problems.push(`${where}: location is empty`);
    if (!/^\d+(-\d+)?$/.test(row.pdf_page)) problems.push(`${where}: pdf_page "${row.pdf_page}" should be a page or range like 36-37`);
    if (row.format !== "prose" && row.format !== "table") problems.push(`${where}: format must be prose or table`);
    if (row.format === "table" && row.text.split(" | ").length !== row.table_columns.split(" | ").length) {
      problems.push(`${where}: number of cells in text does not match table_columns`);
    }
    if (!row.text) problems.push(`${where}: text is empty`);
    if (!row.topics) problems.push(`${where}: topics is empty`);
    for (const [column, field, excluded] of tagFields) {
      for (const tag of splitList(row[column])) {
        if (tag !== "any" && (!allowed(field, tag) || excluded.includes(tag))) problems.push(`${where}: unknown ${column} tag "${tag}"`);
      }
      if (splitList(row[column]).length === 0) problems.push(`${where}: ${column} is empty (use "any")`);
    }
  }

  // Antibiogram template
  for (const [i, row] of tables.antibiogram_template.entries()) {
    if (row.unit !== "ICU" && row.unit !== "ward") problems.push(`antibiogram_template.csv line ${i + 2}: unit must be ICU or ward`);
  }

  // Golden test cases
  const caseIds = new Set<string>();
  for (const [i, row] of tables.golden_tests.entries()) {
    const where = `golden_tests.csv ${row.case_id || `line ${i + 2}`}`;
    if (!row.case_id) problems.push(`golden_tests.csv line ${i + 2}: case_id is empty`);
    if (caseIds.has(row.case_id)) problems.push(`${where}: case_id appears twice`);
    caseIds.add(row.case_id);
    if (!REVIEW_STATUSES.includes(row.review_status)) {
      problems.push(`${where}: review_status must be one of ${REVIEW_STATUSES.join(", ")}`);
    }

    for (const [column, field] of Object.entries(CODED_COLUMNS)) {
      const values = multi.get(field) ? splitList(row[column]) : row[column] ? [row[column]] : [];
      for (const value of values) {
        if (!allowed(field, value)) problems.push(`${where}: unknown ${column} "${value}"`);
      }
    }
    for (const allergy of splitList(row.allergies)) {
      if (allergy === "none") continue;
      const reaction = allergy.split(":")[1];
      if (!allowed("allergy_reaction", reaction)) problems.push(`${where}: allergy "${allergy}" should be drug:rash, drug:anaphylaxis or drug:other`);
    }
    const numbers: [string, number, number][] = [["age", 18, 110], ["sofa", 0, 24], ["weight_kg", 20, 300], ["crcl_ml_min", 0, 250]];
    for (const [column, min, max] of numbers) {
      if (row[column] && !(Number(row[column]) >= min && Number(row[column]) <= max)) {
        problems.push(`${where}: ${column} "${row[column]}" should be a number from ${min} to ${max}`);
      }
    }
    for (const column of TABLE_COLUMNS.golden_tests) {
      if (IDENTIFIER_PATTERNS.some((p) => p.test(row[column] ?? ""))) {
        problems.push(`${where}: ${column} looks like it may contain a patient identifier; remove it`);
      }
    }

    if (row.review_status === "ready_for_review" || row.review_status === "signed_off") {
      for (const column of REQUIRED_INPUTS) {
        if (!row[column]) problems.push(`${where}: ${column} is required before review`);
      }
      if (row.sex === "female" && !row.pregnancy) problems.push(`${where}: pregnancy is required for female patients`);
      if (!row.expected_regimen) problems.push(`${where}: expected_regimen is required before review`);
    }
    if (row.review_status === "signed_off") {
      for (const column of ["expected_regimen", "acceptable_alternatives"]) {
        for (const regimen of splitList(row[column])) {
          for (const drug of regimenDrugs(regimen)) {
            if (!drugs.has(drug)) problems.push(`${where}: ${column} names "${drug}", which has no row in drugs.csv`);
          }
        }
      }
    }
  }

  return problems;
}
