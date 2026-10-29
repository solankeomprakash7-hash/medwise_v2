# DECISIONS — why things are the way they are

> Add a dated line for every decision. Newest at the top. Don't delete old lines; if a decision
> changes, add a new line that says what replaced what.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-29 | Evidence library `knowledge/evidence.csv`: 42 guideline passages (SSC 2026, IDSA 2026, NCDC/ICMR 2025) copied word for word, extracted and checked by script against the PDFs; record with PDF fingerprints in `EVIDENCE_VERIFIED.md` | The AI may cite only these passages; code checks citations against them (CLAUDE.md rule 2) |
| 2026-10-29 | Guideline PDFs are not stored on `main`; NCDC is on the `sources` branch. SSC and IDSA are copyrighted (Wolters Kluwer, OUP): only short passages are kept, for internal decision support; **check licensing before commercial launch** | Copyright; keeps the code repository small |
| 2026-10-29 | Page numbers corrected after automatic checking: IDSA questions 1.2–5.1 are one page later than first stated; SSC rec 27, 34, 39 and the "beyond the scope" sentence are p750, p754, p756, p750 | Automatic page finding is more reliable than reading two-column PDF text |
| 2026-10-29 | The AI makes the regimen decision from guidelines and evidence, within code-enforced checks (doses from tables, drug list, allergies, out-of-scope stops, verified citations). **Replaces** "AI chooses only from the rules engine's shortlist" (2026-10-26) and CLAUDE.md rules 1–2 | Owner wants evidence-based AI reasoning rather than a fixed lookup; safety rails keep doses and citations from being invented. Risks discussed: invented content, run-to-run variation, auditability, regulatory classification (CDSCO open item) |
| 2026-10-29 | Knowledge-base tables become the AI's reference and safety net; MDR weights/thresholds no longer mandatory; AI answer differing from the table is shown with both and flagged | Follows from the line above |
| 2026-10-29 | Golden tests run each patient 3 times through the AI; all runs must pass | Checks consistency, not only correctness |
| 2026-10-29 | NCDC/ICMR National Treatment Guidelines v2.0 (Nov 2025) used as the main source for base regimens; 14 base regimens, 9 MDR coverage rules and 9 drug doses drafted from it (lung, urinary, unknown source). Healthcare-associated setting not drafted | India's current national empiric guideline; SSC and IDSA give no empiric regimens |
| 2026-10-29 | Where NCDC and IDSA doses differ, `drugs.csv` keeps the IDSA row for now and the conflict is listed in `provenance.csv` for the panel | One dose per drug; the panel decides |
| 2026-10-29 | MDR design option (b): base regimen per source × setting × severity, per-organism risk scores with thresholds, and `mdr_coverage.csv` rules (add / replace) for each exact set of high-risk organisms; `risk_tier` removed from `regimens.csv`. CLINICAL_RULES.md updated with Dr. Solanke's approval | SSC 2026 rec 25–26 are per pathogen; an unlisted organism combination stops with "Discuss with ID / microbiology" rather than guessing |
| 2026-10-29 | Every drafted knowledge-base row is traced in `knowledge/provenance.csv` (source, page, gaps); checked automatically | Traceability without changing the table design in CLINICAL_RULES.md |
| 2026-10-29 | Drafted from the full SSC 2026 and IDSA 2026 texts: 27 drug doses (normal renal function) and 24 MDR risk rows (weights empty); no regimens | Neither guideline gives empiric regimens; regimens wait for ICMR 2022 / syndrome guidelines chosen by the panel |
| 2026-10-29 | MedWise covers any adult sepsis patient through rule tables (source × setting × severity × MDR risk), not stored cases; Case 1 and 2 are only the first golden tests | Clarified by Dr. Solanke: it is a general decision-support tool |
| 2026-10-29 | Golden test set to grow to cover every source, severity, MDR tier, renal band, allergy and out-of-scope stop; the 50 MAHACRITICON study patients (de-identified) to be entered as test cases | Two cases are far too few to protect patients |
| 2026-10-29 | Knowledge base built before login. Claude Code may draft rows from the guidelines, marked draft with citations; the advisory group corrects and signs off | Core of the app and needs the most panel time |
| 2026-10-29 | Knowledge-base conventions: lower-case codes from `knowledge/vocabulary.csv`, `;` for lists, ` + ` for combinations; `coverage.csv` tracks every combination; automatic checks in `npm run test` | Catches spelling, missing-dose and missing-coverage mistakes before review |
| 2026-10-29 | No regimen rows drafted from memory; drafting waits for full guideline texts (journal and ICMR sites blocked in the cloud session) | Clinical content must be traceable to the source text |
| 2026-10-29 | Knowledge base stays as CSV files on GitHub; new versions go in by pull request and must pass the golden tests; no owner upload screen | Guarantees tests run before a version goes live; full history; replaces "owner uploads KB versions" in PRODUCT.md |
| 2026-10-29 | Owner can see all hospitals' de-identified cases; everyone else only their own hospital | Owner's choice for quality review; hospital contracts must allow it |
| 2026-10-29 | Login by emailed link (no passwords); only the owner creates users | Nothing to forget, reuse or share on wards |
| 2026-10-29 | Database: hospitals, profiles, antibiograms, cases, decisions; cases and decisions append-only; `kb_versions` table dropped | Audit trail; KB history already lives on GitHub |
| 2026-10-29 | Hospital cut-off % and minimum isolates stored in the `hospitals` table, set by the hospital admin | One home for settings; `settings.csv` in CLINICAL_RULES.md to be reconciled by Dr. Solanke |
| 2026-10-29 | Use IDSA **2026** AMR guidance (Aug 2026), not 2024; ICMR 2022 edition to be confirmed | Newer versions found; see `docs/EVIDENCE_REVIEW.md` (draft) |
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
