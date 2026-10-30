import type { PatientInput } from "./input";
import type { Knowledge } from "./kb";

// Allergy rules (CLINICAL_RULES.md safety rules), using knowledge/drug_classes.csv only:
// - allergy to a drug or a class (any reaction) → every drug in that class is excluded;
// - anaphylaxis to a beta-lactam → other beta-lactams are flagged for cross-reactivity;
// - an allergen not found as a drug or a class → it cannot be checked (no recommendation).
export interface AllergyAssessment {
  unknown: string[];
  excluded: Map<string, string>; // drug → reason
  crossReactive: Map<string, string>; // drug → reason
}

const BETA_LACTAM_WORDS = new Set(["beta-lactam", "beta lactam", "betalactam", "β-lactam"]);

const clean = (name: string) => name.trim().toLowerCase();
// "penicillins" → "penicillin"
const singular = (name: string) => (name.endsWith("s") ? name.slice(0, -1) : name);

export function assessAllergies(patient: PatientInput, kb: Knowledge): AllergyAssessment {
  const unknown: string[] = [];
  const excluded = new Map<string, string>();
  const crossReactive = new Map<string, string>();
  const classes = new Set([...kb.drugClasses.values()].map((c) => c.class));
  const betaLactams = [...kb.drugClasses].filter(([, c]) => c.beta_lactam === "yes").map(([drug]) => drug);

  for (const allergy of patient.allergies) {
    const name = clean(allergy.drug);
    const label = `${allergy.drug} (${allergy.reaction})`;
    let allergenClass: string | null = null;
    let allergenIsBetaLactam = false;

    if (BETA_LACTAM_WORDS.has(name) || BETA_LACTAM_WORDS.has(singular(name))) {
      for (const drug of betaLactams) excluded.set(drug, `allergy to ${label}`);
      allergenIsBetaLactam = true;
    } else {
      const drugRow = kb.drugClasses.get(name);
      allergenClass = drugRow?.class ?? (classes.has(name) ? name : classes.has(singular(name)) ? singular(name) : null);
      if (allergenClass === null) {
        unknown.push(allergy.drug);
        continue;
      }
      for (const [drug, c] of kb.drugClasses) {
        if (c.class === allergenClass) {
          excluded.set(drug, `allergy to ${label}`);
          if (c.beta_lactam === "yes") allergenIsBetaLactam = true;
        }
      }
    }

    if (allergy.reaction === "anaphylaxis" && allergenIsBetaLactam) {
      for (const drug of betaLactams) {
        if (!excluded.has(drug)) crossReactive.set(drug, `anaphylaxis to ${allergy.drug}`);
      }
    }
  }
  return { unknown, excluded, crossReactive };
}
