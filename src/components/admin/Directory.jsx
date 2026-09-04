import { useMemo, useState } from "react";
import { Filter, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AccountModal from "./AccountModal";
import PersonDetails from "../shared/PersonDetails";
import StudentEditModal from "./StudentEditModal";
import TeacherEditModal from "./TeacherEditModal";
import ConfirmDialog from "../shared/ConfirmDialog";
const attendance = (student) =>
  student.total_classes
    ? Math.round((student.attended_classes / student.total_classes) * 100)
    : 0;
export default function Directory({
  type,
  rows,
  add,
  remove,
  toggleActive,
  editStudent,
  editTeacherSubjects,
}) {
  const [show, setShow] = useState(false),
    [query, setQuery] = useState(""),
    [branch, setBranch] = useState("All"),
    [year, setYear] = useState("All"),
    [lowAttendanceOnly, setLowAttendanceOnly] = useState(false),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(null),
    [editingTeacher, setEditingTeacher] = useState(null),
    [pendingDelete, setPendingDelete] = useState(null);
  const assignedSubjectCodes = rows.flatMap(
    (row) =>
      row.teacher_subjects
        ?.map((item) => item.subjects?.code)
        .filter(Boolean) || [],
  );
  const matchesFilters = (r, includeAttendance = true) => {
        const assignments =
          r.teacher_subjects?.map((item) => item.subjects).filter(Boolean) ||
          [];
        const searchText = [
          r.name,
          r.id,
          r.email || "",
          r.department,
          ...assignments.map((s) => `${s.name} ${s.department} ${s.year}`),
        ]
          .join(" ")
          .toLowerCase();
        const branchMatch =
          branch === "All" ||
          (type === "teachers"
            ? assignments.some((s) => s.department === branch)
            : r.department === branch);
        const yearMatch =
          year === "All" ||
          (type === "teachers"
            ? assignments.some(
                (s) =>
                  Number(s.year) === Number(year) &&
                  (branch === "All" || s.department === branch),
              )
            : Number(r.year) === Number(year));
        const attendanceMatch =
          !includeAttendance ||
          type !== "students" ||
          !lowAttendanceOnly ||
          attendance(r) < 75;
        return (
          searchText.includes(query.toLowerCase()) &&
          branchMatch &&
          yearMatch &&
          attendanceMatch
        );
      };
  const scopedRows = useMemo(
    () => rows.filter((row) => matchesFilters(row, false)),
    [rows, query, branch, year, type],
  );
  const filtered = useMemo(
    () => rows.filter((row) => matchesFilters(row)),
    [rows, query, branch, year, lowAttendanceOnly, type],
  );
  const hasFilters =
    query || branch !== "All" || year !== "All" || lowAttendanceOnly;
  const studentStats = {
    total: scopedRows.length,
    active: scopedRows.filter((row) => row.is_active !== false).length,
    lowAttendance: scopedRows.filter((row) => attendance(row) < 75).length,
  };
  const selectedPerson = selected
    ? rows.find((row) => row.id === selected.id) || selected
    : null;
  const clearFilters = () => {
    setQuery("");
    setBranch("All");
    setYear("All");
    setLowAttendanceOnly(false);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {type === "students" && (
        <div className="mb-4 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-blue-950 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-50">
            <p className="text-xs font-bold uppercase tracking-wider">
              Total students
            </p>
            <strong className="mt-1 block text-2xl">
              {studentStats.total}
            </strong>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-orange-950 dark:border-orange-500 dark:bg-orange-950 dark:text-orange-50">
            <p className="text-xs font-bold uppercase tracking-wider">
              Active students
            </p>
            <strong className="mt-1 block text-2xl">
              {studentStats.active}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setLowAttendanceOnly((value) => !value)}
            aria-pressed={lowAttendanceOnly}
            title="Show only students below 75% attendance"
            className={`rounded-2xl border px-5 py-3 text-left text-red-950 transition focus:outline-none focus:ring-2 focus:ring-red-400 dark:text-red-50 ${lowAttendanceOnly ? "border-red-500 bg-red-100 ring-2 ring-red-400 dark:bg-red-900" : "border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 dark:border-red-500 dark:bg-red-950"}`}
          >
            <p className="text-xs font-bold uppercase tracking-wider">
              Below 75% attendance
            </p>
            <strong className="mt-1 block text-2xl">
              {studentStats.lowAttendance}
            </strong>
            <span className="mt-1 block text-xs font-semibold">
              {lowAttendanceOnly ? "Showing below 75%" : "Click to filter"}
            </span>
          </button>
        </div>
      )}
      <div className="sticky top-0 z-20 -mx-1 grid gap-3 bg-[#fbfaf7] px-1 pb-4 pt-1 md:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
        <label className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={19}
          />
          <input
            className="h-12 w-full rounded-xl border border-stone-300 bg-white pl-11 pr-4 outline-none focus:border-campus focus:ring-2 focus:ring-violet-100"
            placeholder={`Search ${type}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Filter size={18} className="shrink-0 text-campus" />
          <select
            className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 sm:min-w-28"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="All">All branches</option>
            <option>CSE</option>
            <option>ECE</option>
          </select>
          <select
            className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 sm:min-w-28"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="All">All years</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={!hasFilters}
          onClick={clearFilters}
          title="Clear search and filters"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <X size={18} />
        </button>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-campus px-5 font-bold text-white hover:bg-violet-700"
          onClick={() => setShow(true)}
        >
          <Plus size={19} />
          Add {type === "teachers" ? "teacher" : "student"}
        </button>
      </div>
      <div className="mb-3">
        <h2 className="text-xl">
          {type === "teachers" ? "Teaching team" : "Student community"}
        </h2>
      </div>
      <div className="hidden min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-sm lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-stone-50 text-[11px] uppercase tracking-wider text-slate-400 shadow-[0_1px_0_#e7e5e4]">
            <tr>
              <th className="w-[18%] px-4 py-4">Name</th>
              <th className="w-[16%] px-4 py-4">Campus ID</th>
              {type === "teachers" && (
                <th className="w-[28%] px-4 py-4">Assigned subjects</th>
              )}
              {type === "students" && (
                <>
                  <th className="w-[14%] px-4 py-4">Year</th>
                  <th className="w-[14%] px-4 py-4">Branch</th>
                  <th className="w-[14%] px-4 py-4">Attendance</th>
                </>
              )}
              <th className="w-[11%] px-4 py-4">Status</th>
              <th className="w-[13%] px-4 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((r, i) => (
              <tr
                key={r.id}
                className={`group transition hover:bg-violet-50/40 ${pendingDelete?.id === r.id ? "bg-red-50 ring-2 ring-inset ring-red-400 dark:bg-red-950/60" : ""}`}
              >
                <td className="px-4 py-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full font-bold ${["bg-orange-100 text-orange-600", "bg-violet-100 text-campus", "bg-emerald-100 text-emerald-700"][i % 3]}`}
                    >
                      {r.name[0]}
                    </span>
                    <button
                      onClick={() => setSelected(r)}
                      className="min-w-0 flex-1 whitespace-normal break-words text-left text-sm font-bold leading-5 text-slate-800 hover:text-campus hover:underline"
                    >
                      {r.name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-5">
                  <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 font-mono text-xs font-semibold text-campus">
                    {r.id}
                  </span>
                </td>
                {type === "teachers" && (
                  <td className="px-4 py-4 text-xs text-slate-500">
                    <div className="flex flex-wrap gap-1.5">
                      {r.teacher_subjects?.length ? (
                        r.teacher_subjects.map((item) => (
                          <span
                            key={item.subjects?.code}
                            className="rounded-md bg-violet-50 px-2 py-1 font-semibold text-campus"
                          >
                            {item.subjects?.name} · {item.subjects?.department}{" "}
                            · Year {item.subjects?.year}
                          </span>
                        ))
                      ) : (
                        <span className="italic text-slate-300">
                          Not assigned
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {type === "students" && (
                  <>
                    <td className="px-4 py-5 text-sm font-semibold">
                      Year {r.year || 1}
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold">
                      {r.department}
                    </td>
                  </>
                )}
                {type === "students" && (
                  <td className="px-4 py-5">
                    <span
                      className={`inline-flex items-center gap-2 font-bold ${attendance(r) < 75 ? "text-red-500" : "text-emerald-600"}`}
                    >
                      <i
                        className={`size-2 rounded-full ${attendance(r) < 75 ? "bg-red-500" : "bg-emerald-500"}`}
                      />
                      {attendance(r)}%
                    </span>
                  </td>
                )}
                <td className="px-4 py-5">
                  <button
                    onClick={() =>
                      toggleActive(type, r.id, r.is_active !== false)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${r.is_active === false ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    <i
                      className={`size-1.5 rounded-full ${r.is_active === false ? "bg-red-500" : "bg-emerald-500"}`}
                    />
                    {r.is_active === false ? "Inactive" : "Active"}
                  </button>
                </td>
                <td className="px-4 py-5 text-center">
                  <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                    {type === "teachers" && (
                      <button
                        className="grid size-9 place-items-center rounded-lg border border-violet-200 bg-violet-50 text-campus transition hover:bg-violet-100"
                        title="Edit assigned subjects"
                        onClick={() => setEditingTeacher(r)}
                      >
                        <Pencil size={17} />
                      </button>
                    )}
                    {type === "students" && (
                      <button
                        className="grid size-9 place-items-center rounded-lg border border-violet-200 bg-violet-50 text-campus transition hover:bg-violet-100"
                        title="Edit student"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil size={17} />
                      </button>
                    )}
                    <button
                      className="grid size-9 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100"
                      title="Delete record"
                      onClick={() => setPendingDelete(r)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={type === "students" ? 6 : 5}
                  className="p-14 text-center text-slate-400"
                >
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-x-hidden overflow-y-auto pb-3 lg:hidden sm:grid-cols-2">
        {filtered.map((r, i) => (
          <article
            key={r.id}
            className={`rounded-2xl border bg-white p-5 text-base shadow-sm ${pendingDelete?.id === r.id ? "border-red-400 ring-2 ring-red-400 dark:bg-red-950/60" : "border-stone-200"}`}
          >
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 place-items-center rounded-full bg-violet-100 font-bold text-campus">
                {type === "students" && (
                  <i
                    className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white ${attendance(r) < 75 ? "bg-red-500" : "bg-emerald-500"}`}
                  />
                )}
                {r.name[0]}
              </span>
              <button
                onClick={() => setSelected(r)}
                className="min-w-0 flex-1 whitespace-normal break-words text-left text-lg font-bold leading-6 hover:text-campus"
              >
                {r.name}
              </button>
              <button
                onClick={() => toggleActive(type, r.id, r.is_active !== false)}
                className={`rounded-lg px-2 py-1 text-xs font-bold ${r.is_active === false ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}
              >
                {r.is_active === false ? "Inactive" : "Active"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
              <span className="rounded-lg bg-violet-50 p-2 text-campus">
                {r.id}
              </span>
              <span className="rounded-lg bg-stone-100 p-2">
                {r.department} · Year {r.year || 1}
              </span>
            </div>
            {type === "students" && (
              <p
                className={`mt-3 text-sm font-bold ${attendance(r) < 75 ? "text-red-500" : "text-emerald-600"}`}
              >
                Attendance: {attendance(r)}%
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <div className="inline-flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
                {type === "teachers" && (
                  <button
                    className="rounded-lg p-2 text-campus hover:bg-violet-100"
                    onClick={() => setEditingTeacher(r)}
                  >
                    <Pencil size={17} />
                  </button>
                )}
                {type === "students" && (
                  <button
                    className="rounded-lg p-2 text-campus hover:bg-violet-100"
                    onClick={() => setEditing(r)}
                  >
                    <Pencil size={17} />
                  </button>
                )}
                <button
                  className="rounded-lg p-2 text-red-500 hover:bg-red-100"
                  onClick={() => setPendingDelete(r)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {show && (
        <AccountModal
          type={type}
          close={() => setShow(false)}
          submit={async (form) => {
            if (
              window.confirm(
                `Create ${type === "teachers" ? "teacher" : "student"} account for ${form.name}?`,
              )
            ) {
              const created = await add(type, form);
              if (created) setShow(false);
            }
          }}
          assignedSubjectCodes={assignedSubjectCodes}
        />
      )}
      {selected && (
        <PersonDetails
          person={selectedPerson}
          type={type}
          close={() => setSelected(null)}
        />
      )}
      {editing && (
        <StudentEditModal
          student={editing}
          close={() => setEditing(null)}
          submit={(form) => {
            editStudent(editing.id, form);
            setEditing(null);
          }}
        />
      )}
      {editingTeacher && (
        <TeacherEditModal
          teacher={editingTeacher}
          assignedByOthers={rows
            .filter((row) => row.id !== editingTeacher.id)
            .flatMap(
              (row) =>
                row.teacher_subjects
                  ?.map((item) => item.subjects?.code)
                  .filter(Boolean) || [],
            )}
          close={() => setEditingTeacher(null)}
          submit={(codes) => {
            editTeacherSubjects(editingTeacher.id, codes);
            setEditingTeacher(null);
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Confirm delete"
          message="Are you sure you want to delete"
          highlight={pendingDelete.name}
          messageAfter="permanently?"
          confirmLabel="Yes"
          cancelLabel="No"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            remove(type, pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
