import { useState } from "react";
import { Plus, X } from "lucide-react";
import { SUBJECTS } from "../../lib/data";
export default function AccountModal({
  type,
  close,
  submit,
  assignedSubjectCodes = [],
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "CSE",
    year: 1,
    subjectCodes: [],
  });
  const field =
    "mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none focus:border-campus";
  const toggle = (code) =>
    setForm({
      ...form,
      subjectCodes: form.subjectCodes.includes(code)
        ? form.subjectCodes.filter((item) => item !== code)
        : [...form.subjectCodes, code],
    });
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className={`relative my-4 w-full ${type === "teachers" ? "max-w-3xl" : "max-w-md"} rounded-3xl bg-white p-7 text-center shadow-2xl`}
      >
        <button
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-stone-100"
          onClick={close}
        >
          <X />
        </button>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-100 text-campus">
          <Plus />
        </span>
        <h2 className="mt-4 text-2xl">
          Add a new {type === "teachers" ? "teacher" : "student"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          The ID is generated automatically and never reused.
        </p>
        <div className="grid gap-x-4 md:grid-cols-2">
          <label className="mt-5 block text-left text-sm font-bold">
            Full name *
            <input
              autoFocus
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="mt-5 block text-left text-sm font-bold">
            Email address{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <input
              type="email"
              className={field}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          {type === "students" && (
            <>
              <label className="mt-4 block text-left text-sm font-bold">
                Branch
                <select
                  className={field}
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                >
                  <option>CSE</option>
                  <option>ECE</option>
                </select>
              </label>
              <label className="mt-4 block text-left text-sm font-bold">
                Year
                <select
                  className={field}
                  value={form.year}
                  onChange={(e) =>
                    setForm({ ...form, year: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        {type === "teachers" && (
          <section className="mt-6 text-left">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-lg">Assign subjects</h3>
                <p className="text-xs text-slate-400">
                  Choose any subjects across branches and years.
                </p>
              </div>
              <span className="text-xs font-bold text-campus">
                {form.subjectCodes.length} selected
              </span>
            </div>
            <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-stone-200">
              <div className="grid sm:grid-cols-2">
                {SUBJECTS.map((subject) => {
                  const assigned = assignedSubjectCodes.includes(subject.code);
                  return (
                    <label
                      key={subject.code}
                      className={`flex items-start gap-3 border-b border-stone-100 p-3 ${assigned ? "cursor-not-allowed bg-stone-100 opacity-55" : "cursor-pointer hover:bg-violet-50"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={assigned}
                        className="mt-1 size-4 accent-violet-600"
                        checked={form.subjectCodes.includes(subject.code)}
                        onChange={() => toggle(subject.code)}
                      />
                      <span>
                        <b className="block text-sm">{subject.name}</b>
                        <small className="text-slate-400">
                          {subject.code} · {subject.department} · Year{" "}
                          {subject.year}
                        </small>
                        {assigned && (
                          <small className="ml-2 font-bold text-red-400">
                            Assigned
                          </small>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        )}
        <button
          className="mt-6 w-full rounded-xl bg-campus py-3 font-bold text-white disabled:opacity-40"
          disabled={!form.name}
          onClick={() => submit(form)}
        >
          Create account
        </button>
        <small className="mt-3 block text-slate-400">
          Default password: 987654321
        </small>
      </div>
    </div>
  );
}
