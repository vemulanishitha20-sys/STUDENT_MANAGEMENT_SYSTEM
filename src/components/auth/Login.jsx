import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Toast from "../shared/Toast";
export default function Login({ onLogin, toast }) {
  const [id, setId] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState("");
  const signIn = async () => {
    const cleanId = id.trim().toUpperCase(),
      cleanPassword = password.trim(),
      role = cleanId.startsWith("ADMIN")
        ? "admin"
        : cleanId.startsWith("TCH")
          ? "teacher"
          : "student";
    if (!cleanId || !cleanPassword)
      return setError("Please enter your ID and password.");
    if (/^(?:26611|25612|24613|23614)[AB]O\d$/i.test(cleanId))
      return setError(
        "Use zero (0), not the letter O. Example: 26611A01.",
      );
    if (!(await onLogin(role, cleanId, cleanPassword)))
      setError("That ID or password does not match.");
  };
  const field =
    "mt-2 h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:border-campus focus:ring-2 focus:ring-violet-100 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-50 dark:placeholder:text-slate-300 dark:focus:ring-violet-400/40";
  return (
    <div data-login className="grid min-h-[100dvh] place-items-center bg-gradient-to-br from-orange-50 to-violet-100 p-4 dark:from-slate-700 dark:to-violet-900/70 sm:p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-violet-200/60 dark:bg-slate-800 dark:shadow-slate-950/30 sm:p-10">
        <h1 className="text-center text-3xl text-[#292640] dark:text-slate-50 sm:text-4xl">Welcome back!</h1>
        <p className="mt-2 text-center text-base text-slate-500 dark:text-slate-200">
          Enter your details to sign in.
        </p>
        <label className="mt-7 block text-base font-bold dark:text-slate-100">
          Enter your ID
          <input
            className={field}
            value={id}
            placeholder="Enter your ID"
            autoComplete="username"
            onChange={(e) => {
              setId(e.target.value);
              setError("");
            }}
          />
        </label>
        <label className="mt-5 block text-base font-bold dark:text-slate-100">
          Password
          <div className="relative">
            <input
              className={`${field} pr-12`}
              type={show ? "text" : "password"}
              value={password}
              placeholder="Enter your password"
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && signIn()}
            />
            <button
              type="button"
              className="absolute right-2 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center text-slate-500 dark:text-slate-200"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        <Toast message={error} tone="error" onClose={() => setError("")} />
        <button
          className="mt-5 h-14 w-full rounded-xl bg-campus font-bold text-white hover:bg-violet-700"
          onClick={signIn}
        >
          Sign in →
        </button>
      </div>
      <Toast message={toast} tone="success" />
    </div>
  );
}
