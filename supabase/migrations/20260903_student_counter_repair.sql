-- Initialize each branch/year ID counter from the existing database roster.
-- This prevents create_student from attempting to reuse IDs when a project
-- was populated before student_id_counters was introduced.
with prefixes(prefix) as (
  values
    ('26611A'), ('25612A'), ('24613A'), ('23614A'),
    ('26611B'), ('25612B'), ('24613B'), ('23614B')
), current_values as (
  select p.prefix,
    coalesce(max(nullif(substring(s.id from 7), '')::integer), 0) as last_value
  from prefixes p
  left join public.students s on left(s.id, 6) = p.prefix
  group by p.prefix
)
insert into public.student_id_counters(prefix, last_value)
select prefix, last_value from current_values
on conflict (prefix) do update
set last_value = greatest(public.student_id_counters.last_value, excluded.last_value);
