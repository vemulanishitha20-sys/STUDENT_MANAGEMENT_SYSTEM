create extension if not exists pgcrypto;
create sequence if not exists teacher_id_seq start 1;
create table if not exists student_id_counters (
  prefix text primary key,
  last_value integer not null default 0 check (last_value >= 0)
);
alter table student_id_counters enable row level security;

-- Run these two lines as a migration if the tables already exist.
alter table if exists teachers add column if not exists year integer not null default 1 check (year between 1 and 4);
alter table if exists students add column if not exists year integer not null default 1 check (year between 1 and 4);
alter table if exists students add column if not exists attended_classes integer not null default 0;
alter table if exists students add column if not exists total_classes integer not null default 0;

create table if not exists teachers (
  id text primary key default ('TCH' || lpad(nextval('teacher_id_seq')::text, 3, '0')),
  name text not null, email text unique not null, department text not null,
  year integer not null default 1 check (year between 1 and 4),
  password_hash text not null default crypt('987654321', gen_salt('bf')),
  created_at timestamptz not null default now()
);
create table if not exists students (
  id text primary key, name text not null, email text unique not null,
  department text not null check (department in ('CSE','ECE')),
  year integer not null default 1 check (year between 1 and 4),
  password_hash text not null default crypt('987654321', gen_salt('bf')),
  created_at timestamptz not null default now()
);

create or replace function create_teacher(p_name text,p_email text,p_department text,p_year integer)
returns setof teachers language plpgsql security definer set search_path=public as $$ begin
  return query insert into teachers(name,email,department,year) values(p_name,p_email,p_department,p_year) returning *;
end $$;
create or replace function create_student(p_name text,p_email text,p_department text,p_year integer)
returns setof students language plpgsql security definer set search_path=public as $$
declare prefix text; next_number integer; new_id text;
begin
  if p_department not in ('CSE','ECE') then raise exception 'Unsupported department'; end if;
  if p_year not between 1 and 4 then raise exception 'Year must be between 1 and 4'; end if;
  prefix := case p_year when 1 then '26611' when 2 then '25612' when 3 then '24613' when 4 then '23614' end
    || case p_department when 'CSE' then 'A' else 'B' end;
  insert into student_id_counters(prefix,last_value) values(prefix,1)
  on conflict(prefix) do update set last_value=student_id_counters.last_value+1
  returning last_value into next_number;
  new_id := prefix || case when next_number < 100 then lpad(next_number::text,2,'0') else next_number::text end;
  return query insert into students(id,name,email,department,year)
    values(new_id,trim(p_name),nullif(trim(coalesce(p_email,'')),''),p_department,p_year) returning *;
end $$;
-- The return columns changed in a later version, so PostgreSQL requires the
-- old function to be removed before it can be recreated.
drop function if exists campus_login(text,text,text);
create function campus_login(p_role text,p_id text,p_password text)
returns table(id text,name text,department text,role text) language plpgsql security definer set search_path=public as $$ begin
  if p_role='teacher' then return query select t.id,t.name,t.department,'teacher'::text from teachers t where upper(t.id)=upper(p_id) and t.password_hash=crypt(p_password,t.password_hash);
  elsif p_role='student' then return query select s.id,s.name,s.department,'student'::text from students s where upper(s.id)=upper(p_id) and s.password_hash=crypt(p_password,s.password_hash); end if;
end $$;

alter table teachers enable row level security;
alter table students enable row level security;
drop policy if exists "prototype read teachers" on teachers;
drop policy if exists "prototype read students" on students;
drop policy if exists "prototype delete teachers" on teachers;
drop policy if exists "prototype delete students" on students;
create policy "prototype read teachers" on teachers for select using (true);
create policy "prototype read students" on students for select using (true);
create policy "prototype delete teachers" on teachers for delete using (true);
create policy "prototype delete students" on students for delete using (true);
grant execute on function create_teacher(text,text,text,integer),create_student(text,text,text,integer),campus_login(text,text,text) to anon,authenticated;

