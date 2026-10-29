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
> **Not yet read:** ICMR 2022 and syndrome-specific guidelines. Points from those are marked ⚠.

## 1. The most important finding: neither guideline gives empiric regimens

- **SSC 2026, p751:** "Specific guidance on antibiotic selection is beyond the scope of this guideline."
  It refers readers to IDSA and ESCMID for MDR pathogens.
- **IDSA 2026, p2:** "While empiric treatment suggestions are beyond the scope of this guidance…" Its
  suggestions assume the **pathogen and its susceptibilities are already known**, and they are written for
  the **US** context.

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
| 27 | No routine empiric antifungal therapy | Conditional, low | 751 |
| 28 | No anaerobic cover without anaerobic risk factors (e.g. most lung and urinary sources) | Conditional, very low | 751 |
| 29 | Anaerobic cover **with** risk factors: intra-abdominal, deep gynaecological/obstetric, necrotising soft-tissue infection, head and neck, CNS abscess or empyema | Conditional, very low | 751 |
| **33** | **Prolonged infusion of beta-lactams for maintenance, after an initial loading dose** | **Strong, moderate** | 754 |
| 34 | Therapeutic drug monitoring case by case | Conditional, very low | 755 |
| 36 | De-escalate when the organism and susceptibilities are known | Strong, very low | 755 |
| 39 | Shorter over longer duration, with adequate source control | Conditional, very low | 757 |

**MDR risk factors (rec 25 remark, p749–750):** colonisation with the MDR pathogen of concern, previous
infection with it (**in the prior year**), prolonged use of broad-spectrum antibiotics, and prolonged
hospitalisation in a unit with a high prevalence of that pathogen. SSC lists the MDR pathogens as
*A. baumannii*, ESBL-producing Gram-negatives, CRE, VRE, MDR *Pseudomonas* and MRSA.

**Rec 33 details (p754–755):** prolonged infusion means extended (over at least half the dosing interval) or
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
- **ESBL-E, cUTI (Q1.2, p6):** TMP-SMX, ciprofloxacin or levofloxacin preferred **when susceptible**;
  cefepime-enmetazobactam or a carbapenem preferred when resistance or intolerance precludes them; IV
  fosfomycin, aminoglycosides and piperacillin-tazobactam are alternatives.
- **ESBL-E, outside the urinary tract (Q1.3, p7):** ertapenem, imipenem, meropenem preferred;
  **imipenem or meropenem preferred if critically ill or hypoalbuminaemic**.
- **Piperacillin-tazobactam (Q1.4, p8):** alternative for ESBL-E cUTI **only if not critically ill and no
  bacteraemia**; not suggested outside the urinary tract.
- **Cefepime (Q1.5, p9):** avoid for ESBL-E cUTI or infections outside the urinary tract.
- **AmpC risk organisms (Q2.3, Q2.5, p12–14):** cefepime suggested (MIC ≤8); piperacillin-tazobactam not
  suggested for invasive infection.
- **CRE (Q3.2, Q3.5, Q3.8, p16–21):** depends on the carbapenemase (KPC, NDM, OXA-48). **NDM** (common in
  India): aztreonam-avibactam or cefiderocol preferred; ceftazidime-avibactam + aztreonam if
  aztreonam-avibactam is unavailable. Routine combination therapy not suggested.
- **DTR *P. aeruginosa* (Q4.2, Q4.3, p22–23):** ceftolozane-tazobactam, ceftazidime-avibactam,
  imipenem-relebactam (ceftolozane-tazobactam preferred for pneumonia); cefiderocol alternative.
- **CRAB (Q5.1, p27):** sulbactam-durlobactam with imipenem or meropenem preferred.
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
- `drugs.csv`: 27 drugs from IDSA 2026 Table 1. Dose, interval and infusion only; renal, hepatic,
  interactions, monitoring and site penetration are empty.
- `mdr_risk.csv`: 4 risk factors × 6 organism groups from SSC rec 25 and IDSA p2. **Weights are empty**:
  no source gives them; the panel must set them (or choose design option (b)).
- `regimens.csv` (base regimens) and `mdr_coverage.csv`: **empty**. Base regimens need ICMR 2022 and/or
  syndrome guidelines (section 1). Coverage rules could draw on IDSA 2026 preferred agents, but IDSA is
  written for **confirmed** organisms, so using it for empiric cover is a panel decision.
- `mdr_thresholds.csv`: organisms listed, thresholds empty (no guideline gives numbers).

## 7. Documents still needed
1. **ICMR Treatment Guidelines for Antimicrobial Use in Common Syndromes, 2022**: empiric regimens for India.
2. The syndrome guidelines the panel chooses (section 1), or the hospital's empiric antibiotic policy.
3. A renal and hepatic dosing reference (and IDSA's Supplementary Material, if wanted).
4. A febrile-neutropenia guideline, only to define the out-of-scope group.
5. Guidance for MRSA cover (vancomycin, linezolid) and their dosing.
