# DESIGN — how MedWise looks and feels

## Principles
1. **Readable at 3 am on a phone.** High contrast, big tap targets (44 px), near-white text on a dark field.
2. **Dark, precise, calm ("Financial" style, DECISIONS 2026-10-29).** Navy-black page, opaque panels with
   1 px hairline borders, small radii. Orange only for actions and selection; pale gold for doses and key
   numbers. Warm light stays local: behind the framed object at the top and under the closing action.
3. **The recommendation is the hero.** Everything else supports it.
4. **Colour carries meaning**, so use it sparingly and consistently.
5. **Motion only on controls** (160 ms colour and border changes). Nothing moves on scroll or on its own;
   nothing moves at all when the phone asks for reduced motion.

## Website rules (owner, 2026-10-29: never break these)
- No gradient-filled buttons. Buttons are solid orange (primary) or dark with a hairline outline (secondary).
- No reviews, testimonials, fake buttons, fake customer contacts or invented numbers. A control is shown
  only when it works (Accept / Modify / Override appear with login, not before).
- No big hero text: page titles stay modest (about 30 to 42 px).
- No emoji icons. Simple line icons only.
- No em dashes (—) in anything shown on screen. Use a colon, full stop or comma. (An automatic test checks the
  screens. The disclaimer fixed in `CLINICAL_RULES.md` keeps its wording until the owner changes it there.)
- No AI stock photos, AI stock copy, cursor animation or over-the-top scroll animation.
- Wording comes from the docs (`PRODUCT.md`, `CLINICAL_RULES.md`), plain and specific.

## Brand
Tokens live in `app/globals.css` as `--dp-*` variables:

| Token | Use | Value |
| --- | --- | --- |
| `--dp-color-ground` / `-ground-tint` | Page / header, bottom bar, closing field | `#07090e` / `#101522` |
| `--dp-color-panel` | Panels: form sections, result cards | `#10141c` |
| `--dp-color-ink` / `-ink-muted` | Text / paragraphs, labels | `#f4f5f7` / `#c9ced8` |
| `--dp-color-accent` (orange) | Primary buttons, chosen answers, links into the app, icons | `#ff951f` |
| `--dp-color-value` (pale gold) | Doses, step numbers, notices (DEMO banner, kidney-dose notes) | `#edcd8c` |
| `--dp-color-line` | 1 px borders and dividers | `#303139` |
| `--alert` | **Safety alerts only** (allergy, toxicity, out-of-scope, coverage needed but not given) | `#ff6b78` |
| `--done` | Completed sections, "matches guideline table", key reasons | `#7fd6a2` |

Radii: panels 5 px, tags 4 px, buttons and answers 40 px (pills).
Red is reserved for danger. Never use it for branding, buttons or headings in the app.

| Role | Font | Use |
| --- | --- | --- |
| Text | IBM Plex Sans | Titles (medium weight), reading text, buttons |
| Data | IBM Plex Mono | Doses (pale gold, tabular figures), intervals, numbers, small uppercase labels, versions |

Reading text 16 px or larger; 14 to 15 px for secondary lines; 13 px only for uppercase mono labels.
Doses always in the mono font so they stand out and align.

Answers: outlined dark pills; when chosen the edge turns orange with an orange dot (single choice) or tick
(multiple choice). Focus is a 2 px orange outline. Home opens with the promise on the left and a framed panel on
the right (thin offset outlines behind it) listing what every result shows; no sample values in it.

Motif: hairline rules and the five-segment ruler. Use the ruler for the **narrow → broad spectrum bar**
(ceftriaxone · amikacin · pip-taz · ertapenem · meropenem · colistin), with a marker for the chosen drug.

## Screens
### 0. Home (the introduction)
Promise and "Find the right antibiotic" (left), framed "What every result shows" panel (right; below on
phones) → ruled strip of four facts → the problem ("It is not knowledge. It is synthesis."; too narrow / too
broad / MedWise) → how it works (4 connected steps; vertical on phones) → what you get (ruled cells) →
"Before you start" questions → tinted closing with "Start with a new patient" → small grouped footer.
Wording comes from `PRODUCT.md`. No study figures, numbers or testimonials on this page.

### 1. Patient entry
*Redesigned 2026-10-30 (DECISIONS.md): one page, for a phone or Android tablet at night, under 2 minutes. No SOFA score.*
- **One scrolling page, no Back/Next**, in six sections plus a review: Basics → Source & setting → Severity →
  Organs → Exposures → Host → Review. Each section shows its number, then a green tick and "Complete".
  On wide screens (tablet sideways, desktop) a section list stays on the left; tapping a name jumps to it.