-- Subject catalogue and teacher assignments
alter table teachers alter column email drop not null;
alter table students alter column email drop not null;
create table if not exists subjects(code text primary key,name text not null unique,department text not null check(department in ('CSE','ECE')),year integer not null check(year between 1 and 4));
-- Complete subject catalogue used by teacher assignment and the fixed timetable.
insert into subjects(code,name,department,year) values
  ('CSE101','Programming Fundamentals','CSE',1),('CSE102','Discrete Structures','CSE',1),('CSE103','Linear Algebra','CSE',1),
  ('CSE201','Data Structures','CSE',2),('CSE202','Computer Organization','CSE',2),('CSE203','Object Oriented Programming','CSE',2),
  ('CSE301','Database Systems','CSE',3),('CSE302','Operating Systems','CSE',3),('CSE303','Computer Networks','CSE',3),
  ('CSE401','Cloud Computing','CSE',4),('CSE402','Machine Learning','CSE',4),('CSE403','Cyber Security','CSE',4),
  ('ECE101','Circuit Analysis','ECE',1),('ECE102','Semiconductor Physics','ECE',1),('ECE103','Network Theory','ECE',1),
  ('ECE201','Analog Electronics','ECE',2),('ECE202','Signals and Systems','ECE',2),('ECE203','Electromagnetic Fields','ECE',2),
  ('ECE301','Digital Communication','ECE',3),('ECE302','Microprocessors','ECE',3),('ECE303','Control Engineering','ECE',3),
  ('ECE401','VLSI Design','ECE',4),('ECE402','Embedded Systems','ECE',4),('ECE403','Microwave Engineering','ECE',4)
on conflict (code) do nothing;
create table if not exists teacher_subjects(teacher_id text references teachers(id) on delete cascade,subject_code text references subjects(code) on delete restrict,assigned_at timestamptz default now(),primary key(teacher_id,subject_code));
create index if not exists teacher_subjects_subject_code_idx on teacher_subjects(subject_code);
create unique index if not exists teacher_subjects_one_teacher_per_subject on teacher_subjects(subject_code);
alter table teachers add column if not exists is_active boolean not null default true;
alter table students add column if not exists is_active boolean not null default true;
alter table subjects enable row level security;
alter table teacher_subjects enable row level security;

-- Only show a teacher students from the branch/year combinations covered by
-- that teacher's assigned subjects.
create or replace function teacher_attendance_students(p_teacher_id text)
returns setof students language sql security definer set search_path=public as $$
  select distinct s.* from students s
  join subjects sub on sub.department=s.department and sub.year=s.year
  join teacher_subjects ts on ts.subject_code=sub.code
  join teachers t on t.id=ts.teacher_id
  where ts.teacher_id=p_teacher_id and t.is_active and s.is_active
  order by s.name;
$$;

create or replace function mark_student_attendance(p_teacher_id text,p_student_id text,p_present boolean)
returns table(attended_classes integer,total_classes integer)
language plpgsql security definer set search_path=public as $$ begin
  if not exists(select 1 from students s join subjects sub on sub.department=s.department and sub.year=s.year join teacher_subjects ts on ts.subject_code=sub.code join teachers t on t.id=ts.teacher_id where s.id=p_student_id and s.is_active and ts.teacher_id=p_teacher_id and t.is_active) then
    raise exception 'This student is not in a branch and year assigned to this teacher';
  end if;
  return query update students set total_classes=students.total_classes+1,attended_classes=students.attended_classes+(case when p_present then 1 else 0 end) where id=p_student_id returning students.attended_classes,students.total_classes;
end $$;

revoke all on function teacher_attendance_students(text) from public;
revoke all on function mark_student_attendance(text,text,boolean) from public;
grant execute on function teacher_attendance_students(text) to anon,authenticated;
grant execute on function mark_student_attendance(text,text,boolean) to anon,authenticated;

-- Announcements published by an administrator. Run this section in existing projects.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience text not null check (audience in ('all', 'teachers')) default 'all',
  author text not null default 'Administrator',
  created_at timestamptz not null default now()
);
alter table announcements enable row level security;
drop policy if exists "prototype read announcements" on announcements;
drop policy if exists "prototype create announcements" on announcements;
create policy "prototype read announcements" on announcements for select using (true);
create policy "prototype create announcements" on announcements for insert with check (true);

