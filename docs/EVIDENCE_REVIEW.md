# EVIDENCE REVIEW — draft notes for the advisory group

> **Status: DRAFT, not signed off.** Background reading for Dr. Solanke and the clinical advisory group.
> It is **not** clinical content of the app. Nothing here changes `CLINICAL_RULES.md`; drafted
> knowledge-base rows are marked draft and traced in `knowledge/provenance.csv`.
>
> **Sources read in full (2026-10-29), from PDFs supplied by Dr. Solanke:**
> - **SSC 2026:** Prescott HC et al. Surviving Sepsis Campaign: International Guidelines for Management of
>   Sepsis and Septic Shock 2026. *Crit Care Med* 2026;54(4) (Infection section, p745–758).
> - **IDSA 2026:** Tamma PD et al. IDSA 2026 Guidance on the Treatment of Antimicrobial-Resistant
>   Gram-Negative Infections. *Clin Infect Dis* 2026, doi:10.1093/cid/ciag481 (current as of 1 Mar 2026;
>   replaces all earlier versions, including 2024).
>
> - **NCDC/ICMR 2025:** National Treatment Guidelines for Antimicrobial Use in Infectious Disease Syndromes,
>   **Version 2.0, November 2025**, NCDC and ICMR, Ministry of Health and Family Welfare (157 pages; printed
>   page numbers cited). This is India's current national empiric guideline and is newer than ICMR 2019/2022.
>
> **Not read:** syndrome-specific international guidelines. Points from web searches are marked ⚠.

## 1. The most important finding: neither guideline gives empiric regimens

- **SSC 2026, p750:** "Specific guidance on antibiotic selection is beyond the scope of this guideline."
  It refers readers to IDSA and ESCMID for MDR pathogens.
- **IDSA 2026, p2:** "While empiric treatment suggestions are beyond the scope of this guidance…" Its
  suggestions assume the **pathogen and its susceptibilities are already known**, and they are written for
  the **US** context.

**NCDC/ICMR 2025 fills this gap:** it gives empiric first-line and alternative regimens with doses, by
syndrome (section 7 below).

**What this means for MedWise:**
- SSC 2026 supplies the **principles**: timing, when to add MDR cover, anaerobic cover, infusion method,
  de-escalation.
- IDSA 2026 supplies **which drugs work against each resistant organism**, and their doses.
- The **empiric regimen for each source × setting × severity** (`regimens.csv`) has to come from other
  documents. Suggested: **ICMR 2022**, plus syndrome guidelines (e.g. ATS/IDSA community-acquired pneumonia,
  ATS/IDSA HAP/VAP, SIS/IDSA intra-abdominal, IDSA skin and soft tissue, IDSA meningitis, IDSA
  catheter-related bloodstream infection, IDSA complicated UTI), or the hospital's own empiric policy.
  **The panel must choose which documents are the sources.**

## 2. SSC 2026 statements MedWise relies on (verified in the full text)

| No. | Statement (shortened) | Strength / certainty | Page |
| --- | --- | --- | --- |
| 16 | Possible, probable or definite **septic shock**: antimicrobials immediately, ideally within 1 h | Strong, very low | 746 |
| 17 | Probable or definite **sepsis without shock**: antimicrobials immediately, ideally within 1 h | Strong, very low | 746 |
| 18 | **Possible** sepsis without shock: rapid investigation; antimicrobials within 3 h if concern persists | Conditional, very low | 746 |
| 24 | Early source control, ideally within 6 h | Conditional, very low | 749 |
| **25** | **High risk of a specific MDR pathogen: include empiric cover for that pathogen** | Conditional, very low | 749 |
| **26** | **Low risk of a specific MDR pathogen: do not cover it empirically** | Conditional, very low | 749 |
| 27 | No routine empiric antifungal therapy | Conditional, low | 750 |
| 28 | No anaerobic cover without anaerobic risk factors (e.g. most lung and urinary sources) | Conditional, very low | 751 |
| 29 | Anaerobic cover **with** risk factors: intra-abdominal, deep gynaecological/obstetric, necrotising soft-tissue infection, head and neck, CNS abscess or empyema | Conditional, very low | 751 |
| **33** | **Prolonged infusion of beta-lactams for maintenance, after an initial loading dose** | **Strong, moderate** | 754 |
| 34 | Therapeutic drug monitoring case by case | Conditional, very low | 754 |
| 36 | De-escalate when the organism and susceptibilities are known | Strong, very low | 755 |
| 39 | Shorter over longer duration, with adequate source control | Conditional, very low | 756 |

