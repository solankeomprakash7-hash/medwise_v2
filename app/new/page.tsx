import type { Metadata } from "next";
import { readTable } from "@/lib/knowledge/tables";
import EntryForm from "./EntryForm";
import type { Options } from "./EntryForm";

export const metadata: Metadata = { title: "New patient · MedWise" };

// The real AI can take a minute or two to reason; allow up to 5 minutes for the recommendation.
export const maxDuration = 300;

// Answer choices come from knowledge/vocabulary.csv, so the screen and the safety checks always agree.
function loadOptions(): Options {
  const choices: Options["choices"] = {};
  for (const row of readTable("vocabulary").rows) {
    (choices[row.field] ??= []).push({ value: row.value, label: row.label });
  }
  const classes = readTable("drug_classes").rows;
  const drugNames = [...new Set([...classes.map((r) => r.drug), ...classes.map((r) => r.class)])].sort();
  return { choices, drugNames };
}

export default function NewPatientPage() {
  return <EntryForm options={loadOptions()} />;
}
