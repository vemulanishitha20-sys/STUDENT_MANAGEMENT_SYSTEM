import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "../lib/data";
import Toast from "./Toast";

const STORE = "campus-academic-events";
const TYPES = ["Holiday", "Exam", "Academic Event", "Important Date"];
const ADMIN_KINDS = ["Holiday", "Exam", "Semester Date", "College Event", "Department Event", "Deadline", "Parent-Teacher Meeting"];
const TEACHER_KINDS = [];
const COLORS = {
  Holiday: "bg-emerald-500",
  Exam: "bg-blue-500",
  "Academic Event": "bg-violet-500",
  "Important Date": "bg-orange-500",
};
const styleFor = (type) => COLORS[type] || COLORS["Academic Event"];
const categoryFor = (kind) => kind === "Holiday" ? "Holiday" : kind === "Exam" ? "Exam" : ["Deadline", "Semester Date", "Parent-Teacher Meeting"].includes(kind) ? "Important Date" : "Academic Event";
const emptyForm = { title: "", kind: "College Event", start_date: "", end_date: "", department: "", year: "", description: "" };
const readLocal = () => { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; } };

export default function AcademicCalendar({ role, session }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [remoteAvailable, setRemoteAvailable] = useState(true);
  const canCreate = role === "admin";

  useEffect(() => {
    if (editing === undefined) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [editing]);

  const load = async () => {
    if (!supabase) return setEvents(readLocal());
    const { data, error } = await supabase.from("academic_events").select("*").order("start_date").order("start_time");
    if (error) { setRemoteAvailable(false); setEvents(readLocal()); }
    else { setRemoteAvailable(true); setEvents(data || []); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => events.filter((event) => {
    if (role === "admin") return true;
    if (role === "teacher") {
      if (!event.department || (event.creator_role === "teacher" && event.creator_id === session?.id)) return true;
      return (session?.teacher_subjects || []).some(({ subjects }) => subjects?.department === event.department && (!event.year || Number(subjects.year) === Number(event.year)));
    }
    return (!event.department || event.department === session?.department) && (!event.year || Number(event.year) === Number(session?.year));
  }), [events, role, session]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay.getDay() + 1;
    return new Date(month.getFullYear(), month.getMonth(), day);
  });
  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = iso(new Date());
  const monthEnd = iso(lastDay);
  const upcoming = visible.filter((event) => event.end_date >= today).slice(0, 5);
  const canManage = () => role === "admin";

  const openForm = (event = null) => {
    setEditing(event);
    setForm(event ? { ...event, year: event.year || "", department: event.department || "" } : { ...emptyForm, kind: ADMIN_KINDS[0], start_date: today, end_date: today, department: "" });
  };
  const saveEvent = async (event) => {
    event.preventDefault();
    const payload = { ...form, start_time: null, venue: null, section: null, end_date: form.end_date || form.start_date, event_type: categoryFor(form.kind), department: form.department || null, year: form.year ? Number(form.year) : null, creator_role: editing?.creator_role || role, creator_id: editing?.creator_id || session?.id || "ADMIN001" };
    let saved = { ...payload, id: editing?.id || crypto.randomUUID(), created_at: editing?.created_at || new Date().toISOString() };
    if (supabase && remoteAvailable) {
      const query = editing ? supabase.from("academic_events").update(payload).eq("id", editing.id) : supabase.from("academic_events").insert(saved);
      const { data, error } = await query.select().single();
      if (error) return setMessage(error.message);
      saved = data;
    }
    const next = editing ? events.map((item) => item.id === editing.id ? saved : item) : [...events, saved].sort((a, b) => a.start_date.localeCompare(b.start_date));
    setEvents(next); localStorage.setItem(STORE, JSON.stringify(next)); setEditing(undefined); setMessage(editing ? "Event updated." : "Event added.");
  };
  const remove = async (event) => {
    if (!confirm(`Delete “${event.title}”?`)) return;
    if (supabase && remoteAvailable) { const { error } = await supabase.from("academic_events").delete().eq("id", event.id); if (error) return setMessage(error.message); }
    const next = events.filter((item) => item.id !== event.id); setEvents(next); localStorage.setItem(STORE, JSON.stringify(next)); setSelected(null); setMessage("Event deleted.");
  };

  return (
    <section data-academic-calendar className="mx-auto mt-5 grid w-full max-w-5xl gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div />
          {canCreate && <button onClick={() => openForm()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-campus px-5 font-bold text-white shadow-sm"><Plus size={18} /> Add event</button>}
        </div>
        <Toast message={message} onClose={() => setMessage("")} />
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">{TYPES.map((type) => <span key={type} className="flex items-center gap-2"><i className={`size-2.5 rounded-full ${styleFor(type)}`} />{type}</span>)}</div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-xl border border-slate-200 p-2 hover:bg-violet-50 dark:border-slate-600"><ChevronLeft /></button>
            <h3 className="text-xl">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-xl border border-slate-200 p-2 hover:bg-violet-50 dark:border-slate-600"><ChevronRight /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div key={day} className="py-3">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {cells.map((date) => {
              const key = iso(date); const dayEvents = visible.filter((event) => event.start_date <= key && event.end_date >= key); const current = date.getMonth() === month.getMonth();
              return <div key={key} className="h-16 overflow-hidden border-b border-r border-slate-100 p-1 dark:border-slate-700 sm:h-20 sm:p-1.5">
                <span className={`grid size-7 place-items-center rounded-full text-sm ${key === today ? "bg-campus font-bold text-white" : current ? "" : "text-slate-300 dark:text-slate-600"}`}>{date.getDate()}</span>
                <div className="mt-1 space-y-1">{dayEvents.slice(0, 3).map((event) => <button key={event.id} onClick={() => setSelected(event)} className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-semibold text-white sm:text-xs ${styleFor(event.event_type)}`}>{event.title}</button>)}{dayEvents.length > 3 && <span className="block text-[10px] font-bold text-slate-500">+{dayEvents.length - 3} more</span>}</div>
              </div>;
            })}
          </div>
        </div>
      </div>
      <aside className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/60 to-purple-100/60 p-5 shadow-[0_16px_40px_rgba(109,76,216,0.12)] dark:border-violet-800 dark:from-slate-800 dark:via-slate-800 dark:to-violet-950 xl:mt-[4.25rem]">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-violet-300/20 blur-2xl" />
        <div className="relative flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-campus text-white shadow-md shadow-violet-300/40 dark:shadow-none"><CalendarDays size={20} /></span><div><h3 className="text-xl">Upcoming Events</h3><p className="text-sm text-slate-500 dark:text-slate-300">Next on your calendar</p></div></div>
        <div className="mt-5 space-y-3">{upcoming.map((event) => <button key={event.id} onClick={() => setSelected(event)} className="flex w-full gap-3 rounded-xl border border-slate-100 p-3 text-left hover:border-violet-300 dark:border-slate-700"><i className={`mt-1 size-2.5 shrink-0 rounded-full ${styleFor(event.event_type)}`} /><span className="min-w-0"><b className="block truncate text-sm">{event.title}</b><small className="text-slate-500 dark:text-slate-300">{new Date(`${event.start_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span></button>)}{!upcoming.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-900">No upcoming events.</p>}</div>
      </aside>
      {selected && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4"><div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800"><button onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-lg p-2"><X /></button><span className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${styleFor(selected.event_type)}`}>{selected.kind}</span><h2 className="mt-4 pr-10 text-2xl">{selected.title}</h2><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p><CalendarDays className="mr-2 inline text-violet-500" size={18} />{new Date(`${selected.start_date}T00:00:00`).toLocaleDateString("en-GB")}{selected.end_date !== selected.start_date ? ` – ${new Date(`${selected.end_date}T00:00:00`).toLocaleDateString("en-GB")}` : ""}</p><p>{selected.department || "All departments"}{selected.year ? ` · Year ${selected.year}` : ""}{selected.section ? ` · Section ${selected.section}` : ""}</p></div>{selected.description && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-600 dark:bg-slate-900 dark:text-slate-200">{selected.description}</p>}{canManage(selected) && <div className="mt-6 flex gap-3"><button onClick={() => { setSelected(null); openForm(selected); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-4 py-2 font-bold text-violet-700"><Pencil size={17} /> Edit</button><button onClick={() => remove(selected)} className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 font-bold text-red-700"><Trash2 size={17} /> Delete</button></div>}</div></div>}
      {editing !== undefined && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4"><form onSubmit={saveEvent} className="relative my-4 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800"><button type="button" onClick={() => setEditing(undefined)} className="absolute right-4 top-4 rounded-lg p-2"><X /></button><h2 className="text-2xl">{editing?.id ? "Edit event" : "Add event"}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2">Event name<input required value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="sm:col-span-2">Event type<select value={form.kind} onChange={(e) => setForm({...form,kind:e.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3">{(role === "admin" ? ADMIN_KINDS : TEACHER_KINDS).map((kind) => <option key={kind}>{kind}</option>)}</select></label><label>Start date<input required type="date" value={form.start_date} onChange={(e) => setForm({...form,start_date:e.target.value,end_date:form.end_date < e.target.value ? e.target.value : form.end_date})} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label>End date<input required type="date" min={form.start_date} value={form.end_date} onChange={(e) => setForm({...form,end_date:e.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label>Department<select value={form.department || ""} onChange={(e) => setForm({...form,department:e.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">All departments</option><option>CSE</option><option>ECE</option></select></label><label>Year<select value={form.year || ""} onChange={(e) => setForm({...form,year:e.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">All years</option>{[1,2,3,4].map((year) => <option key={year}>{year}</option>)}</select></label><label className="sm:col-span-2">Section<input value={form.section || ""} onChange={(e) => setForm({...form,section:e.target.value})} placeholder="All sections" className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="sm:col-span-2">Description<textarea rows="3" value={form.description || ""} onChange={(e) => setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-xl border p-3" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl border px-5 py-3 font-bold">Cancel</button><button className="rounded-xl bg-campus px-5 py-3 font-bold text-white">Save event</button></div></form></div>}
    </section>
  );
}
