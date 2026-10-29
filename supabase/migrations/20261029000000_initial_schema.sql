-- MedWise initial database structure (agreed with Dr. Solanke, 2026-10-29).
-- Plain-language summary:
--   hospitals    one row per hospital, with its stewardship settings
--   profiles     one row per user: which hospital, which role
--   antibiograms each uploaded antibiogram (kept forever; newest is used)
--   cases        de-identified inputs + result for every recommendation (never edited or deleted)
--   decisions    every Accept / Modify / Override (never edited or deleted)
-- Privacy rules (row-level security):
--   clinicians and admins see only their own hospital; the owner sees all hospitals.
-- No patient identifiers are stored anywhere (CLAUDE.md rule 4); the server checks inputs before saving.

create type public.user_role as enum ('clinician', 'admin', 'owner');
create type public.decision_action as enum ('accept', 'modify', 'override');
create type public.antibiogram_unit as enum ('ICU', 'ward');

-- Tables ---------------------------------------------------------------------

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Set by the stewardship committee; empty until they decide (see DECISIONS.md open items).
  empiric_cutoff_percent numeric(5, 2) check (empiric_cutoff_percent between 50 and 100),
  min_isolates integer check (min_isolates >= 1),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  hospital_id uuid references public.hospitals (id),
  role public.user_role not null,
  created_at timestamptz not null default now(),
  -- Everyone except the owner belongs to exactly one hospital.
  constraint profiles_hospital_required check (role = 'owner' or hospital_id is not null)
);

create table public.antibiograms (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  year integer not null check (year between 2000 and 2100),
  unit public.antibiogram_unit not null,
  -- Rows follow knowledge/antibiogram_template.csv: organism, antibiotic, isolates_n, percent_susceptible.
  rows jsonb not null check (jsonb_typeof(rows) = 'array'),
  uploaded_by uuid not null references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id),
  user_id uuid not null references public.profiles (id),
  inputs jsonb not null,             -- form inputs, no identifiers
  result jsonb not null,             -- what was shown to the clinician
  kb_version text not null,          -- knowledge-base version (CLAUDE.md rule 6)
  guideline_versions jsonb not null, -- e.g. {"SSC": "2026", "IDSA": "2026", "ICMR": "2022"}
  antibiogram_id uuid references public.antibiograms (id),
  ai_model text,                     -- null if the AI was not used or failed
  ai_output jsonb,                   -- the AI's raw answer, kept for audit
  created_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  user_id uuid not null references public.profiles (id),
  action public.decision_action not null,
  final_regimen text,
  reason_code text,                  -- pick-list choice
  reason_text text,                  -- optional free text
  created_at timestamptz not null default now(),
  -- CLAUDE.md rule 7: Modify and Override need a reason and the regimen actually chosen.
  constraint decisions_reason_required check (
    action = 'accept' or (nullif(trim(reason_code), '') is not null and nullif(trim(final_regimen), '') is not null)
  )
);

create index on public.profiles (hospital_id);
create index on public.antibiograms (hospital_id, year, unit, uploaded_at desc);
create index on public.cases (hospital_id, created_at desc);
create index on public.decisions (case_id);

-- Helper functions (kept out of the public API) -------------------------------

create schema if not exists private;

create function private.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function private.my_hospital_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select hospital_id from public.profiles where id = auth.uid()
$$;

create function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Who may do what (table level) ---------------------------------------------
-- Visitors who are not logged in get nothing. Logged-in users get only what the rules below allow.

revoke all on public.hospitals, public.profiles, public.antibiograms, public.cases, public.decisions from anon, authenticated;

grant select, insert, delete on public.hospitals to authenticated;
grant update (empiric_cutoff_percent, min_isolates) on public.hospitals to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert on public.antibiograms to authenticated;
grant select, insert on public.cases to authenticated;      -- no update/delete: audit trail
grant select, insert on public.decisions to authenticated;  -- no update/delete: audit trail

-- Row-level security (which rows) ---------------------------------------------

alter table public.hospitals enable row level security;
alter table public.profiles enable row level security;
alter table public.antibiograms enable row level security;
alter table public.cases enable row level security;
alter table public.decisions enable row level security;

-- hospitals: see your own; owner sees and manages all; admin changes settings of own hospital.
create policy hospitals_select on public.hospitals for select to authenticated
  using (private.is_owner() or id = private.my_hospital_id());
create policy hospitals_insert on public.hospitals for insert to authenticated
  with check (private.is_owner());
create policy hospitals_delete on public.hospitals for delete to authenticated
  using (private.is_owner());
create policy hospitals_update on public.hospitals for update to authenticated
  using (private.is_owner() or (private.my_role() = 'admin' and id = private.my_hospital_id()))
  with check (private.is_owner() or (private.my_role() = 'admin' and id = private.my_hospital_id()));

-- profiles: see yourself; admins see their hospital's users; only the owner adds or changes users.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or private.is_owner()
    or (private.my_role() = 'admin' and hospital_id = private.my_hospital_id())
  );
create policy profiles_owner_insert on public.profiles for insert to authenticated
  with check (private.is_owner());
create policy profiles_owner_update on public.profiles for update to authenticated
  using (private.is_owner()) with check (private.is_owner());
create policy profiles_owner_delete on public.profiles for delete to authenticated
  using (private.is_owner());

-- antibiograms: own hospital (owner: all); only that hospital's admin uploads.
create policy antibiograms_select on public.antibiograms for select to authenticated
  using (private.is_owner() or hospital_id = private.my_hospital_id());
create policy antibiograms_insert on public.antibiograms for insert to authenticated
  with check (
    private.my_role() = 'admin'
    and hospital_id = private.my_hospital_id()
    and uploaded_by = auth.uid()
  );

-- cases: own hospital (owner: all); saved by the logged-in user, for their own hospital only.
create policy cases_select on public.cases for select to authenticated
  using (private.is_owner() or hospital_id = private.my_hospital_id());
create policy cases_insert on public.cases for insert to authenticated
  with check (
    user_id = auth.uid()
    and hospital_id = private.my_hospital_id()
    and (
      antibiogram_id is null
      or exists (select 1 from public.antibiograms a where a.id = antibiogram_id and a.hospital_id = cases.hospital_id)
    )
  );

-- decisions: visible with their case; saved by the logged-in user on a case from their own hospital.
create policy decisions_select on public.decisions for select to authenticated
  using (
    private.is_owner()
    or exists (select 1 from public.cases c where c.id = case_id and c.hospital_id = private.my_hospital_id())
  );
create policy decisions_insert on public.decisions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.cases c where c.id = case_id and c.hospital_id = private.my_hospital_id())
  );
