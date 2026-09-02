import { useState } from "react";
import { X } from "lucide-react";
export default function StudentEditModal({ student, close, submit }) {
  const [form, setForm] = useState({
    name: student.name,
    email: student.email || "",
    department: student.department,
    year: student.year || 1,
  });
  const field =
    "mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 outline-none focus:border-campus";
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <button
          className="absolute right-4 top-4 rounded-lg p-2"
          onClick={close}
        >
          <X />
        </button>
        <h2 className="text-2xl">Edit student</h2>
        <p className="text-sm text-slate-400">
          ID {student.id} will remain unchanged.
        </p>
        <label className="mt-5 block text-sm font-bold">
          Name
          <input
            className={field}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="mt-4 block text-sm font-bold">
          Email <span className="font-normal text-slate-400">(optional)</span>
          <input
            className={field}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="mt-4 block text-sm font-bold">
            Branch
            <select
              className={field}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              <option>CSE</option>
              <option>ECE</option>
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold">
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
        </div>
        <button
          className="mt-6 w-full rounded-xl bg-campus py-3 font-bold text-white"
          onClick={() => submit(form)}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
