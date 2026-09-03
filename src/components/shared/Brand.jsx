import jbietLogo from "../../assets/jbiet-logo.png";

export default function Brand() {
  return (
    <div className="flex items-center gap-3 font-sans text-xl font-extrabold tracking-[.08em] text-[#1f2937] dark:text-white">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-md shadow-slate-300/50 dark:bg-white">
        <img src={jbietLogo} alt="JBIET logo" className="size-full object-contain" />
      </span>
      <span>JBIET</span>
    </div>
  );
}