**MDR risk factors (rec 25 remark, p749–750):** colonisation with the MDR pathogen of concern, previous
infection with it (**in the prior year**), prolonged use of broad-spectrum antibiotics, and prolonged
hospitalisation in a unit with a high prevalence of that pathogen. SSC lists the MDR pathogens as
*A. baumannii*, ESBL-producing Gram-negatives, CRE, VRE, MDR *Pseudomonas* and MRSA.

**Rec 33 details (p754):** prolonged infusion means extended (over at least half the dosing interval) or
continuous. "Administering a loading dose of the antibiotic before prolonged infusion is crucial."

**Neutropenia:** the SSC 2026 text does **not** address neutropenic patients (the word appears only in the
titles of cited papers).

### Design consequence: MDR risk per organism
Recs 25–26 are written **per pathogen** ("a specific MDR pathogen"). This supports option (b): a base regimen
per source × setting × severity, plus organism-specific additions when that organism's risk is high, rather
than one overall risk tier per patient. **Decided 2026-10-29 by Dr. Solanke: option (b).** `CLINICAL_RULES.md`
now uses base regimens (`regimens.csv`) + per-organism thresholds (`mdr_thresholds.csv`) + coverage rules
(`mdr_coverage.csv`).

### Gaps between the MedWise input form and SSC
- The form asks for prior MDR organisms in the last **90 days**; SSC and IDSA both use **12 months**, and SSC
  counts **colonisation** as well as infection.
- "Prolonged" broad-spectrum antibiotic use is not defined by SSC; the panel must define it.
- "Prolonged hospitalisation in a high-prevalence unit" is not captured; the form asks only "admission in
  90 days yes/no". Unit prevalence could come from the hospital's antibiogram.

## 3. IDSA 2026 points MedWise relies on (verified in the full text)

- **Empiric considerations (p2):** prior microbiology within 12 months; antibiotic exposure in the preceding
  3 months; local epidemiology and cumulative susceptibility data. Common empiric regimens often lack activity
  against CRAB and *S. maltophilia*; covering them should be individualised.
- **Definition (p2):** complicated UTI includes pyelonephritis, **febrile or bacteraemic UTI,
  catheter-associated UTI**, or prostatitis. So urosepsis counts as **cUTI** (Question 1.2), not as
  "infection outside the urinary tract" (Question 1.3).
- **ESBL-E, cUTI (Q1.2, p7):** TMP-SMX, ciprofloxacin or levofloxacin preferred **when susceptible**;
  cefepime-enmetazobactam or a carbapenem preferred when resistance or intolerance precludes them; IV
  fosfomycin, aminoglycosides and piperacillin-tazobactam are alternatives.
- **ESBL-E, outside the urinary tract (Q1.3, p8):** ertapenem, imipenem, meropenem preferred;
  **imipenem or meropenem preferred if critically ill or hypoalbuminaemic**.
- **Piperacillin-tazobactam (Q1.4, p9):** alternative for ESBL-E cUTI **only if not critically ill and no
  bacteraemia**; not suggested outside the urinary tract.
- **Cefepime (Q1.5, p10):** avoid for ESBL-E cUTI or infections outside the urinary tract.
- **AmpC risk organisms (Q2.3, Q2.5, p13–14):** cefepime suggested (MIC ≤8); piperacillin-tazobactam not
  suggested for invasive infection.
- **CRE (Q3.2, Q3.5, Q3.8, p17–22):** depends on the carbapenemase (KPC, NDM, OXA-48). **NDM** (common in
  India): aztreonam-avibactam or cefiderocol preferred; ceftazidime-avibactam + aztreonam if
  aztreonam-avibactam is unavailable. Routine combination therapy not suggested.
- **DTR *P. aeruginosa* (Q4.2, Q4.3, p23–24):** ceftolozane-tazobactam, ceftazidime-avibactam,
  imipenem-relebactam (ceftolozane-tazobactam preferred for pneumonia); cefiderocol alternative.
