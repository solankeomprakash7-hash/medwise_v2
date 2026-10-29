# DESIGN — how MedWise looks and feels

## Principles
1. **Readable at 3 am on a phone.** Large type, high contrast, one task per screen.
2. **Calm and clinical, not flashy.** No gradients, glow, or animation beyond simple transitions.
3. **The recommendation is the hero.** Everything else supports it.
4. **Colour carries meaning**, so use it sparingly and consistently.

## Brand
MedWise's editorial identity ("NEJM × The Economist"), adapted for a clinical tool:

| Token | Use | Value |
| --- | --- | --- |
| `--cream` | Page background | *fill exact hex* |
| `--ink` | Main text | *fill exact hex* |
| `--gold` | Brand accent: logo, active step, links | *fill exact hex* |
| `--red` | **Safety alerts only** (allergy, toxicity, out-of-scope) | *fill exact hex* |
| `--green` | "Accept" and success states | choose a muted green |
| `--rule` | Hairline borders and dividers (1 px) | *fill exact hex* |

Red is reserved for danger. Never use it for branding, buttons or headings in the app.

| Role | Font | Use |
| --- | --- | --- |
| Display | Playfair Display | Logo, page titles only |
| Body | EB Garamond, or a clean sans for small UI text if Garamond reads poorly on phones | Reasoning, explanations |
| Data | DM Mono | Doses, intervals, CrCl, SOFA, versions |

Minimum text size 16 px on phones. Doses always in DM Mono so they stand out and align.

Motif: hairline rules and the five-segment ruler. Use the ruler for the **narrow → broad spectrum bar**
(ceftriaxone · amikacin · pip-taz · ertapenem · meropenem · colistin), with a marker for the chosen drug.

## Screens
### 1. Patient entry
- Step-by-step: Basics → Source & severity → Organs → Exposures → Host & allergies → Review.
- Progress bar at the top; Back / Next at the bottom, thumb-reachable.
- Pick-lists and toggles instead of typing wherever possible.
- Review step shows everything on one page before "Get recommendation".

### 2. Result (cards in this exact order)
*Updated 2026-10-29 with ideas from the first prototype (DECISIONS.md).*
1. **Recommendation**: drug(s) in large type, dose line in DM Mono, AWaRe tag (Access / Watch / Reserve),
   spectrum bar.
2. **How to give it**: dose, interval, infusion (e.g. "3-h extended infusion"), renal adjustment.
3. **Coverage**: a grid of what the regimen covers — gram-positive, gram-negative, Pseudomonas, MRSA, ESBL,
   CRE, anaerobes, atypicals — each yes / limited / no, from `drug_spectrum.csv`.
4. **Spectrum fit**: coverage **needed** for this patient (judged by the AI) vs **given** (from the table)
   vs **excess** (given but not needed). Words only — **no score or percentage** (CLAUDE.md rule 5).
5. **Will it reach the site?**: penetration for the chosen source.
6. **Safety**: side effects, interactions, monitoring. Red only for true alerts.
7. **Why this antibiotic**: 3–4 short patient-specific reasons, then the reasoning with each guideline
   passage cited (guideline, page).
8. **Flags**: e.g. "Exclude obstruction", "Source control needed", "Differs from guideline table".
9. **Stewardship and timeline**: actions (e.g. de-escalate, stop, IV → oral, review duration) and the
   review points: now (hour 0–1: cultures, first dose), 24 h, 48–72 h (culture results, de-escalate).
10. **Footer**: knowledge-base version, guideline versions, and the lines
   "Decision support only — verify with clinical judgement and local policy." and
   "Review at 48–72 h with culture results; de-escalate when possible."

Until the knowledge base is signed off and the real AI is connected, the screen shows a clear
**"DEMO — not for patient care"** banner.

Sticky bottom bar: **Accept** (green) · **Modify** · **Override**. Modify and Override open a short
reason form (pick-list plus optional text).

### 3. Admin
Simple tables and a few charts: acceptance rate, override reasons, carbapenem and colistin suggestions
per month. Antibiogram upload shows a preview before saving.

## Never
- "Confidence %", "AI-validated", "approved", or star ratings
- Emojis in clinical screens
- Patient names or IDs on any screen
- Text in light grey on cream (too low contrast)
- Dark patterns that make "Accept" the easiest path: all three buttons are equally easy to reach

## Accessibility
WCAG AA contrast, all controls labelled, usable with the phone's large-text setting, tap targets
at least 44 px.
