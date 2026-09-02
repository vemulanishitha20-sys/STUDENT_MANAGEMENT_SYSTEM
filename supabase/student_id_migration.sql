-- Applied to the connected Supabase project on 2026-08-17.
-- Existing students are numbered within their branch/year in creation order.
-- Attendance foreign keys must use ON UPDATE CASCADE before IDs are remapped.
-- The live migration is retained in Supabase migration history as:
-- student_ids_by_branch_and_year

-- New ID prefixes:
-- CSE: Year 1 26611A, Year 2 25612A, Year 3 24613A, Year 4 23614A
-- ECE: Year 1 26611B, Year 2 25612B, Year 3 24613B, Year 4 23614B

create table if not exists public.student_id_counters (
  prefix text primary key,
  last_value integer not null default 0 check (last_value >= 0)
);
alter table public.student_id_counters enable row level security;

-- Counters only increase, so deleting a student never makes that ID reusable.
