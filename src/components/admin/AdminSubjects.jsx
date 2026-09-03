import { useEffect, useMemo, useState } from "react";
import { BookOpen, UserRound } from "lucide-react";
import { supabase } from "../../lib/data";
import Toast from "../shared/Toast";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("subjects").select("code,name,department,year,teacher_subjects(teachers(id,name))").order("department").order("year").order("name");
      setSubjects(data || []);
      if (error) setMessage(error.message);
      setLoading(false);
    };
    if (supabase) load();
  }, []);

  const departments = useMemo(() => [...new Set(subjects.map((item) => item.department))].sort(), [subjects]);
  const years = useMemo(() => [...new Set(subjects.map((item) => Number(item.year)))].sort((a, b) => a - b), [subjects]);
  const visible = subjects.filter((item) => (!department || item.department === department) && (!year || Number(item.year) === Number(year)));

  return <section><Toast message={message} tone="error" onClose={() => setMessage("")} /><div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="mr-auto"><h2 className="text-xl">Subject directory</h2><p className="text-sm text-slate-500 dark:text-slate-300">View subjects and their assigned faculty.</p></div><label className="text-sm font-semibold">Branch<select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-1 block h-11 min-w-36 rounded-xl border bg-white px-3 dark:border-slate-600 dark:bg-slate-900"><option value="">All branches</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-semibold">Year<select value={year} onChange={(event) => setYear(event.target.value)} className="mt-1 block h-11 min-w-32 rounded-xl border bg-white px-3 dark:border-slate-600 dark:bg-slate-900"><option value="">All years</option>{years.map((item) => <option key={item} value={item}>Year {item}</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => { const faculty = item.teacher_subjects?.[0]?.teachers; return <article key={item.code} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><BookOpen /></span><h3 className="mt-4 text-xl">{item.name}</h3><p className="font-mono text-sm font-semibold text-violet-600 dark:text-violet-300">{item.code}</p><div className="mt-3 flex gap-2"><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">{item.department}</span><span className="rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">Year {item.year}</span></div><div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><UserRound size={19} className="text-violet-500" /><div><small className="block text-slate-500">Faculty</small><b>{faculty?.name || "Not assigned"}</b>{faculty?.id && <small className="ml-2 text-slate-400">{faculty.id}</small>}</div></div></article>; })}{!loading && !visible.length && <p className="rounded-2xl border border-dashed p-8 text-center text-slate-500 sm:col-span-2 xl:col-span-3">No subjects match these filters.</p>}</div></section>;
}
