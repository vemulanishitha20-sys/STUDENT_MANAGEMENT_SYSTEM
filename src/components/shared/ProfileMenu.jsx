import { useEffect, useRef, useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";

export default function ProfileMenu({ user, role }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const name = user?.name || (role === "admin" ? "Nissar" : role);
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:border-violet-300 dark:border-slate-600 dark:bg-slate-800" aria-expanded={open} aria-label="Open user details">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-campus font-extrabold text-white">{initial}</span>
        <span className="hidden min-w-0 text-left sm:block">
          <b className="block max-w-36 truncate text-sm">{name}</b>
          <small className="block capitalize text-slate-500 dark:text-slate-300">{role}</small>
        </span>
        <ChevronDown size={15} className={`hidden text-slate-400 transition sm:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="absolute right-0 top-[calc(100%+10px)] z-[70] w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-600 dark:bg-slate-800">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-700"><span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200"><UserRound size={21} /></span><span className="min-w-0"><b className="block truncate">{name}</b><small className="capitalize text-slate-500 dark:text-slate-300">{role} account</small></span></div>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-slate-500 dark:text-slate-300">User ID</dt><dd className="truncate font-semibold">{user?.id || "ADMIN001"}</dd></div>
          {user?.department && <div className="flex justify-between gap-3"><dt className="text-slate-500 dark:text-slate-300">Branch</dt><dd className="font-semibold">{user.department}</dd></div>}
          {user?.year && <div className="flex justify-between gap-3"><dt className="text-slate-500 dark:text-slate-300">Year</dt><dd className="font-semibold">Year {user.year}</dd></div>}
          {user?.section && <div className="flex justify-between gap-3"><dt className="text-slate-500 dark:text-slate-300">Section</dt><dd className="font-semibold">{user.section}</dd></div>}
        </dl>
      </div>}
    </div>
  );
}
