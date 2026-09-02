import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
    "mt-2 h-14 w-full rounded-xl border border-stone-300 bg-white px-4 outline-none focus:border-campus focus:ring-2 focus:ring-violet-100";
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-orange-50 to-violet-100 p-5 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl shadow-violet-200/60 sm:p-10">
        <h1 className="text-center text-4xl text-[#292640]">Welcome back!</h1>
        <p className="mt-2 text-center text-slate-400">
          Enter your details to sign in.
        </p>
        <label className="mt-8 block text-sm font-bold">
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
        <label className="mt-5 block text-sm font-bold">
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
              className="absolute right-2 top-[calc(50%+4px)] grid size-10 -translate-y-1/2 place-items-center text-slate-500"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </label>
        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}
        <button
          className="mt-5 h-14 w-full rounded-xl bg-campus font-bold text-white hover:bg-violet-700"
          onClick={signIn}
        >
          Sign in →
        </button>
      </div>
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
