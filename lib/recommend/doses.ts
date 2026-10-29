import type { PatientInput } from "./input";
import type { Knowledge } from "./kb";
import { regimenDrugs } from "./checks";

// CLAUDE.md rule 1: doses come only from knowledge/drugs.csv and are added by code.
export interface DoseLine {
  drug: string;
  dose: string;
  interval: string;
  infusion: string;
  notes: string[];
}

export function doseLines(regimen: string, patient: PatientInput, kb: Knowledge): DoseLine[] {
  return regimenDrugs(regimen).map((drug) => {
    const row = kb.drugs.get(drug);
    const notes: string[] = [];
    if (!row) return { drug, dose: "", interval: "", infusion: "", notes: ["Not in the knowledge base."] };
    if (!row.renal_bands) {
      notes.push(
        `Kidney-adjusted dose is not yet in the knowledge base: standard dose shown. Check for CrCl ${patient.crcl_ml_min} mL/min` +
          (patient.dialysis === "no" ? "." : ` and ${patient.dialysis}.`),
      );
    }
    if (patient.hepatic !== "normal" && !row.hepatic_adjustment) {
      notes.push(`Liver adjustment is not yet in the knowledge base: check for ${patient.hepatic} hepatic impairment.`);
    }
    return { drug, dose: row.standard_dose, interval: row.interval, infusion: row.infusion, notes };
  });
}
