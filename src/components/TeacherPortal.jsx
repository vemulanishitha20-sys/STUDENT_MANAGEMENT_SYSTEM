import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ArrowLeft,
  Bell,
  CalendarDays,
  CalendarRange,
  Check,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  Users,
  X,
} from "lucide-react";
import Brand from "./Brand";
import PersonDetails from "./PersonDetails";
import AttendanceCalendar from "./AttendanceCalendar";
import ConfirmDialog from "./ConfirmDialog";
import AnnouncementCenter, { loadAnnouncements } from "./AnnouncementCenter";
import { supabase } from "../lib/data";
import Schedule from "./Schedule";
import AcademicCalendar from "./AcademicCalendar";
import UpcomingEvents from "./UpcomingEvents";
import PageIntro from "./PageIntro";
import ProfileMenu from "./ProfileMenu";

const percentage = (student) =>
  student.total_classes
    ? Math.round((student.attended_classes / student.total_classes) * 100)
    : 0;

const pages = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["attendance", ClipboardCheck, "Attendance"],
  ["students", Users, "Students"],
  ["subjects", BookOpen, "My Subjects"],
  ["schedule", CalendarDays, "Class Schedule"],
  ["calendar", CalendarRange, "Academic Calendar"],
  ["announcements", Bell, "Announcements"],
];

