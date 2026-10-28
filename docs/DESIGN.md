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
1. **Recommendation**: drug(s) in large type, dose line in DM Mono, spectrum bar.
2. **How to give it**: dose, interval, infusion (e.g. "3-h extended infusion"), renal adjustment.
3. **Will it reach the site?**: penetration for the chosen source.
4. **Safety**: side effects, interactions, monitoring. Red only for true alerts.
5. **Why this antibiotic**: short reasoning plus the guideline cited.
6. **Flags**: e.g. "Exclude obstruction", "Source control needed", "Review at 48–72 h".
7. **Footer**: knowledge-base version, guideline versions, and the line
   "Decision support only — verify with clinical judgement and local policy."

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
