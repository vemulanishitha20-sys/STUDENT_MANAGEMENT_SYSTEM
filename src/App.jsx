import { useEffect, useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Login from "./components/auth/Login";
import Sidebar from "./components/admin/Sidebar";
import StudentPortal from "./components/portals/StudentPortal";
import TeacherPortal from "./components/portals/TeacherPortal";
import ConfirmDialog from "./components/shared/ConfirmDialog";
import PageIntro from "./components/shared/PageIntro";
import ProfileMenu from "./components/shared/ProfileMenu";
import Toast from "./components/shared/Toast";
import AppRoutes from "./routes/AppRoutes";
import {
  ADMIN_CREDENTIALS,
  getLocal,
  saveLocal,
  seed,
  supabase,
} from "./lib/data";
export default function App() {
  const [session, setSession] = useState(() =>
      JSON.parse(sessionStorage.getItem("campus-session") || "null"),
    ),
    [data, setData] = useState(seed),
    [nav, setNav] = useState(false),
    [toast, setToast] = useState(""),
    [confirmingLogout, setConfirmingLogout] = useState(false),
    [dark, setDark] = useState(
      () => localStorage.getItem("campus-theme") === "dark",
    );
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("campus-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const refreshData = async () => {
      if (supabase) {
        const [t, s] = await Promise.all([
          supabase
            .from("teachers")
            .select("*,teacher_subjects(subjects(code,name,department,year))")
            .order("created_at"),
          supabase.from("students").select("*").order("created_at"),
        ]);
        if (!t.error && !s.error) {
          setData({ teachers: t.data, students: s.data });
        } else {
          flash("Database is unavailable. Student records could not be loaded.");
        }
      } else setData(getLocal());
    };
    refreshData();
    window.addEventListener("focus", refreshData);
    return () => window.removeEventListener("focus", refreshData);
  }, []);
  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase
      .channel("student-attendance-live-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "students" },
        ({ new: updatedStudent }) => {
          setData((current) => ({
            ...current,
            students: current.students.map((student) =>
              student.id === updatedStudent.id
                ? { ...student, ...updatedStudent }
                : student,
            ),
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const flash = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };
  const login = async (role, id, password) => {
    let ok = false,
      user = { role, id, name: role };
    if (role === "admin")
      ok =
        id === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password;
    else if (supabase) {
      const { data: r } = await supabase.rpc("campus_login", {
        p_role: role,
        p_id: id,
        p_password: password,
      });
      ok = !!r?.length;
      if (ok) user = { ...user, ...r[0] };
    } else {
      const row = data[role + "s"]?.find((x) => x.id.toUpperCase() === id);
      ok = !!row && password === "987654321";
      if (ok) user = { ...user, ...row };
    }
    if (ok) {
      setSession(user);
      sessionStorage.setItem("campus-session", JSON.stringify(user));
    }
    return ok;
  };
  const logout = () => {
    flash("Logged out successfully");
    setConfirmingLogout(false);
    setSession(null);
    sessionStorage.removeItem("campus-session");
  };
  const add = async (type, form) => {
    if (supabase) {
      try {
        const { data: r, error } = await supabase.rpc(
          type === "teachers" ? "create_teacher" : "create_student",
          {
            p_name: form.name,
            p_email: form.email,
            p_department: form.department,
            p_year: form.year,
            ...(type === "teachers"
              ? { p_subject_codes: form.subjectCodes || [] }
              : {}),
          },
        );
        const created = r?.[0];
        if (!error && created) {
          let saved = created;
          if (type === "teachers") {
            const { data: fullTeacher } = await supabase
              .from("teachers")
              .select("*,teacher_subjects(subjects(code,name,department,year))")
              .eq("id", created.id)
              .single();
            if (fullTeacher) saved = fullTeacher;
          }
          setData((d) => ({ ...d, [type]: [...d[type], saved] }));
          flash("Account created successfully");
          return true;
        }
        flash(error?.message || "The account could not be saved to the database.");
        return false;
      } catch (error) {
        flash(error.message || "The account could not be saved to the database.");
        return false;
      }
    }

    const studentPrefixes = {
        CSE: { 1: "26611A", 2: "25612A", 3: "24613A", 4: "23614A" },
        ECE: { 1: "26611B", 2: "25612B", 3: "24613B", 4: "23614B" },
      },
      prefix =
        type === "teachers"
          ? "TCH"
          : studentPrefixes[form.department]?.[Number(form.year)],
      nums = data[type].map((x) => parseInt(x.id.slice(prefix.length)) || 0),
      used = JSON.parse(localStorage.getItem("campus-counters") || "{}"),
      n = Math.max(used[prefix] || 0, ...nums) + 1,
      next = {
        ...data,
        [type]: [
          ...data[type],
          {
            ...form,
            id: prefix + String(n).padStart(type === "teachers" ? 3 : 2, "0"),
            is_active: true,
            attended_classes: 0,
            total_classes: 0,
          },
        ],
      };
    used[prefix] = n;
    localStorage.setItem("campus-counters", JSON.stringify(used));
    setData(next);
    saveLocal(next);
    flash("Account saved to this browser. Database is unavailable.");
    return true;
  };
  const remove = async (type, id) => {
    if (supabase) {
      const { error } = await supabase.from(type).delete().eq("id", id);
      if (error) return flash(error.message);
    }
    const next = { ...data, [type]: data[type].filter((x) => x.id !== id) };
    setData(next);
    if (!supabase) saveLocal(next);
    flash("Record removed — ID remains retired");
  };
  const toggleActive = async (type, id, isActive) => {
    if (supabase) {
      const { error } = await supabase
        .from(type)
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) return flash(error.message);
    }
    const next = {
      ...data,
      [type]: data[type].map((row) =>
        row.id === id ? { ...row, is_active: !isActive } : row,
      ),
    };
    setData(next);
    if (!supabase) saveLocal(next);
    flash(`Account marked ${!isActive ? "active" : "inactive"}`);
  };
  const editStudent = async (id, form) => {
    let updated = { ...form, id };
    if (supabase) {
      const { data: result, error } = await supabase.rpc("update_student", {
        p_id: id,
        p_name: form.name,
        p_email: form.email,
        p_department: form.department,
        p_year: form.year,
      });
      if (error) return flash(error.message);
      updated = result[0];
    }
    setData((current) => ({
      ...current,
      students: current.students.map((row) =>
        row.id === id ? { ...row, ...updated } : row,
      ),
    }));
    flash("Student updated successfully");
  };
  const updateStudentAttendance = (results) => {
    const totalsByStudent = new Map(
      results.map((result) => [result.student_id, result]),
    );
    setData((current) => ({
      ...current,
      students: current.students.map((student) => {
        const totals = totalsByStudent.get(student.id);
        return totals ? { ...student, ...totals } : student;
      }),
    }));
  };
  const editTeacherSubjects = async (id, subjectCodes) => {
    if (supabase) {
      const { error } = await supabase.rpc("update_teacher_subjects", {
        p_teacher_id: id,
        p_subject_codes: subjectCodes,
      });
      if (error) return flash(error.message);
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*,teacher_subjects(subjects(code,name,department,year))")
        .eq("id", id)
        .single();
      if (teacher)
        setData((current) => ({
          ...current,
          teachers: current.teachers.map((row) =>
            row.id === id ? teacher : row,
          ),
        }));
    }
    flash("Teacher subjects updated");
  };
  if (!session) return <Login onLogin={login} toast={toast} />;
  const logoutDialog = confirmingLogout && (
    <ConfirmDialog
      title="Log out"
      message="Do you want to log out?"
      confirmLabel="Yes"
      cancelLabel="No"
      onCancel={() => setConfirmingLogout(false)}
      onConfirm={logout}
    />
  );
  if (session.role === "teacher")
    return (
      <>
        <TeacherPortal
          session={session}
          logout={() => setConfirmingLogout(true)}
        />
        {logoutDialog}
      </>
    );
  if (session.role !== "admin")
    return (
      <>
        <StudentPortal
          session={session}
          logout={() => setConfirmingLogout(true)}
        />
        {logoutDialog}
      </>
    );
  const title = location.pathname.includes("teacher")
    ? "Teachers"
    : location.pathname.includes("student")
      ? "Students"
      : location.pathname.includes("subjects")
        ? "Subjects"
      : location.pathname.includes("attendance")
        ? "Attendance"
      : location.pathname.includes("calendar")
        ? "Academic Calendar"
      : location.pathname.includes("announcement")
        ? "Announcements"
        : location.pathname.includes("schedule")
          ? "Class Schedule"
        : "Your campus at a glance";
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:pl-64">
      <Sidebar
        logout={() => setConfirmingLogout(true)}
        open={nav}
        close={() => setNav(false)}
      />
      <main data-portal="admin" className="flex h-screen min-w-0 flex-col overflow-y-auto px-4 pb-4 sm:px-7 lg:px-10 xl:px-14">
        <header className="flex min-h-16 shrink-0 items-center gap-4 py-2">
          <button
            className="rounded-xl border border-stone-200 bg-white p-2 text-slate-600 lg:hidden"
            onClick={() => setNav(true)}
          >
            <Menu size={22} />
          </button>
          {location.pathname === "/" ? (
            <div className="flex-1" />
          ) : (
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl leading-tight text-[#292640] sm:text-3xl">
                {title}
              </h1>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="grid size-11 place-items-center rounded-full border border-stone-200 bg-white text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:border-amber-300 dark:hover:bg-slate-700"
              aria-label={
                dark ? "Switch to light theme" : "Switch to dark theme"
              }
              title={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? <Sun size={21} /> : <Moon size={21} />}
            </button>
            <ProfileMenu user={{ id: session?.id || "ADMIN001", name: "Nissar" }} role="admin" />
          </div>
        </header>
        {location.pathname !== "/" && (
          <PageIntro
            title={title}
            onBack={() => navigate("/")}
            subtitle={
              location.pathname.includes("teacher") ? "Manage faculty accounts and assigned subjects."
                : location.pathname.includes("student") ? "Manage student records and account access."
                  : location.pathname.includes("subjects") ? "Browse subjects by branch and year with assigned faculty."
                  : location.pathname.includes("attendance") ? "Review classes and record daily attendance."
                    : location.pathname.includes("announcement") ? "Publish and manage campus announcements."
                      : location.pathname.includes("calendar") ? "Manage holidays, exams and important academic dates."
                        : "Plan and manage the weekly class timetable."
            }
          />
        )}
        <AppRoutes
          data={data}
          add={add}
          remove={remove}
          toggleActive={toggleActive}
          editStudent={editStudent}
          editTeacherSubjects={editTeacherSubjects}
          updateStudentAttendance={updateStudentAttendance}
        />
      </main>
      <Toast message={toast} />
      {logoutDialog}
    </div>
  );
}
