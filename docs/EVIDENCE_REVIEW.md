# EVIDENCE REVIEW — draft notes for the advisory group

> **Status: DRAFT, not signed off.** This file is background reading for Dr. Solanke and the clinical
> advisory group. It is **not** clinical content of the app. Nothing here changes `CLINICAL_RULES.md`
> or `/knowledge`; any change there needs Dr. Solanke's explicit instruction.
>
> **How this was researched (2026-10-29):** web searches only. The cloud session could not open the
> journal sites (Springer, OUP, LWW, Healio were blocked), so most points below come from abstracts,
> executive-summary tables and secondary summaries. **Every point must be checked against the full
> guideline text before it goes into a signed-off table.** Items marked ⚠ were not confirmed in a primary
> source.

## 1. Which guideline versions to use

| Guideline | Current version found | Citation (to verify) | Suggested action |
| --- | --- | --- | --- |
| Surviving Sepsis Campaign (adult) | **2026**, published 23 Mar 2026 | *Critical Care Medicine* 2026 (executive summary, Apr 2026 issue) and *Intensive Care Medicine* 2026, doi:10.1007/s00134-026-08361-1 | Use as planned |
| IDSA AMR gram-negative guidance | **2026**, published Aug 2026 — **replaces the 2024 version** | *Clinical Infectious Diseases* 2026, doi:10.1093/cid/ciag481 | Use **2026**, not 2024 |
| ICMR Treatment Guidelines for Antimicrobial Use in Common Syndromes | **2022** edition (after 2017 1st and 2019 2nd editions); online chapters at amrtg.icmr.org.in | ICMR, New Delhi, 2022 | Confirm 2022 is the latest; obtain the PDF |
| Febrile neutropenia (for scope only) | IDSA 2010 (Freifeld et al., *CID* 2011); ASCO/IDSA outpatient update 2018 | — | Use only to **define** the out-of-scope group |

### Points from SSC 2026 relevant to MedWise
- Antimicrobials within about **1 hour** for septic shock and for probable/definite sepsis without shock.
  Possible sepsis without shock: rapid assessment, antimicrobials within **3 hours** if concern persists.
- **Empiric MDR cover only when the risk of that specific MDR organism is high**; suggested *against* when
  risk is low. This supports MedWise's per-organism MDR-risk tiers.
- No empiric anaerobic cover when anaerobic risk is low (e.g. most CAP and UTI). No routine empiric antifungals.
- **Beta-lactams: a loading dose, then prolonged infusion for maintenance** (strong recommendation,
  moderate certainty; upgraded from 2021). ⚠ Exact recommendation number and wording to be confirmed.
- De-escalate once the organism and susceptibilities are known.
- ⚠ Whether SSC 2026 excludes or addresses neutropenic patients was **not** confirmed.

### Points from IDSA 2026 relevant to MedWise (⚠ secondary summaries only)
- Covers ESBL-E, AmpC-E, CRE, DTR *P. aeruginosa*, CRAB and *S. maltophilia*.
- **Carbapenems remain preferred for invasive ESBL-E infections outside the urinary tract.**
  This is relevant to Case 2 (meropenem for high-ESBL-risk urosepsis), but the panel should decide
  whether urosepsis with suspected bacteraemia counts as "outside the urinary tract".
- Changed from 2024: piperacillin-tazobactam moved from "suggest against" to an **alternative** for
  ESBL-E **urinary** infections; pivmecillinam added for ESBL-E cystitis; newer agents preferred for invasive
  CRAB (sulbactam-durlobactam + a carbapenem), invasive *S. maltophilia*, and DTR *P. aeruginosa* pneumonia.
- Uses expert consensus, not GRADE; IDSA plans updates every 1–2 years, so MedWise must track versions.
- Note: the IDSA guidance is mostly about **known** resistant organisms. Its empiric advice is limited,
  so the empiric decision rules will lean more on SSC 2026, ICMR and the local antibiogram.

### Points from ICMR relevant to MedWise
- Empiric antibiotics are restricted to a short list of conditions; **severe sepsis/septic shock and
  febrile neutropenia** are both on it.
- Cultures from all likely sites **before** the first dose.
- De-escalation is described as safe, **including in febrile neutropenia and septic shock**.
- ⚠ The 2022 regimen and dosing tables were not retrieved.

## 2. Open question: meropenem dose in Case 2 (CrCl 40)

`CLINICAL_RULES.md` Case 2 expects **meropenem 1 g q8h, 3-hour extended infusion** with CrCl 40.

What the sources say:
- **Product labels (US and UK):** dose adjustment needed at CrCl ≤ 50 (UK: < 51). For **CrCl 26–50 the usual
  dose is given every 12 hours**; CrCl 10–25: half dose q12h; CrCl < 10: half dose q24h.
- **Extended-infusion protocols** (e.g. Stanford 2026, GlobalRPh summary): normal renal function 1 g over
  3 h q8h; **CrCl 26–50: 1 g over 3 h q12h**; below 26, many protocols switch to a short infusion. ⚠ One trial
  protocol used 500 mg over 3 h q12h for CrCl < 50, so sources differ.
