import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, Check, Search, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import AttendanceCalendar from "./AttendanceCalendar";
import { supabase } from "../lib/data";

export default function AdminAttendance({ teachers, students }) {
  const [teacher, setTeacher] = useState(null);
  const [subject, setSubject] = useState(null);
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState({});
  const [draft, setDraft] = useState({});
  const [locked, setLocked] = useState(false);
  const [markedDates, setMarkedDates] = useState([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  const assignments = useMemo(
    () => teacher?.teacher_subjects?.map((item) => item.subjects).filter(Boolean) || [],
    [teacher],
  );
  const classStudents = useMemo(
    () => students
      .filter((student) => subject && student.is_active !== false && student.department === subject.department && Number(student.year) === Number(subject.year))
      .filter((student) => `${student.id} ${student.name}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    [students, subject, query],
  );

  useEffect(() => {
    if (!teacher || !subject || !supabase) {
      setSaved({});
      setDraft({});
      setLocked(false);
      setMarkedDates([]);
      return;
    }
    Promise.all([
      supabase.rpc("get_subject_attendance", { p_teacher_id: teacher.id, p_subject_code: subject.code, p_date: date }),
      supabase.rpc("get_subject_attendance_dates", { p_teacher_id: teacher.id, p_subject_code: subject.code }),
    ]).then(([dayResult, datesResult]) => {
      const error = dayResult.error || datesResult.error;
      if (error) return setMessage(error.message);
      const values = Object.fromEntries((dayResult.data || []).map((row) => [row.student_id, row.present]));
      setSaved(values);
      setDraft(values);
      const attendanceDates = (datesResult.data || []).map((row) => row.attendance_date);
      setMarkedDates(attendanceDates);
      setLocked(attendanceDates.includes(date));
    });
  }, [teacher, subject, date]);

  const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
  const isFuture = date > new Date().toLocaleDateString("en-CA");
  const allMarked = classStudents.length > 0 && classStudents.every((student) => draft[student.id] !== undefined);
  const changed = classStudents.some((student) => draft[student.id] !== undefined && draft[student.id] !== saved[student.id]);

  const chooseTeacher = (nextTeacher) => {
    setTeacher(nextTeacher);
    setSubject(null);
    setQuery("");
  };
  const mark = (id, present) => {
    if (isSunday || isFuture || locked) return;
    setDraft((current) => ({ ...current, [id]: present }));
  };
  const markAllPresent = () => {
    if (isSunday || isFuture || locked) return;
    setDraft((current) => ({ ...current, ...Object.fromEntries(classStudents.map((student) => [student.id, true])) }));
  };
  const save = async () => {
    setConfirming(false);
    if (!supabase || !allMarked || isSunday || isFuture || locked) return;
    setSaving(true);
    const { error } = await supabase.rpc("save_subject_attendance", {
      p_teacher_id: teacher.id,
      p_subject_code: subject.code,
      p_date: date,
      p_attendance: classStudents.map((student) => ({ student_id: student.id, present: draft[student.id] })),
    });
    setSaving(false);
    if (error) return setMessage(error.message);
    setSaved(draft);
    setLocked(true);
    setMessage("Attendance saved successfully");
  };

  return (
    <section>
      {message && <button type="button" onClick={() => setMessage("")} className="mb-4 w-full rounded-xl bg-slate-800 px-4 py-3 text-center font-semibold text-white">{message}</button>}
      {!teacher ? (
        <>
          <h2 className="mb-5 text-2xl">Choose a teacher</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teachers.filter((item) => item.is_active !== false).map((item) => (
              <button key={item.id} onClick={() => chooseTeacher(item)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200"><BookOpen /></span>
                <h3 className="mt-4 text-xl">{item.name}</h3>
                <p className="mt-1 font-mono text-sm text-violet-600 dark:text-violet-300">{item.id}</p>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{item.teacher_subjects?.length || 0} assigned subjects</p>
              </button>
            ))}
          </div>
        </>
      ) : !subject ? (
        <>
          <button onClick={() => setTeacher(null)} className="mb-4 flex items-center gap-2 font-bold text-violet-700 dark:text-violet-200"><ArrowLeft size={18} /> Choose another teacher</button>
          <h2 className="mb-5 text-2xl">Choose a subject assigned to {teacher.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assignments.map((item) => (
              <button key={item.code} onClick={() => setSubject(item)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200"><BookOpen /></span>
                <h3 className="mt-4 text-xl">{item.name}</h3>
                <p className="mt-1 font-mono text-sm text-violet-600 dark:text-violet-300">{item.code}</p>
                <p className="mt-3 font-semibold">{item.department} · Year {item.year}</p>
              </button>
            ))}
            {!assignments.length && <p className="text-slate-500">This teacher has no assigned subjects.</p>}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
            <button onClick={() => setSubject(null)} className="flex items-center gap-2 font-bold text-violet-700 dark:text-violet-200"><ArrowLeft size={18} /> Choose another subject</button>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div><h2 className="text-2xl">{subject.name}</h2><p className="font-semibold text-violet-700 dark:text-violet-200">{teacher.name} · {subject.code} · {subject.department} · Year {subject.year}</p></div>
              <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                <div className="relative">
                  <button type="button" onClick={() => setCalendarOpen((open) => !open)} className="flex h-11 w-full items-center gap-3 rounded-xl border border-violet-200 bg-white px-3 font-semibold dark:border-violet-700 dark:bg-slate-900">
                    <CalendarDays className="text-violet-500" size={18} />
                    {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB")}
                  </button>
                  {calendarOpen && (
                    <div className="absolute right-0 top-12 z-30">
                      <AttendanceCalendar
                        value={date}
                        onChange={(nextDate) => {
                          setDate(nextDate);
                              setCalendarOpen(false);
                            }}
                            markedDates={markedDates}
                            onClose={() => setCalendarOpen(false)}
                          />
                    </div>
                  )}
                </div>
                <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this class..." className="h-11 w-full rounded-xl border border-violet-200 bg-white pl-10 pr-3 dark:border-violet-700 dark:bg-slate-900" /></label>
              </div>
            </div>
          </div>
          {(isSunday || isFuture) && <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-center font-bold text-red-700">Attendance cannot be marked for this date.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500 dark:text-slate-300">Mark everyone present, then change individual students to absent if required.</p><button type="button" onClick={markAllPresent} disabled={!classStudents.length || isSunday || isFuture || locked} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Check size={17} /> Mark all present</button></div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="hidden grid-cols-[150px_1fr_120px_120px] gap-3 bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-500 dark:bg-slate-900 md:grid"><span>Campus ID</span><span>Name</span><span className="text-center">Present</span><span className="text-center">Absent</span></div>
            {classStudents.map((student) => (
              <div key={student.id} className="grid gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-700 md:grid-cols-[150px_1fr_120px_120px] md:items-center">
                <span className="font-mono text-sm font-semibold text-violet-600">{student.id}</span><b>{student.name}</b>
                <button onClick={() => mark(student.id, true)} disabled={isSunday || isFuture || locked} className={`flex justify-center gap-1 rounded-xl py-2.5 font-bold disabled:opacity-40 ${draft[student.id] === true ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}`}><Check size={18} /> Present</button>
                <button onClick={() => mark(student.id, false)} disabled={isSunday || isFuture || locked} className={`flex justify-center gap-1 rounded-xl py-2.5 font-bold disabled:opacity-40 ${draft[student.id] === false ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}><X size={18} /> Absent</button>
              </div>
            ))}
          </div>
          <div className="sticky bottom-4 mt-4 flex justify-center"><button onClick={() => setConfirming(true)} disabled={saving || !allMarked || !changed || isSunday || isFuture || locked} className="rounded-xl bg-campus px-8 py-3 font-bold text-white shadow-xl disabled:opacity-60">{locked ? "Attendance saved" : saving ? "Saving..." : "Save attendance"}</button></div>
        </>
      )}
      {confirming && <ConfirmDialog title="Save attendance?" message="Do you want to save attendance for" highlight={new Date(`${date}T00:00:00`).toLocaleDateString("en-GB")} messageAfter="Attendance cannot be changed after saving." confirmLabel="Yes, save" tone="primary" onConfirm={save} onCancel={() => setConfirming(false)} />}
    </section>
  );
}