-- Weekly timetable. A teacher and a branch/year can each have only one class per slot.
create table if not exists class_schedule (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null references subjects(code) on delete restrict,
  subject_name text not null,
  department text not null check (department in ('CSE', 'ECE')),
  year integer not null check (year between 1 and 4),
  teacher_id text not null references teachers(id) on delete restrict,
  teacher_name text not null,
  day text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  day_index integer not null check (day_index between 0 and 5),
  slot text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, day, slot),
  unique (department, year, day, slot)
);
alter table class_schedule enable row level security;
drop policy if exists "prototype read class schedule" on class_schedule;
drop policy if exists "prototype create class schedule" on class_schedule;
drop policy if exists "prototype update class schedule" on class_schedule;
drop policy if exists "prototype delete class schedule" on class_schedule;
create policy "prototype read class schedule" on class_schedule for select using (true);
create policy "prototype create class schedule" on class_schedule for insert with check (true);
create policy "prototype update class schedule" on class_schedule for update using (true) with check (true);
create policy "prototype delete class schedule" on class_schedule for delete using (true);

-- A branch/year has at most one full Sports Day. It cannot contain classes.
create table if not exists sports_day_allocations (
  id uuid primary key default gen_random_uuid(),
  department text not null check (department in ('CSE', 'ECE')),
  year integer not null check (year between 1 and 4),
  day text not null check (day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  created_at timestamptz not null default now(),
  unique (department, year)
);
alter table sports_day_allocations enable row level security;
drop policy if exists "prototype read sports days" on sports_day_allocations;
drop policy if exists "prototype create sports days" on sports_day_allocations;
drop policy if exists "prototype update sports days" on sports_day_allocations;
drop policy if exists "prototype delete sports days" on sports_day_allocations;
create policy "prototype read sports days" on sports_day_allocations for select using (true);
create policy "prototype create sports days" on sports_day_allocations for insert with check (true);
create policy "prototype update sports days" on sports_day_allocations for update using (true) with check (true);
create policy "prototype delete sports days" on sports_day_allocations for delete using (true);

create or replace function validate_sports_day_allocation() returns trigger language plpgsql as $$
begin
  if exists (select 1 from class_schedule where department = new.department and year = new.year and day = new.day) then
    raise exception 'Remove the scheduled classes on % before allocating it as Sports Day', new.day;
  end if;
  return new;
end;
$$;
drop trigger if exists sports_day_allocation_validation on sports_day_allocations;
create trigger sports_day_allocation_validation before insert or update on sports_day_allocations for each row execute function validate_sports_day_allocation();

-- Keep schedule rows consistent even when they are created outside the web UI.
create or replace function validate_class_schedule() returns trigger language plpgsql as $$
begin
  if exists (select 1 from sports_day_allocations where department = new.department and year = new.year and day = new.day) then
    raise exception '% Year % has Sports Day on %. Remove that Sports Day before adding a class.', new.department, new.year, new.day;
  end if;
  if not exists (
    select 1 from teacher_subjects
    where teacher_id = new.teacher_id and subject_code = new.subject_code
  ) then
    raise exception 'The selected teacher is not assigned to this subject';
  end if;
  if not exists (
    select 1 from subjects
    where code = new.subject_code
      and department = new.department
      and year = new.year
      and name = new.subject_name
  ) then
    raise exception 'The subject does not match the selected branch and year';
  end if;
  return new;
end;
$$;
drop trigger if exists class_schedule_validation on class_schedule;
create trigger class_schedule_validation
before insert or update on class_schedule
for each row execute function validate_class_schedule();

-- Fill a complete fixed week: five periods for every assigned subject.
-- Existing classes stay unchanged; Sports Days and teacher clashes are skipped.
drop function if exists seed_fixed_timetable();
create function seed_fixed_timetable()
returns table(scheduled integer, skipped_subjects text[])
language plpgsql security definer set search_path=public as $$
declare
  sub record;
  assigned_teacher record;
  candidate_day text;
  candidate_slot text;
  inserted_count integer := 0;
  skipped_codes text[] := '{}';
  placed boolean;
  current_periods integer;
begin
  for sub in select * from subjects order by department, year, code loop
    select t.id, t.name into assigned_teacher
    from teacher_subjects ts join teachers t on t.id = ts.teacher_id
    where ts.subject_code = sub.code and t.is_active
    limit 1;
    if assigned_teacher.id is null then
      skipped_codes := array_append(skipped_codes, sub.code);
      continue;
    end if;
    select count(*) into current_periods from class_schedule where subject_code = sub.code;
    while current_periods < 5 loop
      placed := false;
      foreach candidate_day in array array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] loop
        if exists (select 1 from sports_day_allocations where department = sub.department and year = sub.year and day = candidate_day) then
          continue;
        end if;
        foreach candidate_slot in array array['09:30 - 10:30','10:30 - 11:30','12:00 - 01:00'] loop
          if exists (select 1 from class_schedule where day = candidate_day and slot = candidate_slot and (teacher_id = assigned_teacher.id or (department = sub.department and year = sub.year))) then
            continue;
          end if;
          insert into class_schedule(subject_code,subject_name,department,year,teacher_id,teacher_name,day,day_index,slot)
          values(sub.code,sub.name,sub.department,sub.year,assigned_teacher.id,assigned_teacher.name,candidate_day,array_position(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],candidate_day)-1,candidate_slot);
          inserted_count := inserted_count + 1;
          current_periods := current_periods + 1;
          placed := true;
          exit;
        end loop;
        exit when placed;
      end loop;
      if not placed then skipped_codes := array_append(skipped_codes, sub.code); exit; end if;
    end loop;
  end loop;
  return query select inserted_count, skipped_codes;
