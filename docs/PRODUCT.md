# PRODUCT — what MedWise is and is not

## The problem
Every septic patient gets an empiric antibiotic before the organism is known. That one decision must
weigh source, severity, haemodynamics, kidneys and liver, allergies, prior antibiotics, MDR risk and
the local antibiogram, often at 3 am. Guidelines are written for populations; adapting them to one
patient in real time is where variability creeps in. Too narrow risks treatment failure; too broad
drives resistance, C. difficile, toxicity and cost.

**The problem is not knowledge, it is synthesis.** MedWise does that synthesis in about two minutes.

## Evidence so far
Retrospective, single-centre feasibility study, 50 adult ICU patients (Sepsis-3), presented at
MAHACRITICON 2026:
- Suggestion matched the clinician's chosen coverage in 44/50 (88%, 95% CI 76–94%).
- 18/18 culture-confirmed MDR cases flagged high-risk at admission.
- A narrower agent would have sufficed in 14/50 (28%).
- Projected culture-matched adequacy: 38/50 initial regimen → +9 with MedWise; 3 covered by neither.
Limitations: retrospective, small, adequacy gain projected. Prospective validation is the next step.
*Never present these figures in the app as proof of safety or accuracy.*

## Users
| User | What they do |
| --- | --- |
| **Clinician** (resident, intensivist, physician) | Enters a patient, reads the recommendation, accepts / modifies / overrides with a reason |
| **Stewardship admin** (microbiologist, ID physician, stewardship pharmacist) | Uploads the yearly antibiogram, sets cut-offs, reviews cases and monthly reports |
| **MedWise owner** (me) | Uploads knowledge-base versions, manages hospitals and users |

## Version 1 — in scope
1. Login; each user belongs to one hospital with one role.
2. Step-by-step patient entry (see `CLINICAL_RULES.md` for fields), usable on a phone.
3. Result screen, in this order:
   1. The recommendation (drug + dose)
   2. How to give it (dose, interval, infusion, renal adjustment)
   3. Will it reach the site? (site penetration)
   4. Safety (side effects, interactions, monitoring)
   5. Why this antibiotic (reasoning + guideline cited)
   6. Flags (e.g. "exclude obstruction", "source control needed")
   7. Versions used
4. Accept / Modify / Override, with a required reason for Modify and Override.
5. Admin: antibiogram upload, case list, acceptance and override rates, carbapenem and colistin
   recommendations per month, export to Excel.
6. Owner admin: upload knowledge-base versions, add hospitals and users.

## Not in version 1 (do not build unless I say so)
- Paediatric, obstetric or neonatal patients
- Definitive / culture-directed therapy (beyond a reminder to review at 48–72 h)
- Antifungal and antiviral therapy
- Direct connection to hospital HIS/EMR or lab systems
- Prescribing or ordering: MedWise suggests, it never orders
- Patient-facing anything
- Mobile app store versions (the website must work well on phones instead)

## How we will measure success
Concordance with expert panel, time to appropriate antibiotic, carbapenem/colistin days,
de-escalation by 72 h, override rate and reasons; later mortality and length of stay.

## Business model (for context)
Annual subscription per hospital ICU, localised to that hospital's antibiogram, with a monthly
stewardship report. A free 3-month silent-mode pilot comes first. A simpler reference-only version
for residents and students may come later.
