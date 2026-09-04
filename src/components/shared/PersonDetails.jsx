import { Mail, X } from "lucide-react";
export default function PersonDetails({ person, type, close }) {
  const subjects =
    person.teacher_subjects?.map((item) => item.subjects).filter(Boolean) || [];
  const attendancePercentage = person.total_classes
    ? Math.round((person.attended_classes / person.total_classes) * 100)
    : 0;
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl dark:bg-slate-800">
        <button
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-stone-100"
          onClick={close}
        >
          <X />
        </button>
        <span className="grid size-14 place-items-center rounded-full bg-violet-100 text-xl font-bold text-campus">
          {person.name[0]}
        </span>
        <h2 className="mt-4 max-w-full break-all pr-8 text-2xl leading-tight">
          {person.name}
        </h2>
        <p className="font-mono text-sm text-campus">{person.id}</p>
        <div className="mt-5 space-y-3 rounded-2xl bg-stone-50 p-4 text-sm">
          <div>
            <span className="block text-xs text-slate-400">Email</span>
            <b className="flex items-center gap-2 break-all">
              <Mail size={15} />
              {person.email || "Not provided"}
            </b>
          </div>
          {type === "students" && (
            <div>
              <span className="block text-xs text-slate-400">Attendance</span>
              <b
                className={
                  attendancePercentage < 75
                    ? "text-red-500"
                    : "text-emerald-600"
                }
              >
                {attendancePercentage}%
              </b>
            </div>
          )}
          <div>
            <span className="block text-xs text-slate-400">Branch / Year</span>
            <b>
              {person.department} · Year {person.year || 1}
            </b>
          </div>
          <div>
            <span className="block text-xs text-slate-400">Status</span>
            <b
              className={
                person.is_active === false ? "text-red-500" : "text-emerald-600"
              }
            >
              {person.is_active === false ? "Inactive" : "Active"}
            </b>
          </div>
        </div>
        {type === "teachers" && (
          <div className="mt-5">
            <h3 className="text-lg">Assigned subjects, branches and years</h3>
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
              {subjects.length ? (
                subjects.map((subject) => (
                  <div
                    key={subject.code}
                    className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-campus"
                  >
                    {subject.name} · {subject.department} Y{subject.year}
                  </div>
                ))
              ) : (
                <span className="text-sm text-slate-400">
                  No subjects assigned
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
