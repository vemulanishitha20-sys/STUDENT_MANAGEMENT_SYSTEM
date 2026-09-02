import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const toKey = (date) =>
  date.getFullYear() +
  "-" +
  String(date.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(date.getDate()).padStart(2, "0");

export default function AttendanceCalendar({ value, onChange, markedDates = [], onClose }) {
  const selected = new Date(value + "T00:00:00");
  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const marked = useMemo(() => new Set(markedDates), [markedDates]);
  const today = toKey(new Date());

  useEffect(() => {
    setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  const firstDay = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];

  return (
    <div className="w-full rounded-2xl border border-violet-200 bg-white p-3 shadow-lg dark:border-violet-700 dark:bg-slate-900 sm:w-72">
      <div className="grid grid-cols-[36px_1fr_72px] items-center">
        <button type="button" aria-label="Previous month" className="rounded-lg p-2 hover:bg-violet-50 dark:hover:bg-slate-800" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft size={18} />
        </button>
        <strong className="text-center">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong>
        <span className="flex justify-end"><button type="button" aria-label="Next month" className="rounded-lg p-2 hover:bg-violet-50 dark:hover:bg-slate-800" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button>{onClose && <button type="button" aria-label="Close calendar" title="Close calendar" onClick={onClose} className="ml-1 grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><X size={17} /></button>}</span>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs font-bold text-slate-400">
        {"SMTWTFS".split("").map((day, index) => <span key={index}>{day}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={"blank-" + index} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const key = toKey(date);
          const sunday = date.getDay() === 0;
          const isSelected = key === value;
          const isMarked = marked.has(key);
          const future = key > today;
          const stateClass = isSelected
            ? "bg-campus text-white"
            : sunday || future
              ? "cursor-not-allowed text-red-300 line-through dark:text-red-800"
              : "hover:bg-violet-50 dark:hover:bg-slate-800";
          return (
            <button key={key} type="button" disabled={sunday || future} title={sunday ? "Attendance cannot be marked on Sunday" : future ? "Future attendance cannot be marked" : isMarked ? "Attendance marked" : undefined} onClick={() => onChange(key)} className={"relative grid aspect-square place-items-center rounded-lg text-sm font-semibold transition " + stateClass}>
              {day}
              {isMarked && <span aria-label="Attendance marked" className={"absolute bottom-1 size-1.5 rounded-full " + (isSelected ? "bg-emerald-300" : "bg-emerald-500")} />}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">
        <span className="size-2 rounded-full bg-emerald-500" /> Attendance marked
      </div>
    </div>
  );
}
