# Knowledge base

The only source of clinical content in MedWise (CLAUDE.md rule 1). The rules engine reads these
tables; the AI never adds drugs, doses or rules.

**Current version: see `VERSION`.** While it ends in `-draft`, nothing here is signed off and the
app must not be used for patients.

## Files
| File | What it holds | Status |
| --- | --- | --- |
| `vocabulary.csv` | Allowed answers for every input field, taken from the input table in `docs/CLINICAL_RULES.md`. Every other table must use these exact spellings | Draft. Dialysis types (haemodialysis / peritoneal / CRRT) to be confirmed |
| `coverage.csv` | Checklist: every source × setting × severity combination, and whether it has a regimen yet | All `empty` |
| `regimens.csv` | Regimen for each source × setting × severity × MDR risk tier | Empty: SSC 2026 and IDSA 2026 give no empiric regimens; needs ICMR 2022 / syndrome guidelines |
| `mdr_risk.csv` | Risk factors and how much they raise the risk of each MDR organism | Draft: 4 factors × 6 organisms from SSC 2026 rec 25 and IDSA 2026; weights empty (panel) |
| `drugs.csv` | Dose, interval, infusion, renal / hepatic adjustment, interactions, monitoring, site penetration | Draft: 27 drugs from IDSA 2026 Table 1, normal-renal doses only; other columns empty |
| `provenance.csv` | Where every drafted row came from (guideline, page, recommendation) and known gaps | Every drugs / mdr_risk / regimens row must have an entry |
| `antibiogram_template.csv` | Format a hospital uses to upload its antibiogram | Columns only |
| `golden_tests.csv` | Test patients with the expected answer. Must all pass before anything goes live (rule 8) | 2 reference cases, inputs incomplete |

Hospital cut-off % and minimum isolates are stored in the database (`hospitals` table), not here.

## Conventions
- Lower-case codes from `vocabulary.csv` (e.g. `septic_shock`, not "Septic shock").
- Several values in one cell are separated by `;` (e.g. `diabetes;copd`).
- Combination regimens use ` + ` (e.g. `ceftriaxone + azithromycin`). Every drug named must have a row in `drugs.csv`.
- Antibiotics in the last 90 days: `drug:days` (e.g. `cefixime:5`). Allergies: `drug:reaction` (e.g. `penicillin:anaphylaxis`).
- Every regimen and risk rule cites its source in `guideline_ref` (guideline, year, section or recommendation number).
- Every row in `drugs.csv`, `mdr_risk.csv` and `regimens.csv` has a matching row in `provenance.csv`
  (`row_key` = drug name; `risk_factor|organism`; `source|setting|severity|risk_tier`).
- MDR weights may be empty only while `VERSION` ends in `-draft`.

## How a row becomes live
1. Drafted with its `guideline_ref` (by the panel, or by Claude Code on Dr. Solanke's instruction, marked draft).
2. Checked by the advisory group (ID physician, microbiologist, intensivist).
3. `coverage.csv` status → `signed_off`; golden tests updated and passing.
4. `VERSION` changed (e.g. `v0.1-draft` → `v1.0`) in a pull request that Dr. Solanke merges.

`npm run test` checks the tables automatically: correct columns, spellings from the vocabulary,
every regimen drug has a dose row, no gaps in the coverage checklist, and complete golden test cases
once they are marked `signed_off`.

## Golden test cases (`review_status`)
- `inputs_incomplete`: some required inputs still missing; checked for spelling only.
- `ready_for_review`: all inputs filled; waiting for the panel.
- `signed_off`: panel agreed; all required inputs must be filled.

The 50 patients from the MAHACRITICON 2026 feasibility study can be entered here, **without names,
UHID/IP numbers, dates of birth or any other identifier**, with `origin` set to e.g. `study-2026-07`.
