# DESIGN — how MedWise looks and feels

## Principles
1. **Readable at 3 am on a phone.** Large type, high contrast, big tap targets (44 px).
2. **Clinical and modern, not flashy.** White cards on cream, a navy header, soft shadows. No gradients,
   glow, or animation beyond simple transitions.
3. **The recommendation is the hero.** Everything else supports it.
4. **Colour carries meaning**, so use it sparingly and consistently.

## Brand
MedWise's editorial identity ("NEJM × The Economist"), adapted for a clinical tool:

| Token | Use | Value |
| --- | --- | --- |
| `--cream` | Page background | `#f9f7f2` |
| `--ink` | Main text | `#1a1a1a` |
| `--navy` | Header, recommendation card, selected answers, main buttons | `#0e1b2f` |
| `--accent` | Brand blue: logo, links, info messages, "covered" | `#005a8d` |
| `--red` | **Safety alerts only** (allergy, toxicity, out-of-scope) | `#c41e3a` |
| `--green` | "Accept", completed sections | `#2f6b3a` |
| `--rule` | Hairline borders and dividers (1 px) | `#d1d5db` |
| `--muted` | Small labels and hints | `#5b6472` |

Palette taken from the first prototype (DECISIONS 2026-10-29). Amber is used only for the DEMO banner.

Red is reserved for danger. Never use it for branding, buttons or headings in the app.

| Role | Font | Use |
| --- | --- | --- |
| Display | Playfair Display | Logo, page titles only |
| Screens | Inter | Forms, labels, buttons, cards |
| Reading | EB Garamond | AI reasoning and quoted guideline passages |
| Data | DM Mono | Doses, intervals, CrCl, SOFA, versions |

Minimum text size 16 px on phones. Doses always in DM Mono so they stand out and align.

Motif: hairline rules and the five-segment ruler. Use the ruler for the **narrow → broad spectrum bar**
(ceftriaxone · amikacin · pip-taz · ertapenem · meropenem · colistin), with a marker for the chosen drug.

## Screens
### 1. Patient entry
- **One scrolling page, no "Next" screens**, in five section cards: Patient → Infection → Kidney & liver →
  Resistance risk → Host & allergies. Each card shows its number, then a green tick and "Complete" when done.
- Sticky bottom bar: "n of 5 sections complete" with a small progress bar, and **Get recommendation**.
  If anything is missing, the page scrolls to the first unfinished section and each unfinished section
  lists what it still needs. The page itself is the review: there is no separate review step.
- Tap buttons and chips instead of typing wherever possible; selected answers turn navy.
- Out-of-scope stops (age < 18, pregnancy, neutropenia) appear in red directly under the answer.

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
