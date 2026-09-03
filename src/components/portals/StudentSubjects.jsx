import { useEffect, useState } from "react";
import { BookOpen, UserRound } from "lucide-react";
import { supabase } from "../../lib/data";
import Toast from "../shared/Toast";

export default function StudentSubjects({ student }) {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [message, setMessage] = useState("");
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("student_subject_faculty", { p_student_id: student.id });
      setItems(data || []); if (error) setMessage(error.message); setLoading(false);
    };
    if (supabase) load();
  }, [student.id]);
  return <section className="mt-5"><Toast message={message} tone="error" onClose={() => setMessage("")} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.subject_code} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200"><BookOpen size={21} /></span><h3 className="mt-4 text-xl">{item.subject_name}</h3><p className="mt-1 font-mono text-sm font-semibold text-violet-600 dark:text-violet-300">{item.subject_code}</p><div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><span className="grid size-9 place-items-center rounded-full bg-white text-slate-500 dark:bg-slate-700"><UserRound size={18} /></span><span><small className="block text-slate-500 dark:text-slate-300">Faculty</small><b>{item.faculty_name || "Not assigned"}</b>{item.faculty_id && <small className="ml-2 text-slate-400">{item.faculty_id}</small>}</span></div></article>)}{!loading && !items.length && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 sm:col-span-2 xl:col-span-3">No subjects are assigned for this branch and year.</p>}</div></section>;
}