- **CRAB (Q5.1, p28):** sulbactam-durlobactam with imipenem or meropenem preferred.
- **Doses (Table 1, p3–4):** adult doses for **normal kidney and liver function only**. Kidney adjustments
  are in IDSA's Supplementary Material, which was not supplied. These doses are drafted into
  `knowledge/drugs.csv` with `renal_bands` left empty.
- **Availability:** several agents (e.g. sulbactam-durlobactam, aztreonam-avibactam, cefiderocol,
  plazomicin, eravacycline) may be unavailable or costly in India. The panel should remove those that are
  not on the formulary.

IDSA does **not** cover MRSA, VRE, ceftriaxone, piperacillin-tazobactam dosing, vancomycin, linezolid or
azithromycin. These need other sources.

## 4. Open question: meropenem dose in Case 2 (CrCl 40)

`CLINICAL_RULES.md` Case 2 expects **meropenem 1 g q8h, 3-hour extended infusion**.

- **IDSA 2026 Table 1:** meropenem 1–2 g IV every 8 h over 3 h for infections other than uncomplicated UTI,
  **assuming normal kidney function**. It gives no CrCl 26–50 dose in the main text.
- **SSC 2026 rec 33:** loading dose, then prolonged infusion.
- **Product labels (US and UK)** ⚠ (from web search, not supplied PDFs): CrCl 26–50 → the usual dose
  **every 12 hours**.
- **Extended-infusion protocols** ⚠ (web search): CrCl 26–50 → 1 g over 3 h every 12 h, after a 1 g loading
  dose over 30 min.

**Suggestion for the panel (not a change):** expected answer **meropenem 1 g IV over 30 min (loading dose),
then 1 g over 3 h every 12 h**, unless the panel deliberately keeps q8h (for example because CrCl estimates
are unreliable early in sepsis) and records why. Also confirm meropenem rather than ertapenem: IDSA prefers
meropenem or imipenem for critically ill patients (Q1.3). For cUTI specifically (Q1.2), a carbapenem is
preferred when fluoroquinolone or TMP-SMX resistance is likely; the hospital antibiogram decides this.

**Consequence for the knowledge base:** `drugs.csv` needs a **loading dose** and a defined **renal_bands**
format, and a renal-dosing source must be chosen (product label, a national formulary, or a hospital protocol).

## 5. Open question: neutropenia rule

Neither SSC 2026 nor IDSA 2026 addresses neutropenic sepsis. Febrile neutropenia has its own guidelines
(IDSA 2010 and later; ⚠ not read). ICMR lists febrile neutropenia among the conditions needing empiric
therapy (⚠ web search).

**Suggestion for the panel (not a change):**
1. Keep neutropenic sepsis **out of scope** in version 1.
2. Define it as **ANC < 500/µL, or expected to fall below 500/µL within 48 h** ⚠ (standard IDSA definition,
   from secondary sources), or the hospital's own definition.
3. Replace the "neutropenia" option in the immunocompromise list with a separate required question:
   "ANC < 500/µL or expected to fall below 500 within 48 h? yes / no / not known". **Yes** → out-of-scope
   message. **Not known** → ask for a CBC result or show a warning.
4. Out-of-scope message: "Neutropenic sepsis is outside MedWise version 1. Follow your hospital's
   febrile-neutropenia protocol and discuss with haematology/oncology and ID."

## 6. What is drafted so far (all `v0.1-draft`, traced in `knowledge/provenance.csv`)
- `drugs.csv`: 36 drugs: 27 from IDSA 2026 Table 1, 9 added from NCDC 2025 (e.g. piperacillin-tazobactam,
  cefoperazone-sulbactam, ceftriaxone, azithromycin, doxycycline, teicoplanin, vancomycin, linezolid), and
  colistin / polymyxin B doses from NCDC. Renal, hepatic, interactions, monitoring and site penetration empty.
- `regimens.csv`: **14 base regimens** from NCDC 2025 (lung, urinary and unknown source; see section 7).
- `mdr_coverage.csv`: **9 rules** from NCDC 2025 (Pseudomonas and MRSA for lung; MRSA for unknown source;
  carbapenem-resistant organisms for lung, urinary and unknown source).
- `mdr_risk.csv`: 4 risk factors × 6 organism groups from SSC rec 25 and IDSA p2. **Weights are empty**:
  no source gives them; the panel must set them (or choose design option (b)).
