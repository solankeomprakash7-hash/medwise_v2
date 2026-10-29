"use server";

import { loadKnowledge } from "@/lib/recommend/kb";
import { precheck } from "@/lib/recommend/precheck";
import type { Precheck } from "@/lib/recommend/precheck";

// Runs on the server. Nothing is saved: the details are checked and discarded.
export async function checkPatientDetails(details: unknown): Promise<Precheck> {
  return precheck(details, loadKnowledge());
}
