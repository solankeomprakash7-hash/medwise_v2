#!/usr/bin/env node
// Checks that every passage in knowledge/evidence.csv is copied word for word from its guideline PDF:
// all words of the passage must appear, in the same order, on the cited PDF page(s).
// Prose passages may skip only a few words (page footers, "New"/"Revisited" labels). Table passages are
// checked cell by cell (cells separated by " | "), because PDF tables interleave columns line by line.
// " … " in a passage marks words left out of the source; the pieces either side are checked separately.
//
// The PDFs are not stored in this repository (copyright). Run with the local copies:
//   node scripts/verify-evidence.mjs ssc2026=/path/ssc.pdf idsa2026=/path/idsa.pdf ncdc2025=/path/ncdc.pdf
// Needs `pdftotext` (poppler-utils).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";

// Words of other text allowed between two words of a passage.
const MAX_GAP = { prose: 15, table: 40 };

const pdfs = Object.fromEntries(process.argv.slice(2).map((arg) => arg.split("=")));
const csv = readFileSync(join(process.cwd(), "knowledge", "evidence.csv"), "utf8");
const rows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

function words(text) {
  return text
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ") // invisible control characters
    .replace(/\u00ad\s*/g, "") // soft hyphen at a line break
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .toLowerCase()
    .split(/[\s-]+/) // compound words are compared part by part
    .map((w) => w.replace(/^[.,;:()[\]"'•*|]+|[.,;:()[\]"'•*|]+$/g, ""))
    .filter(Boolean);
}

const pageCache = new Map();
// Prose is read in reading order; tables keep their layout so each cell's lines stay in order.
function pageWords(guideline, pages, format) {
  const key = `${guideline}:${pages}:${format}`;
  if (!pageCache.has(key)) {
    const [first, last = first] = pages.split("-");
    const layout = format === "table" ? ["-layout"] : [];
    const text = execFileSync("pdftotext", [...layout, "-f", first, "-l", last, pdfs[guideline], "-"], {
      encoding: "utf8",
    });
    pageCache.set(key, words(text));
  }
  return pageCache.get(key);
}

// Tries to match the passage starting at page word `start`. Returns how many passage words matched.
function matchFrom(passage, page, start, maxGap) {
  let j = start;
  let i = 0;
  while (i < passage.length) {
    let found = -1;
    let used = 1;
    const limit = i === 0 ? start + 1 : Math.min(page.length, j + maxGap + 1);
    for (let k = j; k < limit && found < 0; k++) {
      if (page[k] === passage[i]) found = k + 1;
      // A word split across two lines in the PDF ("recom" + "mendation").
      else if (k + 1 < page.length && page[k] + page[k + 1] === passage[i]) found = k + 2;
      // Two passage words printed as one ("multidrug-resistant" extracted as "multidrugresistant").
      else if (i + 1 < passage.length && page[k] === passage[i] + passage[i + 1]) {
        found = k + 1;
        used = 2;
      }
    }
    if (found < 0) return i;
    j = found;
    i += used;
  }
  return i;
}

// Returns the index of the first passage word that could not be matched from any start, or -1 if all matched.
function firstMismatch(passage, page, maxGap) {
  let best = 0;
  for (let start = 0; start < page.length; start++) {
    const matched = matchFrom(passage, page, start, maxGap);
    if (matched >= passage.length) return -1;
    best = Math.max(best, matched);
  }
  return best;
}

let failures = 0;
for (const row of rows) {
  if (!pdfs[row.guideline]) {
    console.log(`SKIP  ${row.passage_id}: no PDF given for ${row.guideline}`);
    failures++;
    continue;
  }
  const page = pageWords(row.guideline, row.pdf_page, row.format);
  // " | " separates table cells; " … " marks words left out of the source. Each piece is checked on its own.
  const cells = (row.format === "table" ? row.text.split(" | ") : [row.text]).flatMap((c) => c.split(" … "));
  const problems = [];
  for (const cell of cells) {
    const passage = words(cell);
    const miss = firstMismatch(passage, page, MAX_GAP[row.format] ?? MAX_GAP.prose);
    if (miss >= 0) {
      problems.push(`"${passage.slice(Math.max(0, miss - 3), miss + 3).join(" ")}" (word "${passage[miss]}")`);
    }
  }
  if (problems.length === 0) {
    console.log(`ok    ${row.passage_id}`);
  } else {
    failures++;
    console.log(`FAIL  ${row.passage_id}: ${problems.join("; ")} not found on PDF page ${row.pdf_page}`);
  }
}
console.log(`\n${rows.length - failures} of ${rows.length} passages verified word for word.`);
process.exit(failures ? 1 : 0);