- `mdr_thresholds.csv`: organisms listed, thresholds empty (no guideline gives numbers).

## 7. NCDC/ICMR 2025: what was drafted and what the panel must check

| MedWise source / setting | NCDC section (printed page) | How it was mapped |
| --- | --- | --- |
| Lung, community-acquired (sepsis and shock) | §12.5 CAP, "Inpatient ICU" row (p83) | NCDC splits ward vs ICU, not sepsis vs shock; both mapped to the ICU row. First choice ceftriaxone + azithromycin, **matching Case 1** |
| Lung, hospital-acquired and ventilator-associated | §18.3 HAP/VAP (p107) | The table has only a "VAP" row; applied to HAP too |
| Urinary, community-acquired | §5.2 acute pyelonephritis (p39) | §3.4 says shock with a known source follows the site table |
| Urinary, hospital-acquired | §18.6 CAUTI "severely ill" (p111) | No separate non-catheter hospital UTI row |
| Unknown source, community / hospital | §3.4 sepsis syndrome (p29–30) | Direct |
| Healthcare-associated (all sources) | — | **Not drafted**: NCDC has no healthcare-associated category |

**Conflicts and questions for the panel**
1. **Community-acquired septic shock without a source (§3.4):** NCDC first line is meropenem **+ teicoplanin**
   (routine anti-MRSA cover). SSC 2026 rec 26 suggests **against** MDR cover when that pathogen's risk is low.
2. **Doses differ between NCDC and IDSA:** meropenem (NCDC 1 g q8h, no infusion time; IDSA 1–2 g q8h over 3 h),
   imipenem-cilastatin, IV fosfomycin (NCDC 4 g q6h; IDSA 6 g q8h), teicoplanin (§3.4 vs §12.5). `drugs.csv`
   currently keeps the IDSA row where both exist; every conflict is listed in `provenance.csv`.
3. **Infusion time:** NCDC does not state infusion durations; SSC 2026 rec 33 strongly recommends prolonged
   beta-lactam infusion after a loading dose.
4. **No ESBL-specific empiric rule in NCDC.** So a patient like **Case 2** (high ESBL risk) currently gets
   **no recommendation** ("Discuss with ID / microbiology") until the panel adds an ESBL coverage row
   (IDSA 2026 Q1.2/Q1.3 support a carbapenem; see section 3).
5. **Pseudomonas risk factors for CAP (§12.5):** structural lung disease (e.g. bronchiectasis), healthcare
   exposure or antibiotics in the last 90 days, immunocompromise. These apply to pneumonia only, but
   `mdr_risk.csv` has **no source column**, so they are not drafted yet. Bronchiectasis is not a MedWise input.
6. **MRSA triggers** (necrotising pneumonia, preceding influenza, suspected central-line infection) are not
   MedWise inputs.
7. **Rickettsial cover:** NCDC adds doxycycline for community-acquired sepsis from endemic areas; "endemic
   area" is not a MedWise input.
8. **Carbapenem-resistant organisms (CRO):** NCDC triggers are carbapenem use or a CRO culture in the
   **last 3 months**, and recent BL-BLI exposure (VAP, severe CAUTI). Drafted in `mdr_risk.csv` for `cre` and
   `other`. NCDC prefers polymyxin B over colistin unless the urine is the source.
9. **Beta-lactam allergy alternatives:** NCDC gives none; that column is empty everywhere.
10. **`mdr_coverage.csv` has no "alternative" column:** NCDC's alternatives are kept in its notes. Adding the
    column would be a small change to `CLINICAL_RULES.md`.
11. **Febrile neutropenia:** NCDC §17.1 (p97) gives regimens (stable: piperacillin-tazobactam; unstable:
    meropenem + vancomycin + polymyxin B) but **no ANC definition** (it mentions continuing until ANC > 500).
    Bringing neutropenic sepsis into scope later is possible from this national source; for now it stays out.

## 8. Documents still needed
1. A renal and hepatic dosing reference for `renal_bands` (and IDSA's Supplementary Material, if wanted).
2. Beta-lactam allergy guidance (which alternatives for rash vs anaphylaxis).
3. The hospital's own antibiogram and empiric policy, which NCDC repeatedly says should guide hospital-onset
   infections.
