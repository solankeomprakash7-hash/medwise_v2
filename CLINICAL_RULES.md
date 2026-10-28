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

1. **Patient**: source, severity, organ function, exposures.
2. **Risk**: likely organisms and chance of resistance (MDR risk tier per organism).
3. **Evidence**: guideline regimen for this source × severity × risk tier, filtered by the local
   antibiogram cut-offs and by allergies.
4. **Pharmacology**: dose, interval, infusion strategy, renal/hepatic adjustment, site penetration.
5. **Safety**: side effects, interactions, monitoring.
6. **Clinician decides**: accept · modify · override.

Steps 1–5 except the final choice and the written reasoning are done by the **rules engine** (fixed code,
no AI). The **AI layer** receives the patient summary and the shortlist, chooses from it, and explains.

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
| `regimens.csv` | source, setting, severity, risk_tier, first_choice, alternative, beta_lactam_allergy_alt, guideline_ref |
| `drugs.csv` | drug, standard_dose, interval, infusion, max_dose, renal_bands, hepatic_adjustment, interactions, monitoring, site_penetration_notes |
| `antibiogram_template.csv` | year, unit (ICU/ward), organism, antibiotic, isolates_n, percent_susceptible |
| `settings.csv` (per hospital) | empiric_cutoff_percent (default set by stewardship committee), min_isolates |
| `golden_tests.csv` | case_id, all inputs…, expected_regimen, acceptable_alternatives, notes |

## Safety rules for the code
- If any required field is missing → do not recommend; ask for it.
- If the AI's choice is not on the shortlist → show rules' first choice + "AI output rejected" flag.
- If no regimen survives the filters (e.g. pan-resistance, multiple allergies) → no recommendation;
  show "Discuss with ID / microbiology".
- Anaphylaxis to a class → exclude the whole class and flag cross-reactivity.
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
- You are explaining a choice for a qualified clinician. You may only choose from the shortlist provided.
- Return JSON only: `choice_id`, `reasoning` (≤ 120 words), `guideline_refs`, `flags`.
- Never invent doses, drugs or guideline statements. Doses are added by the app from `drugs.csv`.