end;
$$;
grant execute on function seed_fixed_timetable() to anon, authenticated;

-- Admin management RPCs used by the web app.  Keep these definitions after
-- the subject-assignment tables, because teacher creation also stores subject
-- assignments in the same transaction.
create or replace function create_teacher(
  p_name text,
  p_email text,
  p_department text,
  p_year integer,
  p_subject_codes text[] default '{}'
)
returns setof teachers language plpgsql security definer set search_path=public as $$
declare new_teacher teachers;
begin
  insert into teachers(name, email, department, year)
  values (trim(p_name), nullif(trim(coalesce(p_email, '')), ''), p_department, p_year)
  returning * into new_teacher;

  insert into teacher_subjects(teacher_id, subject_code)
  select new_teacher.id, subject_code
  from unnest(coalesce(p_subject_codes, '{}')) as subject_code
  join subjects on subjects.code = subject_code
  where true;

  return next new_teacher;
end $$;

create or replace function update_student(
  p_id text,
  p_name text,
  p_email text,
  p_department text,
  p_year integer
)
returns setof students language plpgsql security definer set search_path=public as $$
begin
  return query
  update students
  set name = trim(p_name),
      email = nullif(trim(coalesce(p_email, '')), ''),
      department = p_department,
      year = p_year
  where id = p_id
  returning *;
end $$;

-- The previous app version returned a different type from this function.
drop function if exists update_teacher_subjects(text, text[]);
create function update_teacher_subjects(
  p_teacher_id text,
  p_subject_codes text[]
)
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from teacher_subjects where teacher_id = p_teacher_id;
  insert into teacher_subjects(teacher_id, subject_code)
  select p_teacher_id, subject_code
  from unnest(coalesce(p_subject_codes, '{}')) as subject_code
  join subjects on subjects.code = subject_code
  where true;
end $$;

grant execute on function
  create_teacher(text, text, text, integer, text[]),
  update_student(text, text, text, text, integer),
  update_teacher_subjects(text, text[])
to anon, authenticated;

