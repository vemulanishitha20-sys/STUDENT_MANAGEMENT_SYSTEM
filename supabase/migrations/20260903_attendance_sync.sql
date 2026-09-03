-- Apply this migration to the existing Supabase database.
-- Dated attendance records are the single source of truth for both the
-- Students roster's <75% filter and the student portal charts.

create or replace function public.sync_student_attendance_totals()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_student_id text := coalesce(new.student_id, old.student_id);
begin
  update public.students s
  set total_classes = totals.total_classes,
      attended_classes = totals.attended_classes
  from (
    select count(*)::integer as total_classes,
           count(*) filter (where present)::integer as attended_classes
    from public.attendance_records
    where student_id = v_student_id
  ) totals
  where s.id = v_student_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists attendance_records_sync_student_totals on public.attendance_records;
create trigger attendance_records_sync_student_totals
after insert or update or delete on public.attendance_records
for each row execute function public.sync_student_attendance_totals();

update public.students s
set total_classes = totals.total_classes,
    attended_classes = totals.attended_classes
from (
  select s2.id, count(ar.id)::integer as total_classes,
         count(ar.id) filter (where ar.present)::integer as attended_classes
  from public.students s2
  left join public.attendance_records ar on ar.student_id = s2.id
  group by s2.id
) totals
where s.id = totals.id;

-- An inactive student can log in, but sees no attendance (0%). Once active,
-- this function again exposes the exact attendance already recorded for them.
create or replace function public.student_subject_attendance(p_student_id text)
returns table(subject_code text,subject_name text,total_classes bigint,attended_classes bigint,attendance_percentage integer)
language sql stable security definer set search_path=public,extensions as $$
  select sub.code, sub.name, count(ar.id), count(ar.id) filter (where ar.present),
    case when count(ar.id)=0 then 0 else round(100.0*count(ar.id) filter(where ar.present)/count(ar.id))::integer end
  from public.students s
  join public.subjects sub on sub.department=s.department and sub.year=s.year
  left join public.attendance_records ar on ar.subject_code=sub.code and ar.student_id=s.id
  where s.id=p_student_id and s.is_active
  group by sub.code,sub.name
  order by sub.code;
$$;
revoke all on function public.student_subject_attendance(text) from public;
grant execute on function public.student_subject_attendance(text) to anon, authenticated;

-- The register already records rows; do not separately increment totals.
create or replace function public.save_subject_attendance(p_teacher_id text,p_subject_code text,p_date date,p_attendance jsonb)
returns table(student_id text,attended_classes integer,total_classes integer)
language plpgsql security definer set search_path=public,extensions as $$
declare v_expected integer; v_supplied integer; v_item jsonb; v_student_id text; v_present boolean;
begin
  if p_date>current_date then raise exception 'Future attendance cannot be marked'; end if;
  if extract(dow from p_date)=0 then raise exception 'Attendance cannot be marked on Sunday'; end if;
  if exists(select 1 from public.academic_events ae join public.subjects sub on sub.code=p_subject_code where ae.creator_role='admin' and ae.kind='Holiday' and p_date between ae.start_date and ae.end_date and (ae.department is null or ae.department=sub.department) and (ae.year is null or ae.year=sub.year)) then raise exception 'Attendance cannot be marked on an official holiday'; end if;
  if exists(select 1 from public.attendance_records where teacher_id=p_teacher_id and subject_code=p_subject_code and attendance_date=p_date) then raise exception 'Attendance for this date has already been saved and cannot be changed'; end if;
  if not exists(select 1 from public.teacher_subjects ts join public.teachers t on t.id=ts.teacher_id where ts.teacher_id=p_teacher_id and ts.subject_code=p_subject_code and t.is_active) then raise exception 'This subject is not assigned to this active teacher'; end if;
  if not exists(select 1 from public.class_schedule cs where cs.teacher_id=p_teacher_id and cs.subject_code=p_subject_code and cs.day=trim(to_char(p_date,'Day'))) then raise exception 'This teacher has no scheduled class for this subject on the selected day'; end if;
  select count(*) into v_expected from public.students s join public.subjects sub on sub.department=s.department and sub.year=s.year where sub.code=p_subject_code and s.is_active;
  select count(distinct item->>'student_id') into v_supplied from jsonb_array_elements(p_attendance) item where item?'student_id' and item?'present' and jsonb_typeof(item->'present')='boolean';
  if v_expected=0 or v_supplied<>v_expected then raise exception 'Mark every student present or absent before saving'; end if;
  for v_item in select value from jsonb_array_elements(p_attendance) loop
    v_student_id:=v_item->>'student_id'; v_present:=(v_item->>'present')::boolean;
    if not exists(select 1 from public.students s join public.subjects sub on sub.department=s.department and sub.year=s.year where sub.code=p_subject_code and s.id=v_student_id and s.is_active) then raise exception 'Student % is not in this assigned subject class',v_student_id; end if;
    insert into public.attendance_records(teacher_id,subject_code,student_id,attendance_date,present) values(p_teacher_id,p_subject_code,v_student_id,p_date,v_present);
  end loop;
  return query select s.id,s.attended_classes,s.total_classes from public.students s where s.id in(select item->>'student_id' from jsonb_array_elements(p_attendance) item);
end $$;
revoke all on function public.save_subject_attendance(text,text,date,jsonb) from public;
grant execute on function public.save_subject_attendance(text,text,date,jsonb) to anon,authenticated;
