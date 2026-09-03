import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Megaphone,
  Plus,
  School,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase } from "../../lib/data";

const Card = ({ children, className = "" }) => (
  <article className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
    {children}
  </article>
);

const Stat = ({ icon: Icon, count, label, tone }) => (
  <Card className="flex items-center gap-4">
    <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={23} /></span>
    <span><strong className="block font-display text-3xl leading-none">{count}</strong><small className="mt-2 block text-slate-500 dark:text-slate-300">{label}</small></span>
  </Card>
);

const formatDate = (value) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function Dashboard({ data }) {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({
    students: data.students.length,
    teachers: data.teachers.length,
    classes: 0,
    attendance: [],
    todayAttendance: [],
    attendanceDate: null,
    announcements: [],
    events: [],
    recentStudents: [],
    recentTeachers: [],
    roster: data.students,
  });
  const [branch, setBranch] = useState("all");
  const [year, setYear] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const today = new Date().toLocaleDateString("en-CA");
      const [students, teachers, classes, attendance, todayAttendance, announcements, events, recentStudents, recentTeachers] = await Promise.all([
        supabase.from("students").select("id,department,year", { count: "exact" }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("class_schedule").select("id", { count: "exact", head: true }),
        supabase.rpc("dashboard_latest_attendance_summary", { p_department: branch === "all" ? null : branch, p_year: year === "all" ? null : Number(year) }),
        supabase.rpc("dashboard_attendance_summary", { p_date: today }),
        supabase.from("announcements").select("id,title,message,created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("academic_events").select("id,title,kind,start_date,created_at").gte("end_date", today).order("start_date").limit(4),
        supabase.from("students").select("id,name,created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("teachers").select("id,name,created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      setOverview({
        students: students.count ?? data.students.length,
        teachers: teachers.count ?? data.teachers.length,
        classes: classes.count ?? 0,
        attendance: attendance.data || [],
        todayAttendance: todayAttendance.data || [],
        attendanceDate: attendance.data?.[0]?.recorded_date || null,
        announcements: announcements.data || [],
        events: events.data || [],
        recentStudents: recentStudents.data || [],
        recentTeachers: recentTeachers.data || [],
        roster: students.data || data.students,
      });
      setLastUpdated(new Date());
    };
    load();
    const refreshTimer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => { window.clearInterval(refreshTimer); window.removeEventListener("focus", load); };
  }, [data.students.length, data.teachers.length, branch, year]);

  const branches = useMemo(() => [...new Set((overview.roster || []).map((student) => student.department).filter(Boolean))].sort(), [overview.roster]);
  const filteredAttendance = overview.attendance;
  const present = filteredAttendance.reduce((total, row) => total + Number(row.present_count || 0), 0);
  const absent = filteredAttendance.reduce((total, row) => total + Number(row.absent_count || 0), 0);
  const recorded = present + absent;
  const attendancePercent = recorded ? Math.round((present / recorded) * 100) : 0;
  const todayPresent = overview.todayAttendance.reduce((total, row) => total + Number(row.present_count || 0), 0);
  const todayRecorded = overview.todayAttendance.reduce((total, row) => total + Number(row.recorded_count || 0), 0);
  const todayPercent = todayRecorded ? Math.round((todayPresent / todayRecorded) * 100) : 0;
  const activity = useMemo(() => [
    ...overview.recentStudents.map((item) => ({ id: `s-${item.id}`, text: `${item.name} was added as a student`, date: item.created_at, tone: "bg-blue-500" })),
    ...overview.recentTeachers.map((item) => ({ id: `t-${item.id}`, text: `${item.name} was registered as a teacher`, date: item.created_at, tone: "bg-violet-500" })),
    ...overview.announcements.map((item) => ({ id: `a-${item.id}`, text: `Announcement published: ${item.title}`, date: item.created_at, tone: "bg-orange-500" })),
    ...overview.events.map((item) => ({ id: `e-${item.id}`, text: `Academic event created: ${item.title}`, date: item.created_at, tone: "bg-emerald-500" })),
  ].filter((item) => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [overview]);

  const actions = [
    ["Add Student", UserPlus, "/students"],
    ["Add Teacher", Users, "/teachers"],
    ["Create Announcement", Megaphone, "/announcements"],
    ["Add Academic Event", CalendarDays, "/calendar"],
    ["Manage Exams", ClipboardCheck, "/calendar"],
  ];

  return (
    <div className="mx-auto w-full max-w-7xl pb-6">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-violet-600 dark:text-violet-300">Welcome back, Admin</p>
        <h1 className="mt-1 text-2xl text-[#292640] dark:text-white sm:text-3xl">Institution overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Here is what is happening across JBIET today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={GraduationCap} count={overview.students} label="Total Students" tone="bg-blue-100 text-blue-600" />
        <Stat icon={Users} count={overview.teachers} label="Total Teachers" tone="bg-violet-100 text-violet-600" />
        <Stat icon={School} count={overview.classes} label="Total Classes" tone="bg-orange-100 text-orange-600" />
        <Stat icon={CheckCircle2} count={`${todayPercent}%`} label="Today's Attendance" tone="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-xl">Attendance Overview</h2>
            <div className="flex gap-2"><select value={branch} onChange={(event) => setBranch(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800"><option value="all">All branches</option>{branches.map((item) => <option key={item}>{item}</option>)}</select><select value={year} onChange={(event) => setYear(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800"><option value="all">All years</option>{[1,2,3,4].map((item) => <option key={item} value={item}>Year {item}</option>)}</select></div>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{overview.attendanceDate ? `Latest saved attendance · ${formatDate(overview.attendanceDate)} · ${branch === "all" ? "All branches" : branch} · ${year === "all" ? "All years" : `Year ${year}`}` : "No attendance is available for the selected filters"}</p>
          <div className="mt-5 flex items-center justify-center gap-7">
            <div className="grid size-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${attendancePercent * 3.6}deg, #e2e8f0 0deg)` }}>
              <div className="grid size-24 place-items-center rounded-full bg-white text-center dark:bg-slate-800"><strong className="text-2xl text-emerald-600">{attendancePercent}%</strong></div>
            </div>
            <div className="space-y-3 text-sm"><p><i className="mr-2 inline-block size-2.5 rounded-full bg-emerald-500" /><b>{present}</b> Present</p><p><i className="mr-2 inline-block size-2.5 rounded-full bg-red-500" /><b>{absent}</b> Absent</p><p className="text-slate-500 dark:text-slate-300"><b>{recorded}</b> Recorded</p><p className="text-xs text-slate-400">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading live data…"}</p></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between"><h2 className="text-xl">Recent Announcements</h2><button onClick={() => navigate("/announcements")} className="text-sm font-bold text-violet-600">View all</button></div>
          <div className="mt-4 space-y-3">{overview.announcements.map((item) => <button key={item.id} onClick={() => navigate("/announcements")} className="flex w-full gap-3 rounded-xl bg-slate-50 p-3 text-left dark:bg-slate-900"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600"><Bell size={17} /></span><span className="min-w-0"><b className="block truncate text-sm">{item.title}</b><small className="line-clamp-1 text-slate-500 dark:text-slate-300">{item.message}</small><small className="text-xs text-slate-400">{formatDate(item.created_at)}</small></span></button>)}{!overview.announcements.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-900">No announcements yet.</p>}</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between"><h2 className="text-xl">Upcoming Academic Events</h2><button onClick={() => navigate("/calendar")} className="text-sm font-bold text-violet-600">View all</button></div>
          <div className="mt-4 space-y-3">{overview.events.map((item) => <button key={item.id} onClick={() => navigate("/calendar")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left dark:border-slate-700"><span className="grid min-w-12 rounded-lg bg-violet-100 px-2 py-1 text-center text-violet-700"><b className="text-lg leading-none">{new Date(`${item.start_date}T00:00:00`).getDate()}</b><small className="uppercase">{new Date(`${item.start_date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</small></span><span className="min-w-0"><b className="block truncate text-sm">{item.title}</b><small className="text-slate-500 dark:text-slate-300">{item.kind}</small></span></button>)}{!overview.events.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500 dark:bg-slate-900">No upcoming events.</p>}</div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <h2 className="text-xl">Quick Actions</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Open a management area to complete an action.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.map(([label, Icon, path]) => <button key={label} onClick={() => navigate(path)} className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-left font-bold text-violet-800 transition hover:border-violet-400 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100"><span className="grid size-9 place-items-center rounded-lg bg-white text-violet-600 dark:bg-slate-800"><Icon size={18} /></span>{label}<Plus className="ml-auto" size={15} /></button>)}</div>
        </Card>
        <Card>
          <h2 className="text-xl">Recent Activity</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Latest administrative updates</p>
          <div className="mt-4 space-y-4">{activity.map((item) => <div key={item.id} className="flex gap-3"><i className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.tone}`} /><span><p className="text-sm font-semibold">{item.text}</p><small className="text-slate-400">{formatDate(item.date)}</small></span></div>)}{!activity.length && <p className="text-sm text-slate-500">No recent activity.</p>}</div>
        </Card>
      </div>
    </div>
  );
}