-- Initial roster: five students in each CSE/ECE branch and each academic year.
-- Existing records are preserved, so it is safe to run this more than once.
insert into students (id, name, email, department, year) values
  ('26611A01', 'Aarav Sharma', 'aarav.sharma.cse1@example.com', 'CSE', 1),
  ('26611A02', 'Diya Patel', 'diya.patel.cse1@example.com', 'CSE', 1),
  ('26611A03', 'Kabir Singh', 'kabir.singh.cse1@example.com', 'CSE', 1),
  ('26611A04', 'Ananya Reddy', 'ananya.reddy.cse1@example.com', 'CSE', 1),
  ('26611A05', 'Vivaan Gupta', 'vivaan.gupta.cse1@example.com', 'CSE', 1),
  ('25612A01', 'Ishaan Verma', 'ishaan.verma.cse2@example.com', 'CSE', 2),
  ('25612A02', 'Meera Nair', 'meera.nair.cse2@example.com', 'CSE', 2),
  ('25612A03', 'Arjun Kumar', 'arjun.kumar.cse2@example.com', 'CSE', 2),
  ('25612A04', 'Kavya Iyer', 'kavya.iyer.cse2@example.com', 'CSE', 2),
  ('25612A05', 'Rohan Das', 'rohan.das.cse2@example.com', 'CSE', 2),
  ('24613A01', 'Aditya Rao', 'aditya.rao.cse3@example.com', 'CSE', 3),
  ('24613A02', 'Saanvi Joshi', 'saanvi.joshi.cse3@example.com', 'CSE', 3),
  ('24613A03', 'Karthik Menon', 'karthik.menon.cse3@example.com', 'CSE', 3),
  ('24613A04', 'Nisha Kapoor', 'nisha.kapoor.cse3@example.com', 'CSE', 3),
  ('24613A05', 'Rahul Sethi', 'rahul.sethi.cse3@example.com', 'CSE', 3),
  ('23614A01', 'Siddharth Jain', 'siddharth.jain.cse4@example.com', 'CSE', 4),
  ('23614A02', 'Priya Malhotra', 'priya.malhotra.cse4@example.com', 'CSE', 4),
  ('23614A03', 'Neel Shah', 'neel.shah.cse4@example.com', 'CSE', 4),
  ('23614A04', 'Aditi Kulkarni', 'aditi.kulkarni.cse4@example.com', 'CSE', 4),
  ('23614A05', 'Manav Bansal', 'manav.bansal.cse4@example.com', 'CSE', 4),
  ('26611B01', 'Harsha Vardhan', 'harsha.vardhan.ece1@example.com', 'ECE', 1),
  ('26611B02', 'Siri Chand', 'siri.chand.ece1@example.com', 'ECE', 1),
  ('26611B03', 'Yashwanth Sai', 'yashwanth.sai.ece1@example.com', 'ECE', 1),
  ('26611B04', 'Keerthana Devi', 'keerthana.devi.ece1@example.com', 'ECE', 1),
  ('26611B05', 'Pranav Teja', 'pranav.teja.ece1@example.com', 'ECE', 1),
  ('25612B01', 'Rithvik Raju', 'rithvik.raju.ece2@example.com', 'ECE', 2),
  ('25612B02', 'Anjali Sree', 'anjali.sree.ece2@example.com', 'ECE', 2),
  ('25612B03', 'Nikhil Reddy', 'nikhil.reddy.ece2@example.com', 'ECE', 2),
  ('25612B04', 'Harini Lakshmi', 'harini.lakshmi.ece2@example.com', 'ECE', 2),
  ('25612B05', 'Varun Krishna', 'varun.krishna.ece2@example.com', 'ECE', 2),
  ('24613B01', 'Srinivas Naidu', 'srinivas.naidu.ece3@example.com', 'ECE', 3),
  ('24613B02', 'Bhavya Sri', 'bhavya.sri.ece3@example.com', 'ECE', 3),
  ('24613B03', 'Lokesh Kumar', 'lokesh.kumar.ece3@example.com', 'ECE', 3),
  ('24613B04', 'Deepika Rao', 'deepika.rao.ece3@example.com', 'ECE', 3),
  ('24613B05', 'Charan Kumar', 'charan.kumar.ece3@example.com', 'ECE', 3),
  ('23614B01', 'Vignesh Babu', 'vignesh.babu.ece4@example.com', 'ECE', 4),
  ('23614B02', 'Swathi Priya', 'swathi.priya.ece4@example.com', 'ECE', 4),
  ('23614B03', 'Akshay Raj', 'akshay.raj.ece4@example.com', 'ECE', 4),
  ('23614B04', 'Madhuri Rani', 'madhuri.rani.ece4@example.com', 'ECE', 4),
  ('23614B05', 'Surya Prakash', 'surya.prakash.ece4@example.com', 'ECE', 4)
