import { ArrowLeft, LayoutPanelTop } from "lucide-react";

export default function PageIntro({ title, subtitle, onBack }) {
  return (
    <div className="mt-3 shrink-0 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-white shadow-sm dark:border-violet-900/60 dark:from-violet-950/35 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-center gap-3 border-l-4 border-violet-600 px-4 py-4 sm:px-5">
        {onBack && (
          <button type="button" onClick={onBack} className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-400 hover:bg-violet-100 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-label="Back to dashboard" title="Back to dashboard">
            <ArrowLeft size={20} />
          </button>
        )}
        <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm sm:grid">
          <LayoutPanelTop size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold leading-tight tracking-tight text-[#292640] dark:text-white sm:text-[28px]">{title}</h1>
          <p className="mt-0.5 text-sm leading-5 text-slate-500 dark:text-slate-300">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
