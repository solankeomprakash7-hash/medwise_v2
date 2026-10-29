# DESIGN — how MedWise looks and feels

## Principles
1. **Readable at 3 am on a phone.** Large type, high contrast, big tap targets (44 px).
2. **Soft, molded and inviting ("claymorphism", DECISIONS 2026-10-29).** Inflated rounded forms lit from the
   upper left: a broad grounding shadow, a light inset on the upper-left edge and a darker inset on the
   lower-right. Text stays crisp and flat (no shadow on text). No glass, gradients, glow or sharp edges.
3. **The recommendation is the hero.** Everything else supports it.
4. **Colour carries meaning**, so use it sparingly and consistently.
5. **Motion is short and only on touch:** buttons rise slightly on hover and press down when tapped (180 ms).
   No floating, bouncing or staggered entrances; nothing moves when the phone asks for reduced motion.

## Brand
Tokens live in `app/globals.css` as `--dp-*` variables:

| Token | Use | Value |
| --- | --- | --- |
| `--dp-color-ground` | Page background | `#f1f2fa` |
| `--dp-color-ink` / `-ink-secondary` | Text / small labels and hints | `#383139` / `#48404b` |
| `--dp-color-accent` (pink) | Opening cushion, recommendation card, main action button, "Main" source badge | `#f6a3ca` |
| `--dp-color-surface` (cream) | Trays: form sections, result cards, footer, bottom bars | `#fffdf7` |
| `--dp-color-surface-support` (mint) | Completed sections, key reasons, "matches guideline table", covered | `#c0efdc` |
| `--dp-color-surface-compare` (lavender) | Selected answers (pressed in), AWaRe tag, AI-written interaction box, card icons | `#ded0f9` |
| `--dp-color-surface-warm` (butter) | Notices: DEMO banner, "still to complete", kidney-dose notes, "differs from table" | `#f9e7a8` |
| `--dp-color-surface-cool` (blue) | Coverage "Yes", timeline steps, "+ Add" buttons | `#c5e5fb` |
| `--red` | **Safety alerts only** (allergy, toxicity, out-of-scope, coverage needed but not given) | `#b3123a` |
| `--green` | "Accept", completed progress | `#2f6b3a` |

Radii: trays 70 px (smaller on phones), cushions 38 px, small cushions 25 px, buttons and answers fully round.
Red is reserved for danger. Never use it for branding, buttons or headings in the app.

| Role | Font | Use |
| --- | --- | --- |
| Everything | Instrument Sans | Titles (bold, tight tracking), labels, reasoning, quotes |
| Data | DM Mono | Doses, intervals, CrCl, SOFA, versions |

Reading text 16 px or larger. 15 px for secondary lines and 13 px only for bold uppercase labels and chips.
Doses always in DM Mono so they stand out and align.

Answers: raised cream pills; when chosen they press in, turn lavender and show a recessed dot (single choice)
or a tick (multiple choice). Focus is a solid 3 px ink outline, separate from the shading.
Opening screens (home, new patient): a large pink cushion with the title on the left and a static cluster of
pastel shapes on the right (below the title on phones). The shapes are decoration only.

Motif: hairline rules and the five-segment ruler. Use the ruler for the **narrow → broad spectrum bar**
(ceftriaxone · amikacin · pip-taz · ertapenem · meropenem · colistin), with a marker for the chosen drug.

## Screens
### 1. Patient entry
- **One scrolling page, no "Next" screens**, in five section cards: Patient → Infection → Kidney & liver →
  Resistance risk → Host & allergies. Each card shows its number, then a green tick and "Complete" when done.
- Sticky bottom bar: "n of 5 sections complete" with a small progress bar, and **Get recommendation**.
  If anything is missing, the page scrolls to the first unfinished section and each unfinished section
  lists what it still needs. The page itself is the review: there is no separate review step.
- Tap buttons and chips instead of typing wherever possible; chosen answers press in and turn lavender.
- **Suspected source: one or more.** With two or more ticked, a "Main source" row appears (main marked on its chip).
- While the recommendation is worked out, a "Working it out" screen lists the real steps
  (patient checks → guideline passages → AI → safety checks → doses). It does not animate.
- Out-of-scope stops (age < 18, pregnancy, neutropenia) appear in red directly under the answer.

### 2. Result (cards in this exact order)
*Updated 2026-10-29 with ideas from the first prototype (DECISIONS.md).*
1. **Recommendation** (pink hero cushion): drug(s) in large type, dose line in DM Mono, AWaRe tag
   (Access / Watch / Reserve), a chip "Matches / Differs from guideline table", and a cream
   **"Why this antibiotic"** box: the AI's one-sentence reason plus the key reasons as ticked chips;
   alternatives underneath. Spectrum bar still to design.
2. **How to give it**: dose, interval, infusion (e.g. "3-h extended infusion"), renal adjustment.
3. **Coverage**: a grid of what the regimen covers — gram-positive, gram-negative, Pseudomonas, MRSA, ESBL,
   CRE, anaerobes, atypicals — each yes / limited / no, from `drug_spectrum.csv`.
4. **Spectrum fit**: coverage **needed** for this patient (judged by the AI) vs **given** (from the table)
   vs **excess** (given but not needed). Words only — **no score or percentage** (CLAUDE.md rule 5).
5. **Will it reach the site?**: penetration for the chosen source.
6. **Safety and interactions**: the AI-written interaction notes in a dashed box labelled
   "AI-written — verify before acting", then the knowledge-base interactions and monitoring. Red only for true alerts.

Cards 2–9 fold open and closed (tap the title; a recessed + / − circle shows the state). Open at first: How to give it, Coverage, Safety, and Flags when
any flag is a safety alert. Coverage shows a three-step bar next to the words Yes / Limited / No (no score).
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
