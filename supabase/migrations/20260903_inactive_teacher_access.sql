-- Teachers may still authenticate when inactive, but the database prevents
-- them from receiving an attendance roster or recording attendance.
create or replace function public.teacher_attendance_students(p_teacher_id text)
returns setof public.students
language sql security definer set search_path=public as $$
  select distinct s.*
  from public.students s
  join public.subjects sub on sub.department=s.department and sub.year=s.year
  join public.teacher_subjects ts on ts.subject_code=sub.code
  join public.teachers t on t.id=ts.teacher_id
  where ts.teacher_id=p_teacher_id and t.is_active and s.is_active
  order by s.name;
$$;

create or replace function public.mark_student_attendance(
  p_teacher_id text, p_student_id text, p_present boolean
)
returns table(attended_classes integer,total_classes integer)
language plpgsql security definer set search_path=public as $$
begin
  if not exists(
    select 1 from public.students s
    join public.subjects sub on sub.department=s.department and sub.year=s.year
    join public.teacher_subjects ts on ts.subject_code=sub.code
    join public.teachers t on t.id=ts.teacher_id
    where s.id=p_student_id and s.is_active
      and ts.teacher_id=p_teacher_id and t.is_active
  ) then
    raise exception 'This inactive teacher cannot mark attendance';
  end if;

  return query
  update public.students
  set total_classes=students.total_classes+1,
      attended_classes=students.attended_classes+(case when p_present then 1 else 0 end)
  where id=p_student_id
  returning students.attended_classes,students.total_classes;
end $$;

revoke all on function public.teacher_attendance_students(text) from public;
revoke all on function public.mark_student_attendance(text,text,boolean) from public;
grant execute on function public.teacher_attendance_students(text) to anon, authenticated;
grant execute on function public.mark_student_attendance(text,text,boolean) to anon, authenticated;
