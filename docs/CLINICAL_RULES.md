# CLINICAL RULES — how MedWise reasons

> Owner of this file: Dr. Omprakash Solanke with the clinical advisory group.
> **Claude Code must not change clinical content in this file or in `/knowledge` without my explicit
> instruction.** Suggest changes in chat instead.

Current knowledge-base version: **v0.1 (draft, not yet signed off)**
Advisory group sign-off: ☐ ID physician ☐ Microbiologist ☐ Intensivist ☐ Date: ______

## Guidelines used
| Guideline | Version / year | Used for |
| --- | --- | --- |
| Surviving Sepsis Campaign | 2026 | Timing, severity, empiric principles |
| IDSA | *fill in exact documents + years* (e.g. AMR guidance) | MDR organisms, source-specific regimens |
| Indian guideline | *fill in: ICMR Treatment Guidelines for Antimicrobial Use, edition/year* | Indian epidemiology, regimens |
| Local antibiogram | Per hospital, uploaded yearly | Susceptibility cut-offs |

## How a recommendation is made (the order matters)
MedWise is **not a lookup table** (one diagnosis → one drug for every patient). It reasons in layers:

1. **Code** checks inputs: missing fields → ask; pregnancy, age < 18, neutropenic sepsis → out of scope.
2. **Code** builds the evidence pack: patient summary; the guideline passages relevant to this source and
   setting (SSC 2026, IDSA 2026, NCDC/ICMR 2025); the matching knowledge-base rows (base regimen, MDR risk
   factors, coverage rules); the hospital's antibiogram; the allowed drug list; the drug classes excluded
   for allergy.
3. **AI** assesses MDR risk per organism (SSC 2026 rec 25–26: cover a specific MDR pathogen only when its
   risk is high) and chooses one regimen (plus up to two alternatives), explaining why and citing passages
   from the pack.
4. **Code** runs the safety checks (CLAUDE.md rule 2) and adds doses from `drugs.csv`, adjusted for kidney
   and liver function.
5. **Clinician decides**: accept · modify · override.

The knowledge-base tables are the AI's reference material and the safety net: if the AI's regimen differs
from the guideline table for this patient, both are shown and the difference is flagged.

## Input fields
| Group | Field | Type / allowed values | Required |
| --- | --- | --- | --- |
| Basics | Age | years, 18–110 | Yes |
| | Sex | male / female / other | Yes |
| | Weight | kg | Yes |
| Source | Suspected source | lung, urinary, intra-abdominal, CNS, skin/soft tissue, bloodstream/unknown, catheter-related, bone/joint | Yes |
| | Setting | community-acquired / healthcare-associated / hospital-acquired / ventilator-associated | Yes |
| | Source control | not needed / needed, done / needed, not yet done | Yes |
| Severity | Category | sepsis / septic shock | Yes |
| | SOFA score | 0–24 | Yes |
| Organs | Creatinine clearance or eGFR | mL/min; on dialysis yes/no (type) | Yes |
| | Hepatic function | normal / mild / moderate / severe (Child-Pugh if cirrhotic) | Yes |
| Exposures (90 days) | Antibiotics received | list of drugs + approx. days | Yes (can be "none") |
| | Hospital admission | yes / no | Yes |
| | Prior MDR organism | none / ESBL / CRE / MRSA / Pseudomonas / VRE / other | Yes |
| | Devices | urinary catheter, central line, ventilator, drains, other | Yes (can be "none") |
| Host | Comorbidities | diabetes, COPD, CKD, cirrhosis, malignancy, other | Yes (can be "none") |
| | Immunocompromise | neutropenia, transplant, steroids, chemo, HIV, other | Yes (can be "none") |
| | Allergies | drug + reaction type (rash / anaphylaxis / other) | Yes (can be "none") |
| Current | Current antibiotics | list | No |
| | Pregnancy | not applicable / no / yes → **stop: out of scope** | Yes for females |

