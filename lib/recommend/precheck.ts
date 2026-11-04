import { assessAllergies } from "./allergy";
import { checkInput } from "./input";
import type { Knowledge } from "./kb";

// The checks run when the clinician presses "Get recommendation", before any AI call:
// the same input and allergy checks as recommend(), so the entry screen and the safety core agree.
export interface Precheck {
  status: "complete" | "missing_input" | "invalid_input" | "out_of_scope" | "allergy_unknown";
  messages: string[];
}

export function precheck(raw: unknown, kb: Knowledge): Precheck {
  const input = checkInput(raw, kb);
  if (!input.ok) {
    const status = input.kind === "out_of_scope" ? "out_of_scope" : input.kind === "missing" ? "missing_input" : "invalid_input";
    return { status, messages: input.messages };
  }
  const allergy = assessAllergies(input.patient, kb);
  if (allergy.unknown.length > 0) {
    return {
      status: "allergy_unknown",
      messages: [`Allergy to ${allergy.unknown.join(", ")} cannot be checked: not found in the knowledge base drug classes.`],
    };
  }
  return { status: "complete", messages: [] };
}