- **Review** (last section): everything on one panel, each section with an "Edit" link that jumps back to it.
- Fixed bottom bar: "n of 6 sections complete" with a small progress bar, and **Get recommendation**. If
  anything is missing, the page jumps to the first unfinished section and every unanswered field says
  "Required: please answer" right under it (no popups).
- **Switches** (owner decision 2026-10-30): every yes / no question is a two-position switch (No | Yes, or
  None | Yes) that starts with neither side on, so it is always actively answered. Every tick-list (previous
  MDR, devices, comorbidities, immunocompromise) is a list of on/off switches, "None" first. Questions with
  three or more answers (sex, source, setting, source control, severity, liver, dialysis type) stay as tap
  buttons with an orange edge and dot.
- Numbers open the number keypad, show their unit inside the box (years, kg, cm, mg/dL or µmol/L, mL/min),
  and the keypad's Next key moves to the next box.
- **Finished sections fold** to a one-line summary once the clinician moves on (tap to reopen), so the page
  gets shorter as it is filled in. Folding happens after a tap, never under the finger.
- The creatinine unit (mg/dL or µmol/L) is remembered on the device (a preference, not patient data). "None" answers for exposures, devices, comorbidities, immunocompromise and allergies, so "none" is a
  confirmed answer, never a blank.
- Shown only when relevant: dialysis type only when on dialysis; reaction only for an added allergy; pregnancy
  for every woman aged 18 or over.
- **Kidney function:** serum creatinine (mg/dL or µmol/L) with the Cockcroft-Gault result and its formula, and
  "Use a different CrCl value"; or CrCl / eGFR typed directly (CLINICAL_RULES.md).
- Drug names (recent antibiotics, allergies, antibiotics now): search as you type from the knowledge-base list;
  "Other: keep …" keeps a name that is not listed. An allergy not in the list shows that MedWise cannot check
  it and will advise discussing with ID / microbiology.
- **Septic shock** shows a gold reminder: send cultures and give the first dose without delay, ideally within
  1 hour (SSC 2026 Rec 16, NCDC/ICMR 2025). Not red: it is a reminder, not a safety stop.
- Values: impossible ones must be corrected; unusual ones ask "Yes, this is correct" (CLINICAL_RULES.md table).
- Out-of-scope stops (age < 18, pregnancy, neutropenia) appear in red directly under the answer.
- "Do not enter patient identifiers." at the top; there are no fields where one could be typed.
- Entries are kept only in this browser tab (survive a refresh), and cleared after the result is shown, on
  "Clear form" or "New patient", and after 2 hours.
- "Load test case" buttons (Case 1 and Case 2, placeholder values listed on screen) appear on preview,
  staging and local copies only, never on the live site.
- While the recommendation is worked out, a "Working it out" screen lists the real steps
  (patient checks → guideline passages → AI → safety checks → doses). It does not animate.

### 2. Result (cards in this exact order)
*Updated 2026-10-29 with ideas from the first prototype (DECISIONS.md).*
1. **Recommendation** (framed panel with thin offset outlines and local warm light): regimen name, each drug's
   dose large in pale gold mono, interval, AWaRe tag (Access / Watch / Reserve), a tag
   "Matches / Differs from guideline table", and **"Why this antibiotic"**: the AI's one-sentence reason plus
   the key reasons as ticked lines;
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
**"DEMO: not for patient care"** banner.

**Accept** · **Modify** · **Override**, equally easy to reach, arrive with login (rule 7). Modify and Override
open a short reason form (pick-list plus optional text). Until login exists, a plain note says so: no
placeholder buttons.

### 3. Admin
Simple tables and a few charts: acceptance rate, override reasons, carbapenem and colistin suggestions
per month. Antibiogram upload shows a preview before saving.

## Never
- "Confidence %", "AI-validated", "approved", or star ratings
- Emojis anywhere
- Patient names or IDs on any screen
- Low-contrast text (muted text stays `#c9ced8` or lighter on the dark field)
- Dark patterns that make "Accept" the easiest path: all three buttons are equally easy to reach

## Accessibility
WCAG AA contrast, all controls labelled, usable with the phone's large-text setting, tap targets
at least 44 px.