## Knowledge-base tables (live in `/knowledge`, CSV, versioned)
| Table | Columns |
| --- | --- |
| `mdr_risk.csv` | risk_factor, organism, weight, rule_text, guideline_ref |
| `mdr_thresholds.csv` | organism, high_risk_threshold, basis |
| `regimens.csv` | source, setting, severity, first_choice, alternative, beta_lactam_allergy_alt, guideline_ref — **base regimen, no high MDR risk** |
| `mdr_coverage.csv` | organisms (the exact set of high-risk organisms, `;`-separated), source (or `any`), severity (or `any`), action (`add` / `replace`), regimen, beta_lactam_allergy_alt, guideline_ref, notes |
| `drug_classes.csv` | drug, class, beta_lactam (yes/no), source — includes common drugs patients are allergic to that MedWise does not prescribe |
| `drugs.csv` | drug, standard_dose, interval, infusion, max_dose, renal_bands, hepatic_adjustment, interactions, monitoring, site_penetration_notes |
| `antibiogram_template.csv` | year, unit (ICU/ward), organism, antibiotic, isolates_n, percent_susceptible |
| `settings.csv` (per hospital) | empiric_cutoff_percent (default set by stewardship committee), min_isolates |
| `golden_tests.csv` | case_id, all inputs…, expected_regimen, acceptable_alternatives, notes |

## Safety rules for the code
- If any required field is missing → do not recommend; ask for it.
- If the AI's answer fails any check (drug not in `drugs.csv`, allergy conflict, citation not found word
  for word in the evidence library, invalid format, no answer) → no recommendation; show
  "Discuss with ID / microbiology".
- If no regimen survives the filters (e.g. pan-resistance, multiple allergies) → no recommendation;
  show "Discuss with ID / microbiology".
- If the AI's regimen differs from the guideline table's regimen (base regimen + matching `mdr_coverage.csv`
  rows) → show both and flag "Differs from guideline table".
- Allergy to a drug or a class (any reaction) → exclude every drug in that class (`drug_classes.csv`).
  *Draft: stricter than anaphylaxis-only; panel to confirm the rule for rash / other reactions.*
- Anaphylaxis to a beta-lactam → also flag cross-reactivity for any other beta-lactam in the regimen.
- Allergen not found in `drug_classes.csv` (as a drug or a class) → no recommendation; it cannot be checked.
- Pregnancy, age < 18, neutropenic fever → out of scope message, no recommendation.
- Always show: "Decision support only — verify with clinical judgement and local policy."
- Always add: "Review at 48–72 h with culture results; de-escalate when possible."

## Reference cases (must be in the golden test set)
**Case 1:** 62 M, community pneumonia, diabetes + COPD, sepsis without shock, no antibiotics or
admission in 90 days, no prior Pseudomonas/MRSA, eGFR 80.
→ Expected: **ceftriaxone + azithromycin** (atypical cover). COPD alone is not a reason for
anti-pseudomonal cover. Broaden only if shock or Pseudomonas risk.

**Case 2:** 65 M, urosepsis, SOFA 4, CrCl 40, indwelling catheter, recent admission, cefixime 5 days.
→ Expected: **meropenem 1 g q8h, 3-hour extended infusion** (high ESBL risk). Avoid aminoglycoside
(CrCl 40). Flag: exclude obstruction / change catheter.

## The AI's instructions (system prompt outline)
- You are advising a qualified clinician. Reason from the evidence pack only.
- Name drugs only from the allowed list. Never write doses; the app adds them from `drugs.csv`.
- Cite every claim with a passage ID from the pack. When guidelines conflict, say so and explain your choice.
- Return JSON only: `regimen`, `alternatives` (up to two), `mdr_assessment` (per organism: high / low, with
  reason), `reasoning` (≤ 150 words), `citations` (passage IDs), `flags`.

## Golden tests with the AI
Each golden test patient is run **3 times**; every run must give the expected regimen or an acceptable
alternative, and pass all safety checks.