export default function TeacherPortal({ session, logout }) {
  const [page, setPage] = useState("dashboard"),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [students, setStudents] = useState([]),
    [assignments, setAssignments] = useState([]),
    [query, setQuery] = useState(""),
    [selectedSubject, setSelectedSubject] = useState(null),
    [selectedStudentSubject, setSelectedStudentSubject] = useState(null),
    [selectedStudent, setSelectedStudent] = useState(null),
    [attendanceDate, setAttendanceDate] = useState(() =>
      new Date().toLocaleDateString("en-CA"),
    ),
    [dayAttendance, setDayAttendance] = useState({}),
    [attendanceDraft, setAttendanceDraft] = useState({}),
    [markedDates, setMarkedDates] = useState([]),
    [calendarOpen, setCalendarOpen] = useState(false),
    [confirmingSave, setConfirmingSave] = useState(false),
    [savingAttendance, setSavingAttendance] = useState(false),
    [dark, setDark] = useState(() =>
      document.documentElement.classList.contains("dark"),
    ),
    [message, setMessage] = useState(""),
    [unreadAnnouncements, setUnreadAnnouncements] = useState(false),
    [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [studentResult, subjectResult] = await Promise.all([
        supabase.rpc("teacher_attendance_students", {
          p_teacher_id: session.id,
        }),
        supabase
          .from("teacher_subjects")
          .select("subjects(code,name,department,year)")
          .eq("teacher_id", session.id),
      ]);
      setStudents(studentResult.data || []);
      setAssignments(
        subjectResult.data?.map((item) => item.subjects).filter(Boolean) || [],
      );
      if (studentResult.error) setMessage(studentResult.error.message);
      setLoading(false);
    };
    if (supabase) {
      load();
      window.addEventListener("focus", load);
      return () => window.removeEventListener("focus", load);
    }
  }, [session.id]);

  useEffect(() => {
    loadAnnouncements("teacher").then((items) => {
      const read = new Set(JSON.parse(localStorage.getItem(`campus-announcement-reads-teacher-${session.id}`) || "[]"));
      setUnreadAnnouncements(items.some((item) => !read.has(item.id)));
    });
  }, [session.id]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("campus-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!selectedSubject || !supabase) {
      setDayAttendance({});
      setAttendanceDraft({});
      return;
    }
    supabase
      .rpc("get_subject_attendance", {
        p_teacher_id: session.id,
        p_subject_code: selectedSubject.code,
        p_date: attendanceDate,
      })
      .then(({ data, error }) => {
        if (error) return setMessage(error.message);
        const saved = Object.fromEntries(
          (data || []).map((record) => [record.student_id, record.present]),
        );
        setDayAttendance(saved);
        setAttendanceDraft(saved);
      });
  }, [attendanceDate, selectedSubject, session.id]);

  useEffect(() => {
    if (!selectedSubject || !supabase) {
      setMarkedDates([]);
      return;
    }
    supabase
      .rpc("get_subject_attendance_dates", {
        p_teacher_id: session.id,
        p_subject_code: selectedSubject.code,
      })
      .then(({ data, error }) => {
        if (error) return setMessage(error.message);
        setMarkedDates((data || []).map((record) => record.attendance_date));
      });
  }, [selectedSubject, session.id]);

  const filtered = useMemo(
    () =>
      students.filter(
        (student) =>
          `${student.name} ${student.id}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          selectedSubject &&
          student.department === selectedSubject.department &&
          Number(student.year) === Number(selectedSubject.year),
      ).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    [students, query, selectedSubject],
  );

  const subjectStudents = students.filter(
    (student) =>
      selectedSubject &&
      student.department === selectedSubject.department &&
      Number(student.year) === Number(selectedSubject.year),
  );
  const isSunday =
    attendanceDate && new Date(`${attendanceDate}T00:00:00`).getDay() === 0;
  const isFuture = attendanceDate > new Date().toLocaleDateString("en-CA");
  const attendanceLocked = markedDates.includes(attendanceDate);
  const allStudentsMarked =
    subjectStudents.length > 0 &&
    subjectStudents.every(
      (student) => attendanceDraft[student.id] !== undefined,
    );
  const hasAttendanceChanges = subjectStudents.some(
    (student) =>
      attendanceDraft[student.id] !== undefined &&
      attendanceDraft[student.id] !== dayAttendance[student.id],
  );

  const mark = (student, present) => {
    if (isSunday) return setMessage("Attendance cannot be marked on Sunday.");
    if (isFuture) return setMessage("Future attendance cannot be marked.");
    if (attendanceLocked)
      return setMessage("Saved attendance cannot be changed.");
    setAttendanceDraft((current) => ({ ...current, [student.id]: present }));
  };
  const markAllPresent = () => {
    if (isSunday) return setMessage("Attendance cannot be marked on Sunday.");
    if (isFuture) return setMessage("Future attendance cannot be marked.");
    if (attendanceLocked) return setMessage("Saved attendance cannot be changed.");
    setAttendanceDraft((current) => ({ ...current, ...Object.fromEntries(subjectStudents.map((student) => [student.id, true])) }));
  };

  const saveAttendance = async () => {
    setConfirmingSave(false);
    if (isSunday) return setMessage("Attendance cannot be marked on Sunday.");
    if (isFuture) return setMessage("Future attendance cannot be marked.");
    if (attendanceLocked)
      return setMessage("Saved attendance cannot be changed.");
    if (!allStudentsMarked)
      return setMessage("Mark every student present or absent before saving.");
    setSavingAttendance(true);
    const { data: results, error } = await supabase.rpc(
      "save_subject_attendance",
      {
        p_teacher_id: session.id,
        p_subject_code: selectedSubject.code,
        p_date: attendanceDate,
        p_attendance: subjectStudents.map((student) => ({
          student_id: student.id,
          present: attendanceDraft[student.id],
        })),
      },
    );
    setSavingAttendance(false);
    if (error) return setMessage(error.message);
    setStudents((current) =>
      current.map((student) => {
        const saved = results?.find((item) => item.student_id === student.id);
        return saved ? { ...student, ...saved } : student;
      }),
    );
    setDayAttendance({ ...attendanceDraft });
    setMarkedDates((current) =>
      current.includes(attendanceDate)
        ? current
        : [...current, attendanceDate].sort(),
    );
    setMessage(`Attendance saved for ${attendanceDate}`);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const navigate = (nextPage) => {
    setPage(nextPage);
    if (nextPage !== "attendance") setSelectedSubject(null);
    if (nextPage !== "students") setSelectedStudentSubject(null);
    setQuery("");
    setSidebarOpen(false);
  };

  const studentClassList = students.filter(
    (student) =>
      selectedStudentSubject &&
      student.department === selectedStudentSubject.department &&
      Number(student.year) === Number(selectedStudentSubject.year) &&
      `${student.name} ${student.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  ).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800 dark:bg-slate-950 dark:text-white lg:pl-64">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white px-5 py-7 transition-transform dark:border-slate-700 dark:bg-slate-900 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Brand />
        <button
          className="absolute right-3 top-5 rounded-lg p-2 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X />
        </button>
        <div className="hidden">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-campus font-bold text-white">
              {session.name?.[0] || "T"}
            </span>
            <div className="min-w-0">
              <b className="block break-words">{session.name}</b>
              <small className="text-slate-500 dark:text-slate-300">
                {session.id} · Teacher
              </small>
            </div>
          </div>
        </div>
        <nav className="mt-12 space-y-2">
          {pages.map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold transition ${page === key ? "bg-campus text-white" : "text-slate-600 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-slate-800"}`}
            >
              <Icon size={20} />
              <span className="flex flex-1 items-center justify-between">{label}{key === "announcements" && unreadAnnouncements && <i className="size-2 rounded-full bg-red-500" aria-label="Unread announcements" />}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-3 border-t border-slate-200 px-4 pt-5 font-semibold text-slate-600 hover:text-red-500 dark:border-slate-700 dark:text-slate-200"
        >
          <LogOut size={20} />
          Log out
        </button>
      </aside>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main data-portal="teacher" className="h-screen min-w-0 overflow-y-auto px-4 pb-6 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-30 -mx-4 flex min-h-16 items-center gap-4 bg-[#f7f8fc]/95 px-4 py-2 backdrop-blur dark:bg-slate-950/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <button
            className="rounded-xl border border-slate-200 bg-white p-2.5 lg:hidden dark:border-slate-700 dark:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          {page === "dashboard" ? (
            <div className="min-w-0 flex-1">
              <p className="hidden">
                Welcome, {session.name}
              </p>
              <h1 className="text-2xl sm:text-3xl">Dashboard</h1>
            </div>
          ) : page === "attendance" ? (
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl sm:text-3xl">
                Attendance Register
              </h1>
            </div>
          ) : page === "students" ? (
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl sm:text-3xl">
                List of Students
              </h1>
            </div>
          ) : page === "announcements" ? (
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl">Announcements</h1>
            </div>
          ) : page === "schedule" ? (
            <div className="min-w-0 flex-1"><h1 className="text-2xl sm:text-3xl">Class Schedule</h1></div>
          ) : page === "calendar" ? (
            <div className="min-w-0 flex-1"><h1 className="text-2xl sm:text-3xl">Academic Calendar</h1></div>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={() => setDark((value) => !value)}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>
          <ProfileMenu user={session} role="teacher" />
        </header>

        {page !== "dashboard" && (
          <PageIntro
            onBack={() => navigate("dashboard")}
            title={page === "attendance" ? "Attendance Register" : page === "students" ? "List of Students" : page === "subjects" ? "My Subjects" : page === "schedule" ? "Class Schedule" : page === "calendar" ? "Academic Calendar" : "Announcements"}
            subtitle={page === "attendance" ? "Mark and review attendance for your assigned classes." : page === "students" ? "View students from your assigned departments and years." : page === "subjects" ? "Review your subjects and teaching responsibilities." : page === "schedule" ? "View your weekly class timetable." : page === "calendar" ? "View academic dates and manage your class events." : "Read important updates from the administration."}
          />
        )}

        {message && (
          <div className="fixed left-1/2 top-5 z-[70] w-[min(90%,420px)] -translate-x-1/2 rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white shadow-xl dark:bg-violet-600">
            {message}
          </div>
        )}

        {page === "announcements" && (
          <section className="mt-6">
            <AnnouncementCenter role="teacher" userId={session.id} onUnreadChange={setUnreadAnnouncements} />
          </section>
        )}
        {page === "schedule" && <section className="mt-6"><Schedule role="teacher" session={{ ...session, teacher_subjects: assignments.map((subjects) => ({ subjects })) }} /></section>}
        {page === "calendar" && <AcademicCalendar role="teacher" session={{ ...session, teacher_subjects: assignments.map((subjects) => ({ subjects })) }} />}
        {page === "dashboard" && (
          <section className="mt-6">
            <div className="hidden">
              {[
                [
                  BookOpen,
                  "Assigned subjects",
                  assignments.length,
                  "bg-violet-100 text-violet-700",
                ],
              ].map(([Icon, label, value, colorClass]) => (
                <article
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <span
                    className={`grid size-11 place-items-center rounded-xl ${colorClass}`}
                  >
                    <Icon size={22} />
                  </span>
                  <strong className="mt-4 block text-3xl">{value}</strong>
                  <p className="text-slate-500 dark:text-slate-300">{label}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-600 dark:text-violet-300">
                      Welcome, {session.name}
                    </p>
                    <h2 className="text-xl">Assigned class registers</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      Each subject has its own branch and year student list.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("attendance")}
                    className="rounded-xl bg-campus px-4 py-2 font-bold text-white"
                  >
                    Mark attendance
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {assignments.map((subject) => (
                    <button
                      key={subject.code}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setPage("attendance");
                      }}
                      className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-left hover:border-violet-400 dark:border-violet-900 dark:bg-violet-950"
                    >
                      <b className="block break-words text-violet-900 dark:text-violet-100">
                        {subject.name}
                      </b>
                      <small className="text-violet-700 dark:text-violet-300">
                        {subject.department} · Year {subject.year} ·{" "}
                        {
                          students.filter(
                            (student) =>
                              student.department === subject.department &&
                              Number(student.year) === Number(subject.year),
                          ).length
                        }{" "}
                        students
                      </small>
                    </button>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <h2 className="text-xl">Your teaching scope</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {assignments.map((subject) => (
                    <span
                      key={subject.code}
                      className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200"
                    >
                      {subject.department} · Year {subject.year}
                    </span>
                  ))}
                </div>
              </article>
            </div>
            <UpcomingEvents role="teacher" session={{ ...session, teacher_subjects: assignments.map((subjects) => ({ subjects })) }} onViewAll={() => navigate("calendar")} />
          </section>
        )}

        {page === "attendance" && (
          <section className="mt-6">
            {!selectedSubject ? (
              <>
                <div className="mb-5">
                  <h2 className="text-2xl">Choose an assigned subject</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {assignments.map((subject) => {
                    const count = students.filter(
                      (student) =>
                        student.department === subject.department &&
                        Number(student.year) === Number(subject.year),
                    ).length;
                    return (
                      <button
                        key={subject.code}
                        onClick={() => setSelectedSubject(subject)}
                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200">
                          <BookOpen />
                        </span>
                        <h2 className="mt-4 break-words text-xl">
                          {subject.name}
                        </h2>
                        <p className="mt-1 font-mono text-sm text-violet-600 dark:text-violet-300">
                          {subject.code}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                            {subject.department}
                          </span>
                          <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                            Year {subject.year}
                          </span>
                        </div>
                        <p className="mt-4 font-bold">{count} students</p>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950">
                  <button
                    onClick={() => {
                      setSelectedSubject(null);
                      setQuery("");
                    }}
                    className="flex items-center gap-2 font-bold text-violet-700 dark:text-violet-200"
                  >
                    <ArrowLeft size={18} /> Choose another subject
                  </button>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl">{selectedSubject.name}</h2>
                      <p className="font-semibold text-violet-700 dark:text-violet-200">
                        {selectedSubject.code} · {selectedSubject.department} ·
                        Year {selectedSubject.year}
                      </p>
                    </div>
                    <div className="grid w-full items-start gap-2 sm:w-auto sm:grid-cols-[288px_288px]">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCalendarOpen((open) => !open)}
                          className="flex h-11 w-full items-center gap-3 rounded-xl border border-violet-200 bg-white px-3 font-semibold dark:border-violet-700 dark:bg-slate-900"
                        >
                          <CalendarDays className="text-violet-500" size={18} />
                          {new Date(attendanceDate + "T00:00:00").toLocaleDateString("en-GB")}
                        </button>
                        {calendarOpen && (
                          <div className="absolute right-0 top-12 z-30">
                            <AttendanceCalendar
                              value={attendanceDate}
                              onChange={(date) => {
                                setAttendanceDate(date);
                                setCalendarOpen(false);
                              }}
                              markedDates={markedDates}
                              onClose={() => setCalendarOpen(false)}
                            />
                          </div>
                        )}
                      </div>
                      <label className="relative">
                        <Search
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={18}
                        />
                        <input
                          className="h-11 w-full rounded-xl border border-violet-200 bg-white pl-10 pr-3 dark:border-violet-700 dark:bg-slate-900"
                          placeholder="Search this class..."
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    [
                      "Total students",
                      filtered.length,
                      "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100",
                    ],
                    [
                      "Present",
                      filtered.filter(
                        (student) => attendanceDraft[student.id] === true,
                      ).length,
                      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
                    ],
                    [
                      "Absent",
                      filtered.filter(
                        (student) => attendanceDraft[student.id] === false,
                      ).length,
                      "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100",
                    ],
                    [
                      "Not marked",
                      filtered.filter(
                        (student) => attendanceDraft[student.id] === undefined,
                      ).length,
                      "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100",
                    ],
                  ].map(([label, value, color]) => (
                    <article
                      key={label}
                      className={`rounded-2xl border p-4 ${color}`}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider">
                        {label}
                      </p>
                      <strong className="mt-1 block text-2xl">{value}</strong>
                    </article>
                  ))}
                </div>
                {isSunday && (
                  <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-center font-bold text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                    Attendance cannot be marked on Sunday. Please choose another
                    date.
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500 dark:text-slate-300">Mark everyone present, then change individual students to absent if required.</p><button type="button" onClick={markAllPresent} disabled={!subjectStudents.length || isSunday || isFuture || attendanceLocked} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Check size={17} /> Mark all present</button></div>
                <div className="mt-3 h-[46vh] min-h-72 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:h-[52vh]">
                  <div className="sticky top-0 z-10 hidden grid-cols-[160px_minmax(220px,1fr)_120px_120px] gap-3 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-300 md:grid">
                    <span>Campus ID</span>
                    <span>Name</span>
                    <span className="text-center">Present</span>
                    <span className="text-center">Absent</span>
                  </div>
                  {filtered.map((student) => (
                    <div
                      key={student.id}
                      className="grid gap-3 border-t border-slate-100 px-5 py-4 transition first:border-t-0 hover:bg-violet-50/50 dark:border-slate-700 dark:hover:bg-slate-700/40 md:grid-cols-[160px_minmax(220px,1fr)_120px_120px] md:items-center"
                    >
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="w-fit rounded-lg bg-violet-50 px-2.5 py-1.5 text-left font-mono text-sm font-semibold text-violet-600 hover:underline dark:bg-violet-950 dark:text-violet-300"
                      >
                        <span className="mr-2 text-xs text-slate-400 md:hidden">ID</span>
                        {student.id}
                      </button>
                      <div className="flex items-center">
                        <div className="min-w-0">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="block break-words text-left text-lg font-bold hover:text-campus hover:underline"
                          >
                            {student.name}
                          </button>
                          <small className="block text-slate-500 dark:text-slate-300">
                            {student.department} · Year {student.year}
                          </small>
                          <small className="hidden">
                            {student.id} · {student.department} · Year{" "}
                            {student.year}
                          </small>
                        </div>
                        <b className="hidden">{percentage(student)}%</b>
                      </div>
                      <span className="hidden">
                        {dayAttendance[student.id] === true
                          ? "Present"
                          : dayAttendance[student.id] === false
                            ? "Absent"
                            : "Not marked"}
                      </span>
                      <div className="grid grid-cols-2 gap-2 md:contents">
                        <button
                          onClick={() => mark(student, true)}
                          disabled={isSunday || isFuture || attendanceLocked}
                          className={`flex items-center justify-center gap-1 rounded-xl py-2.5 font-bold disabled:cursor-not-allowed disabled:opacity-40 md:order-3 ${attendanceDraft[student.id] === true ? "bg-emerald-600 text-white ring-2 ring-emerald-300" : "bg-emerald-100 text-emerald-800"}`}
                        >
                          <Check size={18} />
                          Present
                        </button>
                        <button
                          onClick={() => mark(student, false)}
                          disabled={isSunday || isFuture || attendanceLocked}
                          className={`flex items-center justify-center gap-1 rounded-xl py-2.5 font-bold disabled:cursor-not-allowed disabled:opacity-40 md:order-4 ${attendanceDraft[student.id] === false ? "bg-red-600 text-white ring-2 ring-red-300" : "bg-red-100 text-red-700"}`}
                        >
                          <X size={18} />
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sticky bottom-4 z-20 mt-4 flex justify-center">
                    <button
                      onClick={() => setConfirmingSave(true)}
                      disabled={savingAttendance || !allStudentsMarked || isSunday || isFuture || attendanceLocked || !hasAttendanceChanges}
                      className="rounded-xl bg-campus px-8 py-3 font-bold text-white shadow-xl hover:bg-violet-700 disabled:opacity-60"
                    >
                      {attendanceLocked
                        ? "Attendance saved"
                        : savingAttendance
                          ? "Saving..."
                          : "Save attendance"}
                    </button>
                  </div>
                {confirmingSave && (
                  <ConfirmDialog
                    title="Save attendance?"
                    message="Do you want to save attendance for"
                    highlight={new Date(attendanceDate + "T00:00:00").toLocaleDateString("en-GB")}
                    messageAfter="Attendance cannot be changed after saving."
                    confirmLabel="Yes, save"
                    cancelLabel="No"
                    tone="primary"
                    onConfirm={saveAttendance}
                    onCancel={() => setConfirmingSave(false)}
                  />
                )}
                {!loading && !filtered.length && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    No matching students in your assigned teaching scope.
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {page === "students" && (
          <section className="mt-6">
            {!selectedStudentSubject ? (
              <>
                <h2 className="text-2xl">Choose an assigned subject</h2>
                <p className="mt-1 text-slate-500 dark:text-slate-300">
                  View each subject's students separately by branch and year.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {assignments.map((subject) => {
                    const count = students.filter(
                      (student) =>
                        student.department === subject.department &&
                        Number(student.year) === Number(subject.year),
                    ).length;
                    return (
                      <button
                        key={subject.code}
                        onClick={() => setSelectedStudentSubject(subject)}
                        className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-violet-400 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                          <Users />
                        </span>
                        <h2 className="mt-4 break-words text-xl">
                          {subject.name}
                        </h2>
                        <p className="mt-1 font-mono text-sm text-violet-600 dark:text-violet-300">
                          {subject.code}
                        </p>
                        <p className="mt-3 font-semibold">
                          {subject.department} · Year {subject.year}
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                          {count} students
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-[minmax(320px,1.3fr)_minmax(300px,.7fr)]">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                    <button
                      onClick={() => {
                        setSelectedStudentSubject(null);
                        setQuery("");
                      }}
                      className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-200"
                    >
                      <ArrowLeft size={18} /> Choose another subject
                    </button>
                    <div className="mt-3">
                      <div>
                        <h2 className="text-lg">
                          {selectedStudentSubject.name}
                        </h2>
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-200">
                          {selectedStudentSubject.code} ·{" "}
                          {selectedStudentSubject.department} · Year{" "}
                          {selectedStudentSubject.year}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <article className="rounded-xl border border-blue-300 bg-blue-50 p-3 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Total students
                      </p>
                      <strong className="mt-1 block text-2xl">
                        {studentClassList.length}
                      </strong>
                    </article>
                    <article className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100">
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Below 75%
                      </p>
                      <strong className="mt-1 block text-2xl">
                        {
                          studentClassList.filter(
                            (student) => percentage(student) < 75,
                          ).length
                        }
                      </strong>
                    </article>
                  </div>
                </div>
                <label className="relative mt-4 block w-full">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 shadow-sm outline-none focus:border-campus focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-violet-900"
                    placeholder="Search students by ID or name..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <div className="mt-4 h-[50vh] min-h-72 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:h-[58vh]">
                  <div className="sticky top-0 z-10 hidden grid-cols-[160px_minmax(180px,1fr)_120px] gap-3 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-300 md:grid">
                    <span>Campus ID</span>
                    <span>Name</span>
                    <span>Attendance</span>
                  </div>
                  {studentClassList.map((student) => (
                    <div
                      key={student.id}
                      className="grid gap-2 border-t border-slate-100 px-5 py-4 first:border-t-0 dark:border-slate-700 md:grid-cols-[160px_minmax(180px,1fr)_120px] md:items-center"
                    >
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="w-fit rounded-lg bg-violet-50 px-2.5 py-1.5 text-left font-mono text-sm font-semibold text-violet-600 hover:underline dark:bg-violet-950 dark:text-violet-300"
                      >
                        <span className="mr-2 text-xs text-slate-400 md:hidden">ID</span>
                        {student.id}
                      </button>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="break-words text-left font-bold hover:text-campus hover:underline"
                      >
                        {student.name}
                      </button>
                      <span className="hidden">
                        {student.department} · Y{student.year}
                      </span>
                      <b
                        className={
                          percentage(student) < 75
                            ? "text-red-500"
                            : "text-emerald-500"
                        }
                      >
                        {percentage(student)}%
                      </b>
                    </div>
                  ))}
                </div>
                {!studentClassList.length && (
                  <div className="mt-4 rounded-2xl bg-white p-8 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    No matching students found.
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {page === "subjects" && (
          <section className="mt-6">
            <div className="mb-5">
              <h2 className="text-2xl">Assigned Subjects</h2>
              <p className="text-slate-500 dark:text-slate-300">
                Subjects, branches and years assigned to you.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assignments.map((subject) => (
                <article
                  key={subject.code}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200">
                    <GraduationCap />
                  </span>
                  <h2 className="mt-4 break-words text-xl">{subject.name}</h2>
                  <p className="mt-1 font-mono text-sm text-violet-600 dark:text-violet-300">
                    {subject.code}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                      {subject.department}
                    </span>
                    <span className="rounded-lg bg-orange-50 px-3 py-1 text-sm font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                      Year {subject.year}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      {selectedStudent && (
        <PersonDetails
          person={selectedStudent}
          type="students"
          close={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
