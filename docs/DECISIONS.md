# DECISIONS — why things are the way they are

> Add a dated line for every decision. Newest at the top. Don't delete old lines; if a decision
> changes, add a new line that says what replaced what.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-29 | Branches: `main` = production site, `staging` = test site (Vercel); changes go to `staging` first | Release rule in ARCHITECTURE.md: test on staging and check on phone before production |
| 2026-10-28 | Docs moved into `docs/`; original zip kept in the repo | Matches the paths in `CLAUDE.md`; owner wants the original bundle kept |
| 2026-10-28 | Empty project: Next.js 16 + TypeScript + Tailwind 4, Vitest for tests, GitHub Actions runs checks on every push | Phase 2 step 1; checks catch mistakes before anything reaches staging |
| 2026-10-28 | Automatic test fails if "confidence %", "validated" or "approved" appears in app code | Enforces rule 5 without relying on memory |
| 2026-10-28 | Colour hex values in `app/globals.css` are placeholders | `DESIGN.md` hex codes still to be filled |
| 2026-10-26 | Rebuild from scratch instead of extending the Google AI Studio prototype | Prototype is one AI prompt with no structure, no login, no logging, possible key exposure |
| 2026-10-26 | Split into rules engine → AI layer → safety check | Same patient gets the same allowed options; every output is auditable; AI cannot invent drugs or doses |
| 2026-10-26 | Doses come only from `drugs.csv`, never from the AI | Patient safety and regulatory traceability |
| 2026-10-26 | Remove "confidence %" and "validated" wording | Not calibrated or validated; regulatory risk |
| 2026-10-26 | Per-hospital antibiogram upload | Localisation is the core value and the basis of the subscription |
| 2026-10-26 | No patient identifiers stored | DPDP Act; lowers risk |
| 2026-10-26 | Tools: Next.js, Supabase (India region), Vercel, GitHub, Claude API (paid) | Beginner-friendly, works well with Claude Code |
| 2026-10-26 | Version 1 is adults with sepsis, empiric therapy only | Matches the evidence from the 50-patient study |
| | *Open: Indian guideline source and exact edition* | Decide with the advisory group |
| | *Open: empiric susceptibility cut-off % (e.g. 80% or 90%)* | Stewardship committee to set |
| | *Open: regulatory classification under CDSCO MDSW guidance (2026)* | Regulatory consultant |
