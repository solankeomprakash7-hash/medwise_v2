import { describe, it } from "vitest";

// Golden test set (CLAUDE.md rule 8): must pass before anything goes to the live site.
// Will read knowledge/golden_tests.csv and run every case through the rules engine.
// Waiting for: the signed-off golden_tests.csv and the rules engine (later steps).
describe("golden test set", () => {
  it.todo("every case in knowledge/golden_tests.csv gives the expected regimen");
});