on conflict (id) do nothing;

insert into student_id_counters(prefix, last_value) values
  ('26611A', 5), ('25612A', 5), ('24613A', 5), ('23614A', 5),
  ('26611B', 5), ('25612B', 5), ('24613B', 5), ('23614B', 5)
on conflict (prefix) do update set last_value = greatest(student_id_counters.last_value, excluded.last_value);

-- Academic calendar shared by administrators, teachers and students.
-- The app uses its existing custom role login, so UI permissions enforce which
-- event controls each role receives while RLS protects the exposed table.
create table if not exists academic_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  kind text not null check (kind in (
    'Holiday', 'Exam', 'Semester Date', 'College Event', 'Department Event',
    'Deadline', 'Parent-Teacher Meeting', 'Extra Class', 'Seminar',
    'Guest Lecture', 'Project Presentation', 'Meeting'
  )),
  event_type text not null check (event_type in ('Holiday', 'Exam', 'Academic Event', 'Important Date')),
  start_date date not null,
  end_date date not null,
  start_time time,
  venue text,
  department text check (department is null or department in ('CSE', 'ECE')),
  year integer check (year is null or year between 1 and 4),
  section text,
  description text,
  creator_role text not null check (creator_role in ('admin', 'teacher')),
  creator_id text not null,
  created_at timestamptz not null default now(),
  constraint academic_events_date_order check (end_date >= start_date),
  constraint teacher_event_kind check (
    creator_role = 'admin' or kind in ('Extra Class', 'Seminar', 'Guest Lecture', 'Project Presentation', 'Meeting')
  )
);

create index if not exists academic_events_dates_idx on academic_events(start_date, end_date);
create index if not exists academic_events_audience_idx on academic_events(department, year, section);

-- Aggregate-only attendance feed for the admin dashboard. It exposes counts,
-- not individual attendance records, and supports branch/year filtering.
create or replace function public.dashboard_attendance_summary(p_date date)
returns table(department text, year integer, present_count bigint, absent_count bigint, recorded_count bigint)
language sql stable security definer set search_path = public as $$
  select s.department, s.year,
    count(*) filter (where ar.present) as present_count,
    count(*) filter (where not ar.present) as absent_count,
    count(*) as recorded_count
  from public.attendance_records ar
  join public.students s on s.id = ar.student_id
  where ar.attendance_date = p_date
  group by s.department, s.year
  order by s.department, s.year;
$$;
revoke all on function public.dashboard_attendance_summary(date) from public;
grant execute on function public.dashboard_attendance_summary(date) to anon, authenticated;

create or replace function public.dashboard_latest_attendance_summary()
returns table(recorded_date date, department text, year integer, present_count bigint, absent_count bigint, recorded_count bigint)
language sql stable security definer set search_path = public as $$
  with latest as (select max(attendance_date) as attendance_date from public.attendance_records)
  select latest.attendance_date, s.department, s.year,
    count(*) filter (where ar.present),
    count(*) filter (where not ar.present),
    count(*)
  from latest
  join public.attendance_records ar on ar.attendance_date = latest.attendance_date
  join public.students s on s.id = ar.student_id
  group by latest.attendance_date, s.department, s.year
  order by s.department, s.year;
$$;
revoke all on function public.dashboard_latest_attendance_summary() from public;
grant execute on function public.dashboard_latest_attendance_summary() to anon, authenticated;

