# MedWise — read this first

MedWise is a clinical decision-support web app for **empiric antibiotic choice in adult sepsis**.
A clinician enters the patient; MedWise combines that with current guidelines (SSC 2026, IDSA,
Indian/ICMR) and the hospital's own antibiogram, and suggests one empiric regimen with dose,
administration, reasoning and safety notes. **The clinician always makes the final decision.**

## About the owner
- I am Dr. Omprakash Solanke, a medicine resident, **not a programmer**.
- Explain what you are doing in plain language before you do it. No unexplained jargon.
- Work on one feature per session. At the end, tell me in 3–5 bullets what changed and how to test it.
- Ask me before: deleting files, changing the database structure, adding a paid service,
  or changing anything in `CLINICAL_RULES.md`.

## Non-negotiable rules (never break these)
1. **Clinical content comes from the knowledge base, never from the AI.** Drugs, doses, intervals,
   renal adjustments, cut-offs and MDR rules come only from the signed-off tables in `/knowledge`.
2. **The AI chooses only from the rules engine's shortlist** and explains why. If its answer is not
   on the shortlist, show the rules engine's first choice and flag it.
3. **All AI calls happen on the server.** No API keys in browser code, ever.
4. **No identifiable patient data**: no names, UHID/IP numbers, phone numbers, addresses or dates of birth.
5. **No "confidence %", no "validated", no "approved"** wording anywhere in the app.
6. **Every result shows** the knowledge-base version and the guideline versions it used.
7. **Every Accept / Modify / Override is saved**; Modify and Override require a reason.
8. **The golden test set must pass** before anything is deployed to the live site.
9. A user only ever sees data from their own hospital.

## Read these before working on the matching area
| File | Read it when you are working on… |
| --- | --- |
| `docs/PRODUCT.md` | any feature: who it is for, what is in version 1 and what is not |
| `docs/CLINICAL_RULES.md` | the rules engine, AI prompt, result screen, tests |
| `docs/DESIGN.md` | any screen, component or styling |
| `docs/ARCHITECTURE.md` | project structure, database, server code, deployment |
| `docs/DECISIONS.md` | before changing an earlier decision — and add to it after any new one |

## After every session
- Update `docs/ARCHITECTURE.md` if structure changed.
- Add a dated line to `docs/DECISIONS.md` for any decision we made.
