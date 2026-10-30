# ARCHITECTURE — how MedWise is built

> Claude Code: keep this file up to date whenever structure changes. Explain changes to me in plain words.

## In one picture
```
Clinician (phone/desktop) ──► MedWise server (Vercel) ──► Result screen ──► Accept / Modify / Override
                                │                                                │
                                ├─ 1. Input checks + evidence pack (code)        │
                                ├─ 2. AI layer (Claude API) — decides + explains │
                                └─ 3. Safety checks + doses (code)               │
                                │                                                ▼
                                └──── reads ◄── Database (Supabase, India region) ◄── saves decision
                                             knowledge base · antibiograms · cases · decisions
Stewardship admin ──► uploads antibiogram, views reports
```

## Tools
| Part | Tool | Why |
| --- | --- | --- |
| Website + server | Next.js (TypeScript) | One project for screens and server code |
| Styling | Tailwind CSS with tokens from `DESIGN.md` | Consistent look |
| Login, database, file storage | Supabase (India region) | Simple, secure, row-level security |
| AI | Claude API (paid, server-side only) | Paid usage is not used for model training |
| Hosting | Vercel: `staging` and `production` | Test before going live |
| Code history | GitHub | Every change is recorded |

## Folder layout
Created 2026-10-28 (Phase 2, step 1). Folders marked *empty* hold only a README for now.
```
/public/brand        the MedWise logo files (original and light version for the dark pages)
/app                 screens: home page (Sculpture.tsx = logo components; icon.svg, favicon.ico, apple-icon.png = tab and home-screen icons); /new = patient entry (one page: six sections + review; fields, checks and Cockcroft-Gault in app/new/form.ts) and result screen (app/new/ResultView.tsx, 10 cards per DESIGN.md), via the server action app/new/actions.ts; admin and login still to come
/app/api             server routes (recommend, decision, upload) — empty
/lib/ai              AI answer format (answer.ts), instructions (prompt.ts), AI client interface + test stand-in (client.ts), DEMO stand-in used by the screen (demo.ts), real AI clients: gemini.ts (Google Gemini, used when GEMINI_API_KEY is set; owner decision 2026-10-30) and claude.ts (Claude Opus 5.5, used when only ANTHROPIC_API_KEY is set); otherwise demo.ts
/lib/recommend       the recommendation: input checks, allergy checks (allergy.ts), coverage and spectrum fit (spectrum.ts), review timeline (timeline.ts), evidence pack, safety checks, doses, guideline-table comparison (recommend.ts)
/lib/knowledge       reads the knowledge-base tables and checks them for mistakes
/knowledge           CSV tables + VERSION + vocabulary + coverage checklist + provenance (see knowledge/README.md); draft rows only
/tests               golden test set runner (placeholder) + banned-wording check
/docs                PRODUCT, CLINICAL_RULES, DESIGN, ARCHITECTURE, DECISIONS, EVIDENCE_REVIEW (draft)
/supabase/migrations database structure, as SQL files applied in date order
/tests/db            database privacy and audit checks
/scripts             helper scripts (test-db.sh, verify-evidence.mjs, verify-aware.py)
/.github/workflows   automatic checks on every push
.env.example         names of the secret settings, no values
CLAUDE.md
medwise-project-docs.zip   original docs bundle, kept for reference
```

## Everyday commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site on your computer |
| `npm run check` | Style check + type check + tests (incl. golden set, knowledge-base checks and banned-wording check) |
| `npm run build` | Builds the site as Vercel would |
| `npm run verify:evidence -- ssc2026=<pdf> idsa2026=<pdf> ncdc2025=<pdf>` | Checks every evidence-library passage word for word against the guideline PDFs (needs `pdftotext`) |
| `python3 scripts/verify-aware.py <who-aware2023.xlsx>` | Checks every AWaRe group in `drug_spectrum.csv` against the cited row of the WHO spreadsheet (needs Python with openpyxl) |
| `npm run test:db` | Checks the database privacy and audit rules on an empty test database (needs `DATABASE_URL`) |

GitHub runs `npm run check`, `npm run build` and the database checks automatically on every push (`.github/workflows/checks.yml`).
Versions: Node 22, Next.js 16, React 19, Tailwind 4, Vitest 5.

