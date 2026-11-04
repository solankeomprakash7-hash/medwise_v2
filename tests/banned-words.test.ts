import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md rule 5: no "confidence %", "validated" or "approved" wording anywhere in the app.
const APP_FOLDERS = ["app", "lib"];
const BANNED = [/confidence\s*%/i, /\bvalidated\b/i, /\bapproved\b/i];

function codeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return codeFiles(path);
    return /\.(ts|tsx|js|jsx|css|json)$/.test(name) ? [path] : [];
  });
}

describe("banned wording", () => {
  for (const file of APP_FOLDERS.flatMap(codeFiles)) {
    it(`${file} has no banned wording`, () => {
      const text = readFileSync(file, "utf8");
      for (const pattern of BANNED) expect(text).not.toMatch(pattern);
    });
  }
});

// Owner's website rule (DESIGN.md, DECISIONS 2026-10-29): no em dashes in anything the screens show.
// Comments are ignored. The clinical disclaimer in lib/recommend/recommend.ts is fixed wording from
// CLINICAL_RULES.md and is checked there, not here.
describe("no em dashes on screen", () => {
  for (const file of codeFiles("app").filter((f) => f.endsWith(".tsx"))) {
    it(`${file} shows no em dash`, () => {
      const visible = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\{\/\*|\*)/.test(line))
        .join("\n");
      expect(visible).not.toContain("—");
    });
  }
});
