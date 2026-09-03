import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import Brand from "../shared/Brand";
import { supabase } from "../../lib/data";
import AnnouncementCenter, { loadAnnouncements } from "../features/AnnouncementCenter";
import Schedule from "../features/Schedule";
import AcademicCalendar from "../features/AcademicCalendar";
import UpcomingEvents from "../features/UpcomingEvents";
import PageIntro from "../shared/PageIntro";
import ProfileMenu from "../shared/ProfileMenu";
import StudentSubjects from "./StudentSubjects";
import Toast from "../shared/Toast";

const percentage = (attended, total) =>
  total ? Math.round((Number(attended) / Number(total)) * 100) : 0;

function AttendanceDonut({ value }) {
  const good = value >= 75;
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <article className="flex flex-col items-center">
      <div className="relative size-40 sm:size-44">
        <div className={"absolute inset-3 rounded-full blur-2xl " + (good ? "bg-emerald-300/25" : "bg-red-300/25")} />
        <svg
          className="relative -rotate-90 drop-shadow-sm"
          viewBox="0 0 160 160"
          role="img"
          aria-label={"Overall attendance " + safeValue + "%"}
        >
          <defs>
            <linearGradient id="attendance-good" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="attendance-low" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-100 dark:text-slate-700" />
          <circle
            cx="80"
            cy="80"
            r="62"
            fill="none"
            stroke={good ? "url(#attendance-good)" : "url(#attendance-low)"}
            strokeWidth="14"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${safeValue} 100`}
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <strong className={"font-display text-4xl leading-none " + (good ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300")}>
            {safeValue}%
          </strong>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Present
          </span>
        </div>
      </div>
      <p className={"mt-3 rounded-lg px-4 py-2 text-xs font-bold " + (good ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200")}>
        {good ? "Attendance requirement met" : "Below 75% attendance"}
      </p>
    </article>
  );
}

export default function StudentPortal({ session, logout }) {
  const [page, setPage] = useState("dashboard");
  const [student, setStudent] = useState(session);
  const [subjects, setSubjects] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(false);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const load = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      const [studentResult, subjectResult] = await Promise.all([
        supabase.from("students").select("*").eq("id", session.id).single(),
        supabase.rpc("student_subject_attendance", {
          p_student_id: session.id,
        }),
      ]);
      if (studentResult.data) setStudent(studentResult.data);
      // Inactive students may sign in, but their attendance must remain hidden
      // and read as 0. Reactivate the account to reveal its saved records.
      setSubjects(
        studentResult.data?.is_active === false ? [] : subjectResult.data || [],
      );
      if (studentResult.error || subjectResult.error)
        setMessage(
          studentResult.error?.message || subjectResult.error?.message,
        );
      setLoading(false);
    };
    if (supabase) {
      load(true);
      const refreshTimer = window.setInterval(() => load(false), 15000);
      const refreshOnFocus = () => load(false);
      window.addEventListener("focus", refreshOnFocus);
      return () => {
        window.clearInterval(refreshTimer);
        window.removeEventListener("focus", refreshOnFocus);
      };
    }
  }, [session.id]);

  useEffect(() => {
    loadAnnouncements("student").then((items) => {
      const read = new Set(JSON.parse(localStorage.getItem(`campus-announcement-reads-student-${session.id}`) || "[]"));
      setUnreadAnnouncements(items.some((item) => !read.has(item.id)));
    });
  }, [session.id]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("campus-theme", dark ? "dark" : "light");
  }, [dark]);

  const totals = useMemo(() => {
    const total = subjects.reduce(
      (sum, subject) => sum + Number(subject.total_classes || 0),
      0,
    );
    const attended = subjects.reduce(
      (sum, subject) => sum + Number(subject.attended_classes || 0),
      0,
    );
    return {
      total,
      attended,
      absent: Math.max(0, total - attended),
      percentage: percentage(attended, total),
    };
  }, [subjects]);

  const navigate = (nextPage) => {
    setPage(nextPage);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800 dark:bg-slate-950 dark:text-white lg:pl-64">
      <aside className={"fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white px-5 py-7 transition-transform dark:border-slate-700 dark:bg-slate-900 lg:translate-x-0 " + (sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <Brand />
        <button className="absolute right-3 top-5 rounded-lg p-2 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <X />
        </button>
        <nav className="mt-12 space-y-2">
          {[
            ["dashboard", LayoutDashboard, "Dashboard"],
            ["attendance", CalendarCheck, "Attendance"],
            ["subjects", BookOpen, "Subjects"],
            ["schedule", CalendarDays, "Class Schedule"],
            ["calendar", CalendarRange, "Academic Calendar"],
            ["announcements", Bell, "Announcements"],
          ].map(([key, Icon, label]) => (
            <button key={key} onClick={() => navigate(key)} className={"flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold transition " + (page === key ? "bg-campus text-white" : "text-slate-600 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-slate-800")}>
              <Icon size={20} /> <span className="flex flex-1 items-center justify-between">{label}{key === "announcements" && unreadAnnouncements && <i className="size-2 rounded-full bg-red-500" aria-label="Unread announcements" />}</span>
            </button>
          ))}
        </nav>
        <button onClick={logout} className="mt-auto flex items-center gap-3 border-t border-slate-200 px-4 pt-5 font-semibold text-slate-600 hover:text-red-500 dark:border-slate-700 dark:text-slate-200">
          <LogOut size={20} /> Log out
        </button>
      </aside>

      {sidebarOpen && <button className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <main data-portal="student" data-page={page} className="h-screen min-w-0 overflow-y-auto px-4 pb-8 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 flex min-h-16 items-center gap-4 bg-[#f7f8fc]/95 px-4 py-2 backdrop-blur dark:bg-slate-950/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <button className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="min-w-0 flex-1">
            {page !== "dashboard" && <h1 className="truncate text-2xl sm:text-3xl">
              {page === "attendance" ? "Subject Attendance" : page === "subjects" ? "Subjects" : page === "schedule" ? "Class Schedule" : page === "calendar" ? "Academic Calendar" : "Announcements"}
            </h1>}
          </div>
          <button type="button" onClick={() => setDark((value) => !value)} className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300" aria-label="Switch theme">
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>
          <ProfileMenu user={student} role="student" />
        </header>

        {page !== "dashboard" && (
          <PageIntro
            onBack={() => navigate("dashboard")}
            title={page === "attendance" ? "Subject Attendance" : page === "subjects" ? "My Subjects" : page === "schedule" ? "Class Schedule" : page === "calendar" ? "Academic Calendar" : "Announcements"}
            subtitle={page === "attendance" ? "Track your attendance in every subject." : page === "subjects" ? "View your subjects and assigned faculty members." : page === "schedule" ? "View your weekly class timetable." : page === "calendar" ? "View holidays, exams and important academic dates." : "Stay informed with the latest campus updates."}
          />
        )}

        <Toast message={message} tone="error" onClose={() => setMessage("")} />

        {page === "subjects" ? (
          <StudentSubjects student={student} />
        ) : page === "announcements" ? (
          <section className="mt-6"><AnnouncementCenter role="student" userId={session.id} onUnreadChange={setUnreadAnnouncements} /></section>
        ) : page === "schedule" ? (
          <section className="mt-6"><Schedule role="student" session={student} /></section>
        ) : page === "calendar" ? (
          <AcademicCalendar role="student" session={student} />
        ) : page === "dashboard" ? (
          <section className="mx-auto mt-8 w-full max-w-6xl">
            <div>
              <h2 className="text-2xl sm:text-3xl">Welcome back, {student.name}! 👋</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">{student.id} · {student.department} · Year {student.year}</p>
            </div>

            <div className="mt-6 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:grid-cols-[.9fr_1.1fr]">
              <div className="p-5 sm:p-7 lg:border-r lg:border-slate-200 lg:dark:border-slate-700">
                <h3 className="text-base font-semibold">Overall Attendance</h3>
                <div className="mt-5 flex justify-center">
                  <AttendanceDonut value={totals.percentage} />
                </div>
              </div>

              <div className="border-t border-slate-200 p-5 dark:border-slate-700 sm:p-7 lg:border-t-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold">Subject Attendance</h3>
                  <button onClick={() => navigate("attendance")} className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">View all</button>
                </div>
                <div className="mt-5 space-y-5">
                  {subjects.slice(0, 4).map((subject) => {
                    const subjectValue = Math.max(0, Math.min(100, Number(subject.attendance_percentage) || 0));
                    return (
                      <div key={subject.subject_code}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{subject.subject_name}</span>
                          <b>{subjectValue}%</b>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div className={"h-full rounded-full " + (subjectValue >= 75 ? "bg-emerald-500" : "bg-red-500")} style={{ width: subjectValue + "%" }} />
                        </div>
                      </div>
                    );
                  })}
                  {!loading && !subjects.length && <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-300">No subject attendance is available yet.</p>}
                </div>
              </div>
            </div>
            <UpcomingEvents role="student" session={student} onViewAll={() => navigate("calendar")} />
          </section>
        ) : (
          <section className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subjects.map((subject) => {
                const good = subject.attendance_percentage >= 75;
                return (
                  <article key={subject.subject_code} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200"><BookOpen size={21} /></span>
                      <strong className={"text-2xl " + (good ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>{subject.attendance_percentage}%</strong>
                    </div>
                    <h3 className="mt-4 break-words text-xl">{subject.subject_name}</h3>
                    <p className="mt-1 font-mono text-sm text-violet-600 dark:text-violet-300">{subject.subject_code}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className={"h-full rounded-full " + (good ? "bg-emerald-500" : "bg-red-500")} style={{ width: Math.min(100, subject.attendance_percentage) + "%" }} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900"><b className="block">{subject.total_classes}</b>Total</div>
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"><b className="block">{subject.attended_classes}</b>Present</div>
                      <div className="rounded-lg bg-red-50 p-2 text-red-700 dark:bg-red-950 dark:text-red-200"><b className="block">{Number(subject.total_classes) - Number(subject.attended_classes)}</b>Absent</div>
                    </div>
                    <p className={"mt-4 rounded-lg px-3 py-2 text-center text-sm font-bold " + (good ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200")}>
                      {good ? "Attendance requirement met" : "Below 75% attendance"}
                    </p>
                  </article>
                );
              })}
            </div>
            {!loading && !subjects.length && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No subjects are available for your branch and year.</div>}
          </section>
        )}
      </main>
    </div>
  );
}
