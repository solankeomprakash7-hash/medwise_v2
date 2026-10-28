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
