-- Checks the privacy and audit rules in supabase/migrations. Any failed check stops with an error.
\set ON_ERROR_STOP 1

-- Two hospitals and four users, created as the database superuser.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- owner
  ('00000000-0000-0000-0000-0000000000a1'), -- clinician, hospital A
  ('00000000-0000-0000-0000-0000000000a2'), -- admin, hospital A
  ('00000000-0000-0000-0000-0000000000b1'); -- clinician, hospital B
insert into public.hospitals (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Hospital A'),
  ('22222222-2222-2222-2222-222222222222', 'Hospital B');
insert into public.profiles (id, hospital_id, role) values
  ('00000000-0000-0000-0000-00000000000a', null, 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'clinician'),
  ('00000000-0000-0000-0000-0000000000a2', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222', 'clinician');

-- Helper: run a statement and require that the database refuses it, either with an error
-- or by silently changing no rows (how row-level security blocks updates and deletes).
create function pg_temp.expect_refused(label text, stmt text) returns void language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FAIL: % was allowed', label; end if;
  raise notice 'ok: % blocked (no rows changed)', label;
exception
  when insufficient_privilege or check_violation then raise notice 'ok: % refused', label;
end $$;

create function pg_temp.expect_count(label text, query text, expected int) returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || query || ') q' into n;
  if n <> expected then raise exception 'FAIL: % saw % rows, expected %', label, n, expected; end if;
  raise notice 'ok: % (% rows)', label, n;
end $$;

grant execute on function pg_temp.expect_refused(text, text), pg_temp.expect_count(text, text, int) to authenticated, anon;

set role authenticated;

-- Clinician A saves a case for their hospital, and accepts it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.cases (id, hospital_id, user_id, inputs, result, kb_version, guideline_versions)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-0000000000a1', '{}', '{}', 'v0.1', '{}');
insert into public.decisions (case_id, user_id, action)
values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'accept');
select pg_temp.expect_refused('Modify without a reason',
  $q$insert into public.decisions (case_id, user_id, action, final_regimen)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'modify', 'x')$q$);
select pg_temp.expect_refused('Override without the regimen chosen',
  $q$insert into public.decisions (case_id, user_id, action, reason_code)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'override', 'other')$q$);
insert into public.decisions (case_id, user_id, action, final_regimen, reason_code)
values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'override', 'piperacillin-tazobactam', 'local_policy');
select pg_temp.expect_refused('editing a saved case', $q$update public.cases set kb_version = 'v9'$q$);
select pg_temp.expect_refused('deleting a decision', $q$delete from public.decisions$q$);
select pg_temp.expect_refused('saving a case for another hospital',
  $q$insert into public.cases (hospital_id, user_id, inputs, result, kb_version, guideline_versions)
     values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000a1', '{}', '{}', 'v0.1', '{}')$q$);
select pg_temp.expect_refused('saving a case as someone else',
  $q$insert into public.cases (hospital_id, user_id, inputs, result, kb_version, guideline_versions)
     values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000a2', '{}', '{}', 'v0.1', '{}')$q$);
select pg_temp.expect_refused('clinician changing cut-off',
  $q$update public.hospitals set empiric_cutoff_percent = 80 where true returning 1$q$);
select pg_temp.expect_refused('clinician making themself admin',
  $q$update public.profiles set role = 'admin' where id = auth.uid() returning 1$q$);
select pg_temp.expect_refused('clinician uploading an antibiogram',
  $q$insert into public.antibiograms (hospital_id, year, unit, rows, uploaded_by)
     values ('11111111-1111-1111-1111-111111111111', 2026, 'ICU', '[]', '00000000-0000-0000-0000-0000000000a1')$q$);
select pg_temp.expect_count('clinician A sees only hospital A', 'select * from public.hospitals', 1);

-- Clinician B must not see hospital A's case or decisions.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.expect_count('clinician B sees no hospital A cases', 'select * from public.cases', 0);
select pg_temp.expect_count('clinician B sees no hospital A decisions', 'select * from public.decisions', 0);
select pg_temp.expect_count('clinician B sees only their own profile', 'select * from public.profiles', 1);
select pg_temp.expect_refused('deciding on another hospital''s case',
  $q$insert into public.decisions (case_id, user_id, action)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'accept')$q$);

-- Admin A sets the cut-off and uploads an antibiogram for hospital A only.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
update public.hospitals set empiric_cutoff_percent = 80, min_isolates = 30 where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.expect_refused('admin renaming the hospital', $q$update public.hospitals set name = 'X'$q$);
insert into public.antibiograms (hospital_id, year, unit, rows, uploaded_by)
values ('11111111-1111-1111-1111-111111111111', 2026, 'ICU', '[]', '00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_refused('admin uploading for another hospital',
  $q$insert into public.antibiograms (hospital_id, year, unit, rows, uploaded_by)
     values ('22222222-2222-2222-2222-222222222222', 2026, 'ICU', '[]', '00000000-0000-0000-0000-0000000000a2')$q$);
select pg_temp.expect_count('admin A sees hospital A users', 'select * from public.profiles', 2);

-- The owner sees every hospital and every case.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_count('owner sees all hospitals', 'select * from public.hospitals', 2);
select pg_temp.expect_count('owner sees all cases', 'select * from public.cases', 1);
select pg_temp.expect_count('owner sees all decisions', 'select * from public.decisions', 2);
select pg_temp.expect_refused('owner editing a decision', $q$update public.decisions set reason_text = 'x'$q$);

-- Visitors who are not logged in see nothing.
reset role;
set role anon;
select pg_temp.expect_refused('logged-out visitor reading cases', 'select * from public.cases');

\echo ALL DATABASE CHECKS PASSED
