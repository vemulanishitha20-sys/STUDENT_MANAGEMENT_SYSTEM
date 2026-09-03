import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  title,
  message,
  highlight,
  messageAfter,
  confirmLabel,
  cancelLabel = "No",
  onConfirm,
  onCancel,
  tone = "danger",
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-slate-800 dark:text-white">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <X size={20} />
        </button>
        <span className={"mx-auto grid size-14 place-items-center rounded-full " + (tone === "primary" ? "bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300")}>
          <AlertTriangle size={27} />
        </span>
        <h2 className="mt-4 text-2xl">{title}</h2>
        <p className="mt-3 text-lg leading-7 text-slate-600 dark:text-slate-200">
          {message}{" "}
          {highlight && (
            <strong className="break-words text-slate-950 dark:text-white">
              {highlight}
            </strong>
          )}{" "}
          {messageAfter}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={"rounded-xl py-3 font-bold text-white " + (tone === "primary" ? "bg-campus hover:bg-violet-700" : "bg-red-600 hover:bg-red-700")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
