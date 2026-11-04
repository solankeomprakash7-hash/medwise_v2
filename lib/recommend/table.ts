import { splitList } from "@/lib/knowledge/tables";
import { regimenDrugs } from "./checks";
import type { EvidencePack } from "./pack";

// What the guideline tables say for this patient, given the organisms the AI judged high risk.
// Used to flag answers that differ from the tables (CLAUDE.md rule 2).
export interface TableView {
  firstChoice: string | null;
  alternatives: string[];
  reference: string;
  note: string | null; // why the tables give no regimen, if they don't
}

export function guidelineTable(pack: EvidencePack, highRisk: string[]): TableView {
  const base = pack.baseRegimen;
  if (!base) {
    return { firstChoice: null, alternatives: [], reference: "", note: "The guideline table has no regimen yet for this source, setting and severity." };
  }
  const baseView = { firstChoice: base.first_choice, alternatives: splitList(base.alternative), reference: base.guideline_ref, note: null };
  if (highRisk.length === 0) return baseView;

  const wanted = [...highRisk].sort().join(";");
  const rule = pack.mdrCoverage.find((r) => splitList(r.organisms).sort().join(";") === wanted);
  if (!rule) {
    return { ...baseView, firstChoice: null, alternatives: [], note: `The guideline table has no rule for high risk of: ${highRisk.join(", ")}.` };
  }
  const firstChoice = rule.action === "replace" ? rule.regimen : `${base.first_choice} + ${rule.regimen}`;
  return { firstChoice, alternatives: [], reference: `${base.guideline_ref}; ${rule.guideline_ref}`, note: null };
}

// Same drugs, in any order.
export function sameRegimen(a: string, b: string): boolean {
  const key = (r: string) => regimenDrugs(r).sort().join("+");
  return key(a) === key(b);
}
