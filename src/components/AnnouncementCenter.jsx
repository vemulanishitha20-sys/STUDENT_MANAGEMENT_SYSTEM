import { useEffect, useState } from "react";
import { Bell, ChevronRight, Plus, Send } from "lucide-react";
import { supabase } from "../lib/data";
import Toast from "./Toast";

const STORAGE_KEY = "campus-announcements";
const localAnnouncements = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const canSee = (item, role) => role === "admin" || item.audience === "all" || (role === "teacher" && item.audience === "teachers");
const readKey = (role, userId) => `campus-announcement-reads-${role}-${userId}`;
const readIds = (role, userId) => { try { return new Set(JSON.parse(localStorage.getItem(readKey(role, userId)) || "[]")); } catch { return new Set(); } };

export async function loadAnnouncements(role) {
  const fallback = localAnnouncements();
  if (!supabase) return fallback.filter((item) => canSee(item, role));
  const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  return (error ? fallback : data || []).filter((item) => canSee(item, role));
}

export default function AnnouncementCenter({ role, userId = "admin", canPublish = false, author, onUnreadChange }) {
  const [announcements, setAnnouncements] = useState([]), [title, setTitle] = useState(""), [message, setMessage] = useState(""), [audience, setAudience] = useState("all"), [status, setStatus] = useState(""), [read, setRead] = useState(() => readIds(role, userId)), [openId, setOpenId] = useState(null), [showComposer, setShowComposer] = useState(false);
  const updateUnread = (items, seen = read) => onUnreadChange?.(items.some((item) => !seen.has(item.id)));
  useEffect(() => {
    const load = async () => { const items = await loadAnnouncements(role); setAnnouncements(items); const seen = readIds(role, userId); setRead(seen); updateUnread(items, seen); };
    load(); window.addEventListener("focus", load); return () => window.removeEventListener("focus", load);
  }, [role, userId]);
  const openAnnouncement = (id) => { const next = new Set(read); next.add(id); setRead(next); localStorage.setItem(readKey(role, userId), JSON.stringify([...next])); setOpenId((current) => current === id ? null : id); updateUnread(announcements, next); };
  const publish = async (event) => {
    event.preventDefault(); if (!title.trim() || !message.trim()) return setStatus("Add a title and message.");
    const announcement = { id: crypto.randomUUID(), title: title.trim(), message: message.trim(), audience, author: author || "Administrator", created_at: new Date().toISOString() }; let saved = announcement;
    if (supabase) { const { data, error } = await supabase.from("announcements").insert({ title: announcement.title, message: announcement.message, audience, author: announcement.author }).select().single(); if (!error && data) saved = data; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, ...localAnnouncements()])); setAnnouncements((current) => [saved, ...current]); setTitle(""); setMessage(""); setStatus("Announcement published successfully."); setShowComposer(false);
  };
  return <section className="mx-auto w-full max-w-4xl"><Toast message={status} onClose={() => setStatus("")} />
    {canPublish && <div className="sm:-mt-[78px] sm:mb-12 sm:flex sm:justify-end sm:px-5"><button onClick={() => setShowComposer(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-campus px-5 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-violet-700"><Plus size={18} /> Add Announcement</button>{showComposer && <form onSubmit={publish} className="fixed left-1/2 top-1/2 z-[80] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800"><h3 className="text-lg font-bold">New announcement</h3><div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className="h-12 rounded-xl border border-stone-300 px-4 outline-none focus:border-campus dark:border-slate-600 dark:bg-slate-900" /><select value={audience} onChange={(e) => setAudience(e.target.value)} className="h-12 rounded-xl border border-stone-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-900"><option value="all">All</option><option value="teachers">Teachers only</option></select></div><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement..." rows="4" className="mt-4 w-full rounded-xl border border-stone-300 p-4 outline-none focus:border-campus dark:border-slate-600 dark:bg-slate-900" /><div className="mt-4 flex items-center justify-end gap-3"><button type="button" onClick={() => setShowComposer(false)} className="h-11 rounded-xl border border-stone-300 px-5 font-bold text-slate-600">Cancel</button><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-campus px-5 font-bold text-white hover:bg-violet-700"><Send size={18} /> Publish</button></div></form>}</div>}
    <div className="mt-6 max-h-[calc(100vh-22rem)] space-y-3 overflow-y-auto pr-2">{announcements.map((item) => { const unread = !read.has(item.id); const open = openId === item.id; return <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><button onClick={() => openAnnouncement(item.id)} className="flex w-full items-center gap-3 p-5 text-left hover:bg-violet-50/50 dark:hover:bg-slate-700"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-campus dark:bg-violet-950 dark:text-violet-200"><Bell size={20} /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><b className="truncate text-lg">{item.title}</b>{unread && <i className="size-2 shrink-0 rounded-full bg-red-500" aria-label="Unread announcement" />}</span><small className="text-slate-400">{item.audience === "teachers" ? "Teachers only" : "All"} · {new Date(item.created_at).toLocaleDateString()}</small></span><ChevronRight className={`shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`} /></button>{open && <div className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-700"><p className="whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{item.message}</p><p className="mt-4 text-xs text-slate-400">{item.author || "Administrator"} · {new Date(item.created_at).toLocaleString()}</p></div>}</article>; })}{!announcements.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No announcements yet.</div>}</div>
  </section>;
}
