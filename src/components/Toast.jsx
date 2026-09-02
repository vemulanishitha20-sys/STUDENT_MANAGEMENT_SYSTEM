import { CheckCircle2, Info, XCircle, X } from "lucide-react";

export default function Toast({ message, onClose, tone = "info" }) {
  if (!message) return null;
  const error = tone === "error" || /error|cannot|failed|unavailable|not match/i.test(message);
  const Icon = error ? XCircle : tone === "success" ? CheckCircle2 : Info;
  return <div role="status" className={`fixed right-3 top-3 z-[100] flex w-[min(25rem,calc(100vw-1.5rem))] items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl sm:right-5 sm:top-5 ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100" : "border-violet-200 bg-white text-slate-700 dark:border-violet-700 dark:bg-slate-800 dark:text-white"}`}><Icon size={20} className={error ? "shrink-0 text-red-500" : "shrink-0 text-violet-600"} /><span className="min-w-0 flex-1 break-words">{message}</span>{onClose && <button type="button" onClick={onClose} className="shrink-0 rounded-md p-0.5" aria-label="Close notification"><X size={17} /></button>}</div>;
}
