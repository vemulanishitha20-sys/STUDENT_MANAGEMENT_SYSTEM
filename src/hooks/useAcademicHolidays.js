import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/data";

export default function useAcademicHolidays() {
  const [ranges, setRanges] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase.from("academic_events").select("start_date,end_date,title").eq("kind", "Holiday").eq("creator_role", "admin");
      setRanges(data || []);
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);
  return useMemo(() => ({ ranges, isHoliday: (date) => ranges.some((item) => item.start_date <= date && item.end_date >= date), holidayName: (date) => ranges.find((item) => item.start_date <= date && item.end_date >= date)?.title }), [ranges]);
}
