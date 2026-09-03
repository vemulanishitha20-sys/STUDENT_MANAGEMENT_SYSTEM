import { useEffect, useState } from "react";
import { Check, LogOut, X } from "lucide-react";
import Brand from "../shared/Brand";
import { supabase } from "../../lib/data";
import Toast from "../shared/Toast";
const percent = (s) =>
  s.total_classes
    ? Math.round((s.attended_classes / s.total_classes) * 100)
    : 0;
export default function MemberHome({ session, logout }) {
  const [students, setStudents] = useState([]),
    [assignments, setAssignments] = useState([]),
    [studentSelf, setStudentSelf] = useState(session),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (session.role === "teacher" && supabase) {
      supabase
        .rpc("teacher_attendance_students", { p_teacher_id: session.id })
        .then(({ data, error }) => {
          setStudents(data || []);
          if (error) setMessage(error.message);
        });
      supabase
        .from("teacher_subjects")
        .select("subjects(code,name,department,year)")
        .eq("teacher_id", session.id)
        .then(({ data }) =>
          setAssignments(
            data?.map((item) => item.subjects).filter(Boolean) || [],
          ),
        );
    }
    if (session.role === "student" && supabase)
      supabase
        .from("students")
        .select("*")
        .eq("id", session.id)
        .single()
        .then(({ data }) => data && setStudentSelf(data));
  }, [session]);
  const mark = async (student, present) => {
    const { data, error } = await supabase.rpc("mark_student_attendance", {
      p_teacher_id: session.id,
      p_student_id: student.id,
      p_present: present,
    });
    if (error) return setMessage(error.message);
    setStudents((rows) =>
      rows.map((row) => (row.id === student.id ? { ...row, ...data[0] } : row)),
    );
    setMessage(`${student.name} marked ${present ? "present" : "absent"}`);
  };
  if (session.role === "teacher")
    return (
      <div className="min-h-screen bg-[#fbfaf7] p-4 dark:bg-slate-950 dark:text-white sm:p-7">
        <header className="mx-auto flex max-w-6xl items-center justify-between">
          <Brand />
          <button
            className="flex items-center gap-2 rounded-xl border px-4 py-2"
            onClick={logout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </header>
        <main className="mx-auto mt-8 max-w-6xl">
          <h1 className="text-3xl">Attendance register</h1>
          <p className="text-slate-500">
            Only students from your assigned subject branches and years are
            shown.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {assignments.map((subject) => (
              <span
                key={subject.code}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800 dark:bg-blue-400 dark:text-slate-950"
              >
                {subject.name} · {subject.department} · Year {subject.year}
              </span>
            ))}
          </div>
          <Toast message={message} onClose={() => setMessage("")} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <article
                key={student.id}
                className="rounded-2xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <b>{student.name}</b>
                    <small className="block text-slate-500 dark:text-sky-200">
                      {student.id} · {student.department} Y{student.year}
                    </small>
                  </div>
                  <span
                    className={`font-bold ${percent(student) < 75 ? "text-red-500" : "text-emerald-600"}`}
                  >
                    {percent(student)}%
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-100 py-2 font-bold text-emerald-700"
                    onClick={() => mark(student, true)}
                  >
                    <Check size={17} />
                    Present
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 rounded-lg bg-red-100 py-2 font-bold text-red-600"
                    onClick={() => mark(student, false)}
                  >
                    <X size={17} />
                    Absent
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!students.length && !message && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center font-semibold text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
              No active students match your assigned branches and years.
            </div>
          )}
        </main>
      </div>
    );
  const attendance = percent(studentSelf);
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-orange-50 to-violet-100 p-5">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
        <Brand />
        <div className="my-6 text-7xl">🎓</div>
        <h1 className="break-words text-4xl">Hello, {session.name}!</h1>
        <p
          className={`mt-4 text-3xl font-bold ${attendance < 75 ? "text-red-500" : "text-emerald-600"}`}
        >
          {attendance}% attendance
        </p>
        <button
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-campus py-3 font-bold text-white"
          onClick={logout}
        >
          <LogOut size={19} />
          Sign out
        </button>
      </div>
    </div>
  );
}
