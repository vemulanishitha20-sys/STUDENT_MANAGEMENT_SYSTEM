import { Bell, BookOpen, CalendarCheck, CalendarDays, CalendarRange, GraduationCap, LayoutDashboard, LogOut, Users, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import Brand from "../shared/Brand";
const links = [
  ["/", LayoutDashboard, "Dashboard"],
  ["/teachers", Users, "Teachers"],
  ["/students", GraduationCap, "Students"],
  ["/subjects", BookOpen, "Subjects"],
  ["/attendance", CalendarCheck, "Attendance"],
  ["/announcements", Bell, "Announcements"],
  ["/schedule", CalendarDays, "Class Schedule"],
  ["/calendar", CalendarRange, "Academic Calendar"],
];
export default function Sidebar({ logout, open, close }) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white px-6 py-8 transition-transform dark:border-slate-700 dark:bg-slate-900 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="pr-8">
          <Brand />
        </div>
        <button
          className="absolute right-4 top-5 rounded-lg p-2 text-slate-500 lg:hidden"
          onClick={close}
        >
          <X />
        </button>
        <nav className="mt-14 flex flex-col gap-2">
          {links.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-4 text-base transition ${isActive ? "bg-violet-100 font-bold text-campus dark:bg-violet-900/40" : "text-slate-500 hover:bg-stone-50 dark:hover:bg-slate-800"}`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <button
            className="flex w-full items-center gap-3 border-t border-stone-200 px-4 pt-5 text-slate-500 hover:text-red-500 dark:border-slate-700"
            onClick={logout}
          >
            <LogOut size={20} />
            Log out
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={close}
        />
      )}
    </>
  );
}