create or replace function public.dashboard_latest_attendance_summary(p_department text,p_year integer)
returns table(recorded_date date,department text,year integer,present_count bigint,absent_count bigint,recorded_count bigint)
language sql stable security definer set search_path=public as $$
  with latest as(select max(attendance_date) attendance_date from public.attendance_records)
  select latest.attendance_date,s.department,s.year,count(*) filter(where ar.present),count(*) filter(where not ar.present),count(*)
  from latest join public.attendance_records ar on ar.attendance_date=latest.attendance_date
  join public.students s on s.id=ar.student_id
  where (p_department is null or s.department=p_department) and (p_year is null or s.year=p_year)
  group by latest.attendance_date,s.department,s.year order by s.department,s.year;
$$;
revoke all on function public.dashboard_latest_attendance_summary(text,integer) from public;
grant execute on function public.dashboard_latest_attendance_summary(text,integer) to anon,authenticated;

create or replace function public.student_subject_faculty(p_student_id text)
returns table(subject_code text, subject_name text, faculty_id text, faculty_name text)
language sql stable security definer set search_path = public as $$
  select sub.code, sub.name, t.id, t.name
  from public.students s
  join public.subjects sub on sub.department=s.department and sub.year=s.year
  left join public.teacher_subjects ts on ts.subject_code=sub.code
  left join public.teachers t on t.id=ts.teacher_id and t.is_active
  where s.id=p_student_id and s.is_active
  order by sub.name;
$$;
revoke all on function public.student_subject_faculty(text) from public;
grant execute on function public.student_subject_faculty(text) to anon, authenticated;

-- Attendance is stored and student totals are updated atomically. Official
-- Admin holidays are rejected in the database as well as in the interface.
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
  select count(*) into v_expected from public.students s join public.subjects sub on sub.department=s.department and sub.year=s.year where sub.code=p_subject_code and s.is_active;
  select count(distinct item->>'student_id') into v_supplied from jsonb_array_elements(p_attendance) item where item?'student_id' and item?'present' and jsonb_typeof(item->'present')='boolean';
  if v_expected=0 or v_supplied<>v_expected then raise exception 'Mark every student present or absent before saving'; end if;
  for v_item in select value from jsonb_array_elements(p_attendance) loop
    v_student_id:=v_item->>'student_id'; v_present:=(v_item->>'present')::boolean;
    if not exists(select 1 from public.students s join public.subjects sub on sub.department=s.department and sub.year=s.year where sub.code=p_subject_code and s.id=v_student_id and s.is_active) then raise exception 'Student % is not in this assigned subject class',v_student_id; end if;
    insert into public.attendance_records(teacher_id,subject_code,student_id,attendance_date,present) values(p_teacher_id,p_subject_code,v_student_id,p_date,v_present);
    update public.students s set total_classes=s.total_classes+1,attended_classes=s.attended_classes+(case when v_present then 1 else 0 end) where s.id=v_student_id;
  end loop;
  return query select s.id,s.attended_classes,s.total_classes from public.students s where s.id in(select item->>'student_id' from jsonb_array_elements(p_attendance) item);
end $$;
revoke all on function public.save_subject_attendance(text,text,date,jsonb) from public;
grant execute on function public.save_subject_attendance(text,text,date,jsonb) to anon,authenticated;
alter table academic_events enable row level security;

drop policy if exists "Calendar events are readable" on academic_events;
create policy "Calendar events are readable" on academic_events for select to anon, authenticated using (true);
drop policy if exists "Calendar events can be created" on academic_events;
create policy "Calendar events can be created" on academic_events for insert to anon, authenticated with check (creator_role = 'admin');
drop policy if exists "Calendar events can be updated" on academic_events;
create policy "Calendar events can be updated" on academic_events for update to anon, authenticated using (creator_role = 'admin') with check (creator_role = 'admin');
drop policy if exists "Calendar events can be deleted" on academic_events;
create policy "Calendar events can be deleted" on academic_events for delete to anon, authenticated using (creator_role = 'admin');

revoke all on table academic_events from anon, authenticated;
grant select, insert, update, delete on table academic_events to anon, authenticated;
