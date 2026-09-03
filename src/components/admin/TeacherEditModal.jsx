import { useState } from "react";
import { X } from "lucide-react";
import { SUBJECTS } from "../../lib/data";
export default function TeacherEditModal({
  teacher,
  assignedByOthers,
  close,
  submit,
}) {
  const current =
    teacher.teacher_subjects
      ?.map((item) => item.subjects?.code)
      .filter(Boolean) || [];
  const [selected, setSelected] = useState(current);
  const toggle = (code) =>
    setSelected(
      selected.includes(code)
        ? selected.filter((value) => value !== code)
        : [...selected, code],
    );
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-900/40 p-4">
      <div className="relative my-4 w-full max-w-3xl rounded-3xl bg-white p-7 shadow-2xl">
        <button
          className="absolute right-4 top-4 rounded-lg p-2"
          onClick={close}
        >
          <X />
        </button>
        <h2 className="text-2xl">Edit teacher subjects</h2>
        <p className="text-sm text-slate-400">
          {teacher.name} · {teacher.id}
        </p>
        <div className="mt-5 max-h-[55vh] overflow-y-auto rounded-xl border border-stone-200">
          <div className="grid sm:grid-cols-2">
            {SUBJECTS.map((subject) => {
              const blocked = assignedByOthers.includes(subject.code);
              return (
                <label
                  key={subject.code}
                  className={`flex items-start gap-3 border-b p-3 ${blocked ? "cursor-not-allowed bg-stone-100 opacity-50" : "cursor-pointer hover:bg-violet-50"}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-violet-600"
                    disabled={blocked}
                    checked={selected.includes(subject.code)}
                    onChange={() => toggle(subject.code)}
                  />
                  <span>
                    <b className="block text-sm">{subject.name}</b>
                    <small className="text-slate-400">
                      {subject.code} · {subject.department} · Year{" "}
                      {subject.year}
                    </small>
                    {blocked && (
                      <small className="ml-2 font-bold text-red-500">
                        Assigned
                      </small>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-bold text-campus">
            {selected.length} subjects selected
          </span>
          <button
            className="rounded-xl bg-campus px-6 py-3 font-bold text-white"
            onClick={() => submit(selected)}
          >
            Save assignments
          </button>
        </div>
      </div>
    </div>
  );
}
