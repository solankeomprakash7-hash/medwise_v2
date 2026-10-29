# ARCHITECTURE — how MedWise is built

> Claude Code: keep this file up to date whenever structure changes. Explain changes to me in plain words.

## In one picture
```
Clinician (phone/desktop) ──► MedWise server (Vercel) ──► Result screen ──► Accept / Modify / Override
                                │                                                │
                                ├─ 1. Rules engine (no AI)                       │
                                ├─ 2. AI layer (Claude API) — picks + explains   │
                                └─ 3. Safety check                               │
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
/app                 screens (entry, result, admin, login) — placeholder home page only
/app/api             server routes (recommend, decision, upload) — empty
/lib/rules           rules engine: mdr-risk, regimen-filter, dosing, safety — empty
/lib/ai              Claude call, prompt, JSON checking — empty
/knowledge           signed-off CSV tables + VERSION file — empty
/tests               golden test set runner (placeholder) + banned-wording check
/docs                PRODUCT, CLINICAL_RULES, DESIGN, ARCHITECTURE, DECISIONS
/.github/workflows   automatic checks on every push
.env.example         names of the secret settings, no values
CLAUDE.md
medwise-project-docs.zip   original docs bundle, kept for reference
```

## Everyday commands
| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site on your computer |
| `npm run check` | Style check + type check + tests (incl. golden set and banned-wording check) |
| `npm run build` | Builds the site as Vercel would |

GitHub runs `npm run check` and `npm run build` automatically on every push (`.github/workflows/checks.yml`).
Versions: Node 22, Next.js 16, React 19, Tailwind 4, Vitest 5.

## Recommendation flow
1. Browser sends the form inputs to `/api/recommend`. **No identifiers** are sent.
2. Server validates inputs; missing required field → error.
3. **Rules engine** reads the knowledge base + this hospital's antibiogram and returns:
   MDR tier per organism, shortlist of allowed regimens, renal-adjusted doses, flags.
4. **AI layer** gets a patient summary + shortlist → returns JSON (`choice_id`, reasoning, refs, flags).
5. **Safety check**: choice on shortlist? JSON valid? If not, use rules' first choice + flag.
6. Server adds doses from `drugs.csv`, versions, disclaimers → sends result.
7. Case (de-identified) + result saved. Clinician's decision saved via `/api/decision`.

## Database tables (planned)
| Table | Holds |
| --- | --- |
| `hospitals` | name, settings (cut-off %, min isolates) |
| `users` | email, hospital_id, role (clinician / admin / owner) |
| `kb_versions` | version, uploaded_at, signed_off_by, files |
| `antibiograms` | hospital_id, year, unit, rows |
| `cases` | hospital_id, user_id, inputs (no identifiers), result, kb_version, model, created_at |
| `decisions` | case_id, action (accept / modify / override), final_regimen, reason, created_at |

Row-level security: users can only read and write rows of their own hospital.

## Secrets
API keys only in Vercel and Supabase environment settings. Never in code, never in the browser,
never in GitHub.

## Live addresses (Vercel)
| Site | Branch | Address |
| --- | --- | --- |
| Production | `main` | https://medwisev2.vercel.app |
| Staging (test) | `staging` | https://medwisev2-git-staging-med-wise.vercel.app |

Vercel also makes a one-off address for every build; those are not needed day to day.

## Release rule
`staging` first → run golden tests → I check on my phone → then `production`.