## Recommendation flow
1. Browser sends the form inputs to `/api/recommend`. **No identifiers** are sent.
2. Server validates inputs; missing required field → error; out-of-scope patient → stop (no AI call).
3. **Evidence pack** (code): patient summary, relevant guideline passages from the evidence library,
   matching knowledge-base rows, this hospital's antibiogram, allowed drug list, allergy-excluded classes.
4. **AI layer** decides → JSON (`regimen`, `alternatives`, `mdr_assessment`, `reasoning`, `citations`, `flags`).
5. **Safety checks** (code): drugs in `drugs.csv`, no allergy conflict, citations found word for word,
   valid JSON. Any failure → no recommendation, "Discuss with ID / microbiology". Differs from the
   guideline table → show both + flag.
6. Server adds doses from `drugs.csv` (kidney/liver adjusted), versions, disclaimers → sends result.
7. Case (de-identified) + result saved. Clinician's decision saved via `/api/decision`.

## Database tables
Defined in `supabase/migrations/20261029000000_initial_schema.sql` (approved 2026-10-29).

| Table | Holds |
| --- | --- |
| `hospitals` | name; stewardship settings `empiric_cutoff_percent`, `min_isolates` (empty until the committee decides) |
| `profiles` | one row per login: hospital, role (clinician / admin / owner). Email lives in Supabase's own login table |
| `antibiograms` | hospital, year, unit (ICU / ward), rows; every upload kept, newest used |
| `cases` | hospital, user, inputs (no identifiers), result, kb_version, guideline_versions, antibiogram used, AI model + raw AI answer |
| `decisions` | case, user, action (accept / modify / override), final regimen, reason (pick-list + optional text) |

No `kb_versions` table: the knowledge base lives as files on GitHub, so its history is GitHub's history;
each case stores the `kb_version` it used.

Privacy and audit rules, enforced by the database itself (row-level security):
- Clinicians and admins see only their own hospital. **The owner sees all hospitals** (decision 2026-10-29).
- Only the owner adds or changes users and hospitals. A hospital's admin can change only its cut-off settings
  and upload its antibiograms.
- Cases and decisions can be added but **never edited or deleted** by anyone using the app.
- Modify / Override are refused without a reason and the regimen actually chosen.
- Logged-out visitors can read nothing.

### Where each migration has been applied
| Migration | Staging Supabase | Production Supabase |
| --- | --- | --- |
| `20261029000000_initial_schema.sql` | applied 2026-10-29; owner profile created | not yet (after login is tested on staging) |

### Changing the database
1. Write a new dated SQL file in `supabase/migrations/`; never edit one that is already applied.
2. Add checks to `tests/db/rls.test.sql`; `npm run test:db` must pass.
3. Dr. Solanke approves (CLAUDE.md), then it is applied to **staging** Supabase first, then **production**.

## Secrets
API keys only in Vercel and Supabase environment settings. Never in code, never in the browser,
never in GitHub.

`GEMINI_API_KEY` (Vercel, server only) switches on the real AI with Google Gemini; `GEMINI_MODEL` can pin an exact
model (default `gemini-pro-latest`, which follows Google's current Pro model; the version that answered is recorded).
If only `ANTHROPIC_API_KEY` is set, Claude is used instead. Without it the app uses the DEMO stand-in
and costs nothing. Patient details sent to the AI contain no identifiers (rule 4). The recommendation may
take up to a minute, so `/new` allows up to 5 minutes per request (`maxDuration`).

## Live addresses (Vercel)
| Site | Branch | Address |
| --- | --- | --- |
| Production | `main` | https://medwisev2.vercel.app |
| Staging (test) | `staging` | https://medwisev2-git-staging-med-wise.vercel.app |

Vercel also makes a one-off address for every build; those are not needed day to day.

## Release rule
`staging` first → run golden tests → I check on my phone → then `production`.

### Before the public launch (owner rule, 2026-10-29)
MedWise does not launch until every box is ticked:
- [ ] Custom domain connected (Vercel → Settings → Domains), not a `vercel.app` address
- [x] Favicon: the MedWise logo mark (`app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`), replacing the Next.js default
- [ ] No "made with AI" tag or builder badge anywhere (checked 2026-10-29: none in the app's code; check the live
      site again at launch)
- [ ] Privacy policy page (needs the owner's details: who is responsible for the data, contact, hosting regions)
- [ ] Terms and conditions page (needs the owner's wording and legal review)
- [ ] Golden test set passes (CLAUDE.md rule 8) and the knowledge base is signed off
