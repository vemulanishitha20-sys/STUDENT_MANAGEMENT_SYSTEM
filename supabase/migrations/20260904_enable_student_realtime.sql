-- Keep the student list, details modal, attendance cards and <75% count in
-- sync when attendance totals are recalculated by the database trigger.
do $$
begin
  alter publication supabase_realtime add table public.students;
exception
  when duplicate_object then null;
end $$;