- **Loading dose:** extended-infusion protocols start with **1 g over 30 minutes** before the first 3-hour
  infusion. SSC 2026 also says "loading dose, then prolonged infusion". In general practice the **first dose
  is not reduced for kidney function**; only maintenance is. ⚠ Not confirmed in a primary source for meropenem.

**Suggestion for the panel (not a change):** Case 2's expected answer probably needs to be
**meropenem 1 g IV over 30 min now (loading dose), then 1 g over 3 h every 12 h (CrCl 26–50)**, unless the
panel deliberately wants q8h (for example because sepsis-related augmented clearance or fluid shifts
make the CrCl estimate unreliable in the first 24–48 h). Either way, the decision should be written down,
because the golden test will check the exact dose.

**Consequence for the knowledge base:** `drugs.csv` as planned has no **loading dose** column and no
rule for "first dose unadjusted, maintenance adjusted". Suggest adding `loading_dose` and
`loading_infusion`, and defining the format of `renal_bands` (for example
`>50: 1 g q8h EI 3h; 26-50: 1 g q12h EI 3h; 10-25: 500 mg q12h; <10: 500 mg q24h; HD: after dialysis`).

## 3. Open question: neutropenia rule

Problem: `CLINICAL_RULES.md` says "neutropenic fever → out of scope", but the input form offers
"neutropenia" as a normal immunocompromise option, with no definition.

What the sources say:
- Standard definition (IDSA): **fever** (single oral temperature ≥ 38.3 °C, or ≥ 38.0 °C sustained over 1 h)
  **plus ANC < 500/µL, or expected to fall below 500/µL within 48 h**. Some institutions use ANC < 1000.
- Neutropenic sepsis has a **different empiric algorithm**: an anti-pseudomonal beta-lactam
  (cefepime, piperacillin-tazobactam or a carbapenem) for everyone, with vancomycin only for specific
  indications. MedWise's MDR-risk-tier logic was not designed or tested for this group, and the
  50-patient study was not in neutropenic patients.

**Suggestion for the panel (not a change):**
1. Keep neutropenic sepsis **out of scope** in version 1.
2. Define it as **ANC < 500/µL, or expected to fall below 500/µL within 48 h** (or the hospital's own
   definition, if different).
3. Replace the "neutropenia" option in the immunocompromise list with a **separate required question**:
   "ANC < 500/µL or expected to fall below 500 within 48 h? yes / no / not known". **Yes** → out-of-scope
   message, no recommendation. **Not known** → ask for a CBC result before recommending, or show a warning.
4. Out-of-scope message: "Neutropenic sepsis is outside MedWise version 1. Follow your hospital's
   febrile-neutropenia protocol and discuss with haematology/oncology and ID."

## 4. What MedWise still needs from the full texts
- Exact SSC 2026 recommendation numbers and wording, for the `guideline_ref` columns.
- IDSA 2026 empiric-therapy statements and preferred/alternative tables (ESBL-E, AmpC-E, CRE, DTR-PA).
- ICMR 2022 sepsis and source-specific empiric regimens, and their dosing tables.
- A dosing reference for `drugs.csv`, chosen by the panel (product label, BNF/Sanford, or a hospital protocol).

## Sources
- SSC 2026 (adult): https://link.springer.com/article/10.1007/s00134-026-08361-1 ·
  executive summary https://journals.lww.com/ccmjournal/fulltext/2026/04000/executive_summary__surviving_sepsis_campaign_.4.aspx ·
  SCCM page https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026
- IDSA 2026 AMR guidance: https://academic.oup.com/cid/advance-article/doi/10.1093/cid/ciag481/8756906 ·
  summaries: https://www.acpjournals.org/doi/10.7326/acph-20260819-idsa-offers-updated-guidance-on-resistant-gram ·
  https://www.healio.com/news/infectious-disease/20260826/idsa-updates-guidance-on-resistant-gramnegative-infections ·
  https://clinician.nejm.org/managing-resistant-gram-negative-infections-updated-idsa-guidance-CLINgwNA60460
- ICMR: https://www.icmr.gov.in/guidelines · 2019 edition https://www.icmr.gov.in/icmrobject/custom_data/pdf/resource-guidelines/Treatment_Guidelines_2019_Final.pdf ·
  online chapters https://amrtg.icmr.org.in/chapter3-antimicrobial-therapy.html
- Meropenem label: https://labeling.pfizer.com/ShowLabeling.aspx?id=18351 · UK SmPC https://www.medicines.org.uk/emc/product/10204/smpc/print ·
  extended-infusion protocol https://med.stanford.edu/content/dam/sm/bugsanddrugs/documents/antimicrobial-dosing-protocols/SHC-Extended-Infusion-Beta-lactams.pdf
- Febrile neutropenia definition: IDSA 2010 guideline (Freifeld et al., *Clin Infect Dis* 2011;52:e56–93) — secondary summaries only checked.
