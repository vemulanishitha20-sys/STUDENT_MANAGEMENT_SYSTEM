import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { supabase } from "../lib/data";

const STORE = "campus-academic-events";
const colors = {
  Holiday: "bg-emerald-500",
  Exam: "bg-blue-500",
  "Academic Event": "bg-violet-500",
  "Important Date": "bg-orange-500",
};
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(STORE) || "[]"); }
  catch { return []; }
};

export default function UpcomingEvents({ role, session, onViewAll }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return setEvents(readLocal());
      const { data, error } = await supabase
        .from("academic_events")
        .select("*")
        .order("start_date")
        .limit(20);
      setEvents(error ? readLocal() : data || []);
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const upcoming = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return events
      .filter((event) => event.end_date >= today)
      .filter((event) => {
        if (!event.department) return true;
        if (role === "student")
          return event.department === session?.department &&
            (!event.year || Number(event.year) === Number(session?.year));
        if (event.creator_role === "teacher" && event.creator_id === session?.id)
          return true;
        return (session?.teacher_subjects || []).some(
          ({ subjects }) => subjects?.department === event.department &&
            (!event.year || Number(subjects.year) === Number(event.year)),
        );
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 4);
  }, [events, role, session]);

  return (
    <article className="relative mt-5 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/50 to-purple-100/50 p-5 shadow-[0_16px_40px_rgba(109,76,216,0.10)] dark:border-violet-800 dark:from-slate-800 dark:via-slate-800 dark:to-violet-950 sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-campus text-white shadow-md shadow-violet-300/40 dark:shadow-none"><CalendarDays size={21} /></span>
          <div>
          <h2 className="text-xl">Upcoming Events</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">Next on your academic calendar</p>
          </div>
        </div>
        <button onClick={onViewAll} className="inline-flex items-center gap-1 text-sm font-bold text-violet-600 dark:text-violet-300">
          View calendar <ChevronRight size={17} />
        </button>
      </div>
      {upcoming.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {upcoming.map((event) => (
            <button key={event.id} onClick={onViewAll} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-700 dark:hover:bg-slate-700/40">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${colors[event.event_type] || "bg-violet-500"}`}><CalendarDays size={19} /></span>
              <span className="min-w-0"><b className="block truncate">{event.title}</b><small className="mt-1 block text-slate-500 dark:text-slate-300">{new Date(`${event.start_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</small></span>
            </button>
          ))}
        </div>
      ) : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300">No upcoming events.</p>}
    </article>
  );
}
