-- Fix the ambiguous `prefix` identifier that prevented student creation.
create or replace function public.create_student(
  p_name text, p_email text, p_department text, p_year integer
)
returns setof public.students
language plpgsql security definer set search_path=public as $$
declare
  v_prefix text;
  v_next_number integer;
  v_new_id text;
begin
  if p_department not in ('CSE', 'ECE') then
    raise exception 'Unsupported department';
  end if;
  if p_year not between 1 and 4 then
    raise exception 'Year must be between 1 and 4';
  end if;

  v_prefix := case p_year
    when 1 then '26611' when 2 then '25612'
    when 3 then '24613' when 4 then '23614'
  end || case p_department when 'CSE' then 'A' else 'B' end;

  insert into public.student_id_counters(prefix, last_value)
  values (v_prefix, 1)
  on conflict on constraint student_id_counters_pkey do update
  set last_value = public.student_id_counters.last_value + 1
  returning last_value into v_next_number;

  v_new_id := v_prefix || case
    when v_next_number < 100 then lpad(v_next_number::text, 2, '0')
    else v_next_number::text
  end;

  return query
  insert into public.students(id, name, email, department, year)
  values (
    v_new_id, trim(p_name), nullif(trim(coalesce(p_email, '')), ''),
    p_department, p_year
  )
  returning *;
end;
$$;

revoke all on function public.create_student(text, text, text, integer) from public;
grant execute on function public.create_student(text, text, text, integer) to anon, authenticated;
