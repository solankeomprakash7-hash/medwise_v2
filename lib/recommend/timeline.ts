import type { PatientInput } from "./input";
import type { Knowledge } from "./kb";

// Review timeline shown on every result (DESIGN.md card 9). Fixed wording from code; each step cites a
// passage of the evidence library, so the timing comes from the guidelines, not from the AI.
export interface TimelineStep {
  when: string;
  action: string;
  sources: { passage_id: string; guideline: string; location: string }[];
}

export function reviewTimeline(patient: PatientInput, kb: Knowledge): TimelineStep[] {
  const cite = (...ids: string[]) =>
    ids.flatMap((id) => {
      const p = kb.evidence.find((e) => e.passage_id === id);
      return p ? [{ passage_id: id, guideline: p.guideline, location: p.location }] : [];
    });
  const steps: TimelineStep[] = [
    { when: "Now", action: "Send cultures before the first dose.", sources: cite("ncdc-cultures-first") },
    {
      when: "Within 1 hour",
      action: "Give the first dose immediately, ideally within 1 hour of recognition.",
      sources: cite(patient.severity === "septic_shock" ? "ssc-16" : "ssc-17"),
    },
  ];
  if (patient.source_control === "needed_not_done") {
    steps.push({ when: "Within 6 hours", action: "Achieve source control, ideally within 6 hours.", sources: cite("ssc-24") });
  }
  steps.push(
    {
      when: "48–72 hours",
      action: "Review culture results; de-escalate once the organism and susceptibilities are known.",
      sources: cite("ssc-36"),
    },
    {
      when: "Duration",
      action: "With adequate source control, prefer a shorter course.",
      sources: cite("ssc-39"),
    },
  );
  return steps;
}
