"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { suggestPriority, buildETDateTime, weekBounds } from "@/lib/planning";

const NAME = "Samanta";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  type: string | null;
  date: string | null;
  plan: string | null;
  estMin: number | null;
  importance: string | null;
  impact: number | null;
  effort: number | null;
};
type PlanData = {
  today: string;
  which: "this" | "next";
  bucket: string;
  weekStart: string;
  weekEnd: string;
  weekDays: string[];
  week: Task[];
  pool: Task[];
};
type Habit = {
  id: string;
  title: string;
  done: boolean;
  cadence: string | null;
  order: number | null;
};
type HabitDef = {
  id: string;
  name: string;
  active: boolean;
  cadence: string | null;
  target: number | null;
  order: number | null;
  timeOfDay: string | null;
  estMin: number | null;
  lastDone: string | null;
  timesDone: number | null;
  constancia: number | null;
};
type Data = { today: string; date: string; tasks: Task[]; habits: Habit[] };
type TaskDetailData = {
  id: string;
  url: string | null;
  title: string;
  lastEdited: string | null;
  fields: { label: string; value: string }[];
};

const LABEL_ES: Record<string, string> = {
  Status: "Estado",
  Priority: "Prioridad",
  Date: "Fecha",
  Importance: "Importancia",
  "Task Type": "Tipo",
  "Estimated Time (min)": "Tiempo estimado (min)",
  "Planeación": "Planeación",
};
const labelES = (l: string) => LABEL_ES[l] ?? l;

const BUCKETS = [
  { key: "Esta semana", label: "Esta semana" },
  { key: "Próxima semana", label: "La próxima semana" },
  { key: "Eventualmente", label: "Eventualmente" },
];

const STATUS_META: Record<string, { es: string; color: string }> = {
  "Not started": { es: "Sin empezar", color: "#9a8f84" },
  "In progress": { es: "En progreso", color: "#4a6d8c" },
  "Waiting": { es: "En espera", color: "#b98a3e" },
  "Done": { es: "Hecha", color: "#b4894e" },
  "Cancel": { es: "Cancelada", color: "#a1392c" },
};
// Options offered in the quick picker (in order).
const STATUS_OPTIONS = ["Not started", "In progress", "Waiting", "Done"];
const statusES = (s: string) => STATUS_META[s]?.es ?? s;
const statusColor = (s: string) => STATUS_META[s]?.color ?? "#9a8f84";
const prioES = (p: string) =>
  ({ High: "Alta", Medium: "Media", Low: "Baja" } as Record<string, string>)[p] ?? p;


const PRIORITY_OPTS = [
  { v: "High", l: "Alta" },
  { v: "Medium", l: "Media" },
  { v: "Low", l: "Baja" },
];
const IMPORTANCE_OPTS = [
  { v: "Urgent", l: "Urgente" },
  { v: "Need", l: "Necesaria" },
  { v: "Required", l: "Requerida" },
  { v: "Schedule", l: "Programar" },
  { v: "Want", l: "Quiero" },
];
const TIME_OPTS = [
  { v: 15, l: "15m" },
  { v: 30, l: "30m" },
  { v: 45, l: "45m" },
  { v: 60, l: "1h" },
  { v: 90, l: "1h30" },
  { v: 120, l: "2h" },
  { v: 180, l: "3h" },
  { v: 240, l: "4h" },
  { v: 300, l: "5h" },
];
const SCALE = [1, 2, 3, 4, 5];

const CADENCE_ES: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  bimonthly: "Bimensual",
  yearly: "Anual",
};
const cadenceES = (c: string | null) =>
  c ? CADENCE_ES[c.toLowerCase()] ?? c : "";

const TOD_ES: Record<string, { label: string; ico: string }> = {
  morning: { label: "Mañana", ico: "☀" },
  afternoon: { label: "Tarde", ico: "✦" },
  night: { label: "Noche", ico: "☾" },
};

/* ---------- small icons ---------- */
function CheckMark() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5l3.2 3.2L13 5"
          stroke="#f6efe9"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
function Leaf({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 4C9 4 4 9.5 4 17c0 1 .2 2 .5 3M20 4c0 9-5.5 13-13 13.5M20 4c-2.3.3-7 1.5-10 5"
        stroke="#9aa48f"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Heart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.6-9.2-9C1.3 7.6 3 4.5 6.2 4.5c1.9 0 3.2 1.1 3.8 2.2.6-1.1 1.9-2.2 3.8-2.2 3.2 0 4.9 3.1 3.4 6.5C19 15.4 12 20 12 20z"
        stroke="#6e2b3a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Chevron() {
  return (
    <span className="chev" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none">
        <path
          d="M6 3l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
/* ---------- date helpers (Eastern) ---------- */
function partsET(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function weekDays(todayISO: string) {
  const [y, m, d] = todayISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = base.getUTCDay();
  const toMonday = (dow + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - toMonday);
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const out: { iso: string; num: number; dow: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(monday.getUTCDate() + i);
    const iso = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`;
    out.push({ iso, num: cur.getUTCDate(), dow: labels[i] });
  }
  return out;
}
function longDateES(dateStr: string): string {
  const hasTime = dateStr.length > 10 && dateStr.includes("T");
  if (hasTime) {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(new Date(dateStr));
  }
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}
// Build detail rows from what we already know, so the sheet opens full immediately.
function basicDetail(t: Task): TaskDetailData {
  const fields: { label: string; value: string }[] = [];
  if (t.status) fields.push({ label: "Status", value: t.status });
  if (t.priority) fields.push({ label: "Priority", value: t.priority });
  if (t.date) fields.push({ label: "Date", value: longDateES(t.date) });
  if (t.type) fields.push({ label: "Task Type", value: t.type });
  if (t.plan) fields.push({ label: "Planeación", value: t.plan });
  return { id: t.id, url: null, title: t.title, lastEdited: null, fields };
}
function dayLabelES(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const s = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function shortDayES(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const s = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function isSundayISO(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}
function dowLetter(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun..6 Sat
  return ["D", "L", "M", "M", "J", "V", "S"][dow];
}
function clockES(dateStr: string): string {
  if (!(dateStr.length > 10 && dateStr.includes("T"))) return "";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(dateStr));
}
function hasTime(dateStr: string | null): boolean {
  return !!dateStr && dateStr.length > 10 && dateStr.includes("T");
}
// "HH:MM" (24h, zero-padded) in Eastern — for <input type="time">.
function timeHHMM_ET(dateStr: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  }).formatToParts(new Date(dateStr));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}
// Clock label for (start + minutes), in Eastern.
function clockPlusES(dateStr: string, addMin: number): string {
  const d = new Date(new Date(dateStr).getTime() + addMin * 60000);
  return new Intl.DateTimeFormat("es-ES", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(d);
}
function fmtMin(total: number): string {
  if (!total) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
// Default guide times for the Día dayparts; overridable per day (on-device).
const DEFAULT_GUIDES = { am: "07:00", noon: "13:00", pm: "21:00" };

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<
    | null
    | "habits"
    | "add"
    | "addhabit"
    | "soon"
    | "task"
    | "plan"
    | "status"
    | "assign"
    | "analyze"
    | "time"
  >(null);
  const [soonLabel, setSoonLabel] = useState("");
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetailData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [view, setView] = useState<
    "hoy" | "semana" | "planear" | "dia" | "perfil"
  >("hoy");
  const [profileHabits, setProfileHabits] = useState<HabitDef[] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  // New-habit form.
  const [nhName, setNhName] = useState("");
  const [nhCadence, setNhCadence] = useState("Daily");
  const [nhTarget, setNhTarget] = useState(1);
  const [nhTod, setNhTod] = useState<string | null>(null);
  const [nhEst, setNhEst] = useState<number | null>(null);
  const [addingHabit, setAddingHabit] = useState(false);
  const [weekTasks, setWeekTasks] = useState<Task[] | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planWeek, setPlanWeek] = useState<"this" | "next">("this");

  // Per-day guide times for the Día dayparts (visual anchors, stored on-device).
  const [guides, setGuides] = useState(DEFAULT_GUIDES);
  useEffect(() => {
    const d = data?.date;
    if (!d) return;
    try {
      const raw = localStorage.getItem("cc_guides_" + d);
      setGuides(raw ? { ...DEFAULT_GUIDES, ...JSON.parse(raw) } : DEFAULT_GUIDES);
    } catch {
      setGuides(DEFAULT_GUIDES);
    }
  }, [data?.date]);
  function setGuide(k: "am" | "noon" | "pm", v: string) {
    if (!v) return;
    setGuides((prev) => {
      const next = { ...prev, [k]: v };
      try {
        if (data?.date) localStorage.setItem("cc_guides_" + data.date, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const sheetOpenedAt = useRef(0);

  useEffect(() => {
    if (sheet) sheetOpenedAt.current = Date.now();
  }, [sheet]);

  // Lift sheets above the on-screen keyboard (iOS).
  const [kbInset, setKbInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbInset(kb > 80 ? kb : 0); // ignore tiny toolbar changes
    };
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  function closeSheet() {
    // Ignore the ghost tap that can "pass through" to the backdrop right
    // after opening (iOS), which otherwise closes the sheet instantly.
    if (Date.now() - sheetOpenedAt.current < 400) return;
    setSheet(null);
    setConfirmDelete(false);
  }

  const load = useCallback(async (dateISO?: string) => {
    setError(null);
    if (dateISO) setSwitching(true);
    try {
      const url = dateISO ? `/api/today?date=${dateISO}` : "/api/today";
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        let detail = "";
        try {
          detail = (await res.json())?.error ?? "";
        } catch {}
        throw new Error(detail || `No se pudo cargar (${res.status})`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setSwitching(false);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    setWeekLoading(true);
    try {
      const res = await fetch("/api/week", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) setWeekTasks((await res.json()).tasks);
      else {
        let detail = "";
        try {
          detail = (await res.json())?.error ?? "";
        } catch {}
        setError(detail || "No se pudo cargar la semana");
      }
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setWeekLoading(false);
    }
  }, []);

  const loadPlan = useCallback(async (which: "this" | "next" = "this") => {
    setPlanLoading(true);
    try {
      const res = await fetch(`/api/plan?week=${which === "next" ? "next" : "this"}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) setPlanData(await res.json());
      else {
        let detail = "";
        try {
          detail = (await res.json())?.error ?? "";
        } catch {}
        setError(detail || "No se pudo cargar la planeación");
      }
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markPending = (id: string, on: boolean) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const week = useMemo(
    () => (data ? weekDays(data.today) : weekDays(partsET(new Date()))),
    [data]
  );

  async function toggleTask(t: Task) {
    if (pending.has(t.id)) return;
    const willBeDone = t.status !== "Done";
    const next = willBeDone ? "Done" : "Not started";
    markPending(t.id, true);
    applyPatch(t.id, { status: next });
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, done: willBeDone }),
      });
      if (!res.ok) throw new Error();
    } catch {
      applyPatch(t.id, { status: t.status });
      setError("No se pudo guardar la tarea");
    } finally {
      markPending(t.id, false);
    }
  }

  async function toggleHabit(h: Habit) {
    if (pending.has(h.id)) return;
    markPending(h.id, true);
    const nextDone = !h.done;
    setData((d) =>
      d ? { ...d, habits: d.habits.map((x) => (x.id === h.id ? { ...x, done: nextDone } : x)) } : d
    );
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: h.id, done: nextDone }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setData((d) =>
        d ? { ...d, habits: d.habits.map((x) => (x.id === h.id ? { ...x, done: h.done } : x)) } : d
      );
      setError("No se pudo guardar el hábito");
    } finally {
      markPending(h.id, false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title || adding || !data) return;
    setAdding(true);
    try {
      const planBucket = planWeek === "next" ? "Próxima semana" : "Esta semana";
      const body =
        view === "planear"
          ? { title, plan: planBucket }
          : view === "semana"
          ? { title, plan: "Esta semana" }
          : { title, date: data.date };
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const payload = await res.json();
      if (view === "planear") {
        setPlanData((p) => (p ? { ...p, pool: [...p.pool, payload.task] } : p));
      } else if (view === "semana") {
        setWeekTasks((ws) => (ws ? [...ws, payload.task] : [payload.task]));
      } else {
        setData((d) => (d ? { ...d, tasks: [...d.tasks, payload.task] } : d));
      }
      setNewTask("");
      setSheet(null);
    } catch {
      setError("No se pudo crear la tarea");
    } finally {
      setAdding(false);
    }
  }

  // Move a task to a planning bucket (clears its date), or schedule it to today.
  // Patch a task in place across every list it may appear in.
  function applyPatch(id: string, patch: Partial<Task>) {
    const f = (x: Task) => (x.id === id ? { ...x, ...patch } : x);
    setData((d) => (d ? { ...d, tasks: d.tasks.map(f) } : d));
    setWeekTasks((ws) => (ws ? ws.map(f) : ws));
    setPlanData((p) => (p ? { ...p, pool: p.pool.map(f), week: p.week.map(f) } : p));
    setActiveTask((cur) => (cur && cur.id === id ? { ...cur, ...patch } : cur));
  }
  // Re-fetch the current view's source (used after moves or on error).
  function reloadCurrent() {
    if (!data) return;
    if (view === "hoy" || view === "dia") load(data.date);
    else if (view === "planear") loadPlan(planWeek);
    else if (view === "semana") loadWeek();
  }

  async function setStatus(t: Task, status: string) {
    applyPatch(t.id, { status });
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("No se pudo cambiar el estado");
      reloadCurrent();
    }
  }

  // Move to a planning bucket (clears the date).
  async function moveTask(t: Task, plan: string) {
    applyPatch(t.id, { plan, date: null });
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, plan, clearDate: true }),
      });
      if (!res.ok) throw new Error();
      reloadCurrent();
    } catch {
      setError("No se pudo mover la tarea");
      reloadCurrent();
    }
  }

  function openSoon(label: string) {
    setSoonLabel(label);
    setSheet("soon");
  }

  async function loadHabits() {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/habits", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setProfileHabits(json.habits ?? []);
    } catch {
      setError("No se pudieron cargar los hábitos");
    } finally {
      setProfileLoading(false);
    }
  }

  async function toggleHabitActive(h: HabitDef) {
    const next = !h.active;
    const flip = (a: boolean) =>
      setProfileHabits((list) =>
        list ? list.map((x) => (x.id === h.id ? { ...x, active: a } : x)) : list
      );
    flip(next);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: h.id, active: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("No se pudo actualizar el hábito");
      flip(h.active);
    }
  }

  function openAddHabit() {
    setNhName("");
    setNhCadence("Daily");
    setNhTarget(1);
    setNhTod(null);
    setNhEst(null);
    setSheet("addhabit");
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    const name = nhName.trim();
    if (!name || addingHabit) return;
    setAddingHabit(true);
    try {
      // Append after the last habit of the same cadence.
      const sameCad = (profileHabits ?? []).filter((h) => h.cadence === nhCadence);
      const maxOrder = sameCad.reduce((m, h) => Math.max(m, h.order ?? 0), 0);
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cadence: nhCadence,
          target: nhTarget,
          timeOfDay: nhTod,
          estMin: nhEst,
          order: maxOrder + 1,
        }),
      });
      if (!res.ok) throw new Error();
      const payload = await res.json();
      if (payload.habit) {
        setProfileHabits((list) => (list ? [...list, payload.habit] : [payload.habit]));
      } else {
        loadHabits();
      }
      setSheet(null);
    } catch {
      setError("No se pudo crear el hábito");
    } finally {
      setAddingHabit(false);
    }
  }

  function onNav(tab: string) {
    if (tab === "hoy") {
      setView("hoy");
    } else if (tab === "dia") {
      // Plan today's day.
      if (data && data.date !== data.today) load(data.today);
      setView("dia");
    } else if (tab === "semana") {
      // Weekly planning board. On Sundays, default to next week.
      const w: "this" | "next" = data && isSundayISO(data.today) ? "next" : "this";
      setView("planear");
      setPlanWeek(w);
      loadPlan(w);
    } else if (tab === "pendientes") {
      setView("semana");
      loadWeek();
    } else {
      setView("perfil");
      loadHabits();
    }
  }

  // Assign a task to a specific day: set its date + Planeación "Agendado".
  async function assignTaskToDay(t: Task, dayISO: string) {
    applyPatch(t.id, { date: dayISO, plan: "Agendado" });
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, plan: "Agendado", date: dayISO }),
      });
      if (!res.ok) throw new Error();
      reloadCurrent();
    } catch {
      setError("No se pudo agendar la tarea");
      reloadCurrent();
    }
  }

  // The one task sheet for every tab. Opens with what we know, then fills the
  // Notion detail (URL + extra fields) in the background.
  async function openTaskSheet(t: Task) {
    setActiveTask(t);
    setConfirmDelete(false);
    setTaskDetail(basicDetail(t));
    setSheet("task");
    try {
      const res = await fetch(`/api/task?id=${t.id}`, { cache: "no-store" });
      if (res.ok) {
        const full = await res.json();
        setTaskDetail((cur) => (cur && cur.id === full.id ? full : cur));
      }
    } catch {
      // the sheet still works with the basics
    }
  }

  // Set or clear a task's start time for the current day.
  async function saveTime(t: Task, hhmm: string | null) {
    if (!data) return;
    const newDate = hhmm ? buildETDateTime(data.date, hhmm) : data.date;
    applyPatch(t.id, { date: newDate });
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, day: data.date, startTime: hhmm }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("No se pudo guardar la hora");
      reloadCurrent();
    }
  }

  // Save one or more scoring fields (Priority, Importance, estMin, Impact, Effort).
  async function setField(t: Task, patch: Partial<Task>) {
    applyPatch(t.id, patch);
    try {
      const fields: any = {};
      for (const k of ["priority", "importance", "estMin", "impact", "effort"] as const) {
        if (k in patch) fields[k] = (patch as any)[k];
      }
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, fields }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("No se pudo guardar");
      reloadCurrent();
    }
  }

  async function removeTask(t: Task) {
    setSheet(null);
    setConfirmDelete(false);
    setData((d) => (d ? { ...d, tasks: d.tasks.filter((x) => x.id !== t.id) } : d));
    setWeekTasks((ws) => (ws ? ws.filter((x) => x.id !== t.id) : ws));
    setPlanData((p) =>
      p
        ? {
            ...p,
            pool: p.pool.filter((x) => x.id !== t.id),
            week: p.week.filter((x) => x.id !== t.id),
          }
        : p
    );
    try {
      const res = await fetch(`/api/task?id=${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setError("No se pudo borrar la tarea");
      reloadCurrent();
    }
  }

  // The single task card used in every list view.
  function renderCard(t: Task) {
    const done = t.status === "Done";
    const worth =
      t.impact != null && t.effort != null
        ? t.impact >= 4 && t.effort <= 2
          ? "win"
          : t.effort >= 4 && t.impact <= 2
          ? "heavy"
          : ""
        : "";
    const overdue = !!t.date && !done && t.date.slice(0, 10) < data!.today;
    const clock = hasTime(t.date) ? clockES(t.date!) : "";
    return (
      <div key={t.id} className={`item ${done ? "done" : ""}`}>
        <span
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(t);
          }}
        >
          <CheckMark />
        </span>
        <div className="item-body" onClick={() => openTaskSheet(t)}>
          <div className="item-title">
            {worth === "win" && "⭐ "}
            {worth === "heavy" && "🪨 "}
            {t.title}
          </div>
          <div className="item-meta">
            <span className="status-chip" style={{ color: statusColor(t.status) }}>
              <i className="dot" style={{ background: statusColor(t.status) }} />
              {statusES(t.status)}
            </span>
            {t.priority && (
              <>
                <span className="meta-sep">·</span>
                <span className="prio-chip">{prioES(t.priority)}</span>
              </>
            )}
            {t.estMin ? (
              <>
                <span className="meta-sep">·</span>
                <span>{fmtMin(t.estMin)}</span>
              </>
            ) : null}
            {clock && (
              <>
                <span className="meta-sep">·</span>
                <span>{clock}</span>
              </>
            )}
            {overdue && (
              <>
                <span className="meta-sep">·</span>
                <span className="tag overdue">Vencida</span>
              </>
            )}
          </div>
        </div>
        <span onClick={() => openTaskSheet(t)}>
          <Chevron />
        </span>
      </div>
    );
  }

  function renderHabit(h: Habit) {
    return (
      <div
        key={h.id}
        className={`item ${h.done ? "done" : ""}`}
        onClick={() => toggleHabit(h)}
      >
        <CheckMark />
        <div className="item-body">
          <div className="item-title">{h.title}</div>
          {h.cadence && (
            <div className="item-meta">
              <span>{cadenceES(h.cadence)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ----- render states ----- */
  if (error && !data) {
    return (
      <>
        <Header onProfile={() => openSoon("Perfil")} />
        <div className="empty">{error}</div>
        <div className="center">
          <button className="refresh" onClick={() => load()}>
            Reintentar
          </button>
        </div>
        <BottomNav view={view} onNav={onNav} />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Header onProfile={() => openSoon("Perfil")} />
        <div className="loading">Cargando…</div>
        <BottomNav view={view} onNav={onNav} />
      </>
    );
  }

  const pendingTasks = data.tasks.filter((t) => t.status !== "Done").length;
  const isDaily = (h: Habit) => (h.cadence ?? "").toLowerCase() === "daily";
  const dailyHabits = data.habits.filter(isDaily);
  const otherHabits = data.habits.filter((h) => !isDaily(h));
  // Tea drops count only daily habits.
  const habitsDone = dailyHabits.filter((h) => h.done).length;
  const habitsTotal = dailyHabits.length;
  const pct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0;
  const isToday = data.date === data.today;
  const heroLabel = isToday ? "Tu té de hoy" : dayLabelES(data.date);

  // planning view grouping
  const planned = (weekTasks ?? []).filter((t) => t.status !== "Done");
  const groups = BUCKETS.map((b) => ({
    ...b,
    items: planned.filter((t) => (t.plan ?? "") === b.key),
  }));
  const unclassified = planned.filter(
    (t) => !BUCKETS.some((b) => b.key === (t.plan ?? ""))
  );

  return (
    <>
      <Header onProfile={() => openSoon("Perfil")} />

      {view === "hoy" && (
        <>
          {/* week strip */}
          <div className="week">
            {week.map((d, i) => {
              const sel = data.date === d.iso;
              const now = data.today === d.iso;
              return (
                <div
                  key={i}
                  className={`day ${sel ? "sel" : ""} ${now ? "now" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!sel) load(d.iso);
                  }}
                >
                  <div className="dow">{d.dow}</div>
                  <div className="dnum">{d.num}</div>
                </div>
              );
            })}
          </div>

          <div style={{ opacity: switching ? 0.45 : 1, transition: "opacity 0.2s ease" }}>
            {/* tea hero -> habits */}
            <div className="hero" role="button" tabIndex={0} onClick={() => setSheet("habits")}>
              <div className="hero-text">
                <p className="hero-label serif">{heroLabel}</p>
                <p className="hero-count serif">
                  {habitsTotal ? `${habitsDone} de ${habitsTotal} gotas` : "Sin hábitos"}
                </p>
                <div className="hero-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <p className="hero-sub">
                  {habitsTotal
                    ? "Cada hábito te acerca a tu meta."
                    : "Aún no hay hábitos para hoy."}
                </p>
              </div>
            </div>

            {/* tasks */}
            <section className="section">
              <div className="section-head">
                <h2 className="section-title serif">Tareas</h2>
                <span className="count">{pendingTasks} pendientes</span>
              </div>
              {data.tasks.length === 0 ? (
                <div className="empty">Nada pendiente. Respira. ✦</div>
              ) : (
                <div className="list">{data.tasks.map((t) => renderCard(t))}</div>
              )}
              <p className="hint">Mantén presionada una tarea para moverla de semana.</p>
            </section>

            <div className="center" style={{ marginTop: 20 }}>
              <button className="refresh" onClick={() => load(data.date)}>
                Actualizar
              </button>
              {process.env.NEXT_PUBLIC_BUILD && (
                <p className="build">versión {process.env.NEXT_PUBLIC_BUILD}</p>
              )}
            </div>
          </div>
        </>
      )}

      {view === "semana" && (
        <>
          <section className="section" style={{ marginTop: 22 }}>
            <div className="section-head">
              <h2 className="section-title serif">Para agendar</h2>
              <span className="count">{planned.length} tareas</span>
            </div>
            {weekLoading && !weekTasks ? (
              <div className="loading">Cargando…</div>
            ) : planned.length === 0 ? (
              <div className="empty">
                No hay tareas sin agendar. ✦
                <br />
                Mantén presionada una tarea del día para traerla aquí.
              </div>
            ) : (
              <>
                {groups.map((g) => (
                  <div key={g.key} className="bucket">
                    <h3 className="bucket-title">{g.label}</h3>
                    {g.items.length === 0 ? (
                      <div className="bucket-empty">—</div>
                    ) : (
                      <div className="list">{g.items.map((t) => renderCard(t))}</div>
                    )}
                  </div>
                ))}
                {unclassified.length > 0 && (
                  <div className="bucket">
                    <h3 className="bucket-title">Sin clasificar</h3>
                    <div className="list">{unclassified.map((t) => renderCard(t))}</div>
                  </div>
                )}
              </>
            )}
            <p className="hint">
              Mantén presionada una tarea para cambiarla de semana o agendarla.
            </p>
          </section>
        </>
      )}

      {view === "planear" && (
        <section className="section plan-section" style={{ marginTop: 22 }}>
          <div className="section-head">
            <h2 className="section-title serif">Planea tu semana</h2>
          </div>
          <div className="seg">
            <button
              className={planWeek === "this" ? "seg-on" : ""}
              onClick={() => {
                setPlanWeek("this");
                loadPlan("this");
              }}
            >
              Esta semana
            </button>
            <button
              className={planWeek === "next" ? "seg-on" : ""}
              onClick={() => {
                setPlanWeek("next");
                loadPlan("next");
              }}
            >
              La próxima semana
            </button>
          </div>
          {planLoading && !planData ? (
            <div className="loading">Cargando…</div>
          ) : planData ? (
            (() => {
              const stats = planData.weekDays.map((iso) => {
                const dayTasks = planData.week.filter(
                  (t) => (t.date ?? "").slice(0, 10) === iso
                );
                const done = dayTasks.filter((t) => t.status === "Done");
                const pend = dayTasks.filter((t) => t.status !== "Done");
                return {
                  iso,
                  pendMins: pend.reduce((s, t) => s + (t.estMin ?? 0), 0),
                  doneMins: done.reduce((s, t) => s + (t.estMin ?? 0), 0),
                  pendCount: pend.length,
                  doneCount: done.length,
                };
              });
              const useMins = stats.some((s) => s.pendMins > 0 || s.doneMins > 0);
              const val = (s: (typeof stats)[number]) =>
                useMins
                  ? { pend: s.pendMins, done: s.doneMins }
                  : { pend: s.pendCount, done: s.doneCount };
              const max = Math.max(1, ...stats.map((s) => val(s).pend + val(s).done));
              return (
                <>
                  <div className="plan-cols">
                  <div className="plan-balance">
                  <div className="balance">
                    {stats.map((s) => {
                      const m = val(s);
                      const total = m.pend + m.done;
                      const h = total ? Math.max(12, Math.round((total / max) * 100)) : 0;
                      return (
                        <button
                          key={s.iso}
                          className={`bal-day ${s.iso === planData.today ? "bal-today" : ""}`}
                          onClick={() => {
                            setView("hoy");
                            load(s.iso);
                          }}
                        >
                          <span className="bal-dow">{dowLetter(s.iso)}</span>
                          <span className="bal-num">{Number(s.iso.slice(8, 10))}</span>
                          <span className="bal-bar">
                            <span className="bal-fill" style={{ height: `${h}%` }}>
                              {m.pend > 0 && (
                                <i className="bal-pend" style={{ flexGrow: m.pend }} />
                              )}
                              {m.done > 0 && (
                                <i className="bal-done" style={{ flexGrow: m.done }} />
                              )}
                            </span>
                          </span>
                          <span className="bal-count">
                            {useMins
                              ? s.pendMins
                                ? fmtMin(s.pendMins)
                                : s.doneMins
                                ? "✓"
                                : "—"
                              : s.pendCount || (s.doneCount ? "✓" : "—")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  </div>

                  <div className="plan-pool">
                  {(() => {
                    const prank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
                    const sortedPool = [...planData.pool].sort(
                      (a, b) =>
                        (prank[a.priority ?? ""] ?? 3) - (prank[b.priority ?? ""] ?? 3) ||
                        (a.estMin ?? 9999) - (b.estMin ?? 9999)
                    );
                    const poolMins = sortedPool.reduce((s, t) => s + (t.estMin ?? 0), 0);
                    return (
                      <>
                        <div className="section-head" style={{ marginTop: 26 }}>
                          <h3 className="bucket-title" style={{ margin: 0 }}>
                            {planData.bucket} · por repartir
                          </h3>
                          <span className="count">
                            {sortedPool.length}
                            {poolMins ? ` · ≈ ${fmtMin(poolMins)}` : ""}
                          </span>
                        </div>
                        {sortedPool.length === 0 ? (
                          <div className="empty">¡Semana repartida! ✦</div>
                        ) : (
                          <div className="list">{sortedPool.map((t) => renderCard(t))}</div>
                        )}
                        <p className="hint">Toca una tarea para puntuarla y agendarla.</p>
                      </>
                    );
                  })()}
                  </div>

                  <div className="plan-agenda">
                  <h3 className="bucket-title plan-agenda-title">La semana</h3>
                  <div className="agenda">
                    {planData.weekDays.map((iso) => {
                      const dayTasks = planData.week
                        .filter((t) => (t.date ?? "").slice(0, 10) === iso)
                        .sort((a, b) => {
                          const ad = a.status === "Done" ? 1 : 0;
                          const bd = b.status === "Done" ? 1 : 0;
                          if (ad !== bd) return ad - bd;
                          return (a.date ?? "").localeCompare(b.date ?? "");
                        });
                      const isToday = iso === planData.today;
                      return (
                        <div key={iso} className={`agenda-day ${isToday ? "agenda-now" : ""}`}>
                          <div
                            className="agenda-head"
                            onClick={() => {
                              setView("hoy");
                              load(iso);
                            }}
                          >
                            <span className="agenda-dow">{shortDayES(iso)}</span>
                            {isToday && <span className="agenda-today">hoy</span>}
                            <span className="agenda-n">{dayTasks.length || ""}</span>
                          </div>
                          {dayTasks.length === 0 ? (
                            <div className="agenda-empty">Libre</div>
                          ) : (
                            dayTasks.map((t) => (
                              <div
                                key={t.id}
                                className={`agenda-item ${t.status === "Done" ? "done" : ""}`}
                                onClick={() => openTaskSheet(t)}
                              >
                                <i className="dot" style={{ background: statusColor(t.status) }} />
                                <span className="agenda-title">{t.title}</span>
                                {clockES(t.date ?? "") && (
                                  <span className="agenda-time">{clockES(t.date ?? "")}</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </div>
                  </div>
                </>
              );
            })()
          ) : null}
        </section>
      )}

      {view === "dia" && (() => {
        const toMin = (hhmm: string) => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3, 5);
        // Anchors are editable visual guides (not Notion tasks); they take a
        // place in the timeline at their own time, interleaved with tasks.
        const anchorDefs = [
          { key: "am" as const, ico: "☀", label: "Rutina matutina", time: guides.am },
          { key: "noon" as const, ico: "✦", label: "Almuerzo", time: guides.noon },
          { key: "pm" as const, ico: "☾", label: "Rutina de noche", time: guides.pm },
        ];
        const untimed = data.tasks.filter((t) => !hasTime(t.date));

        type Ev =
          | { kind: "anchor"; id: string; ico: string; label: string; akey: "am" | "noon" | "pm"; min: number; time: string }
          | { kind: "task"; id: string; t: Task; min: number; endMin: number };
        const events: Ev[] = [
          ...anchorDefs.map((a) => ({
            kind: "anchor" as const, id: "anchor-" + a.key, ico: a.ico, label: a.label,
            akey: a.key, time: a.time, min: toMin(a.time),
          })),
          ...data.tasks.filter((t) => hasTime(t.date)).map((t) => {
            const min = toMin(timeHHMM_ET(t.date!));
            return { kind: "task" as const, id: t.id, t, min, endMin: min + (t.estMin ?? 0) };
          }),
        ];
        // Everything in order by time; on a tie the anchor leads.
        events.sort((a, b) => a.min - b.min || (a.kind === "anchor" ? -1 : 1));
        // A task "se solapa" when its duration runs past the next event's start.
        const overlaps = new Set<string>();
        events.forEach((e, i) => {
          const next = events[i + 1];
          if (e.kind === "task" && e.t.estMin && next && e.endMin > next.min) overlaps.add(e.id);
        });

        return (
          <section className="section" style={{ marginTop: 22 }}>
            <div className="section-head">
              <h2 className="section-title serif">Planea tu día</h2>
              <span className="count">
                {data.date === data.today ? "Hoy" : dayLabelES(data.date)}
              </span>
            </div>

            <div className="dayflow">
              {events.map((e) =>
                e.kind === "anchor" ? (
                  <div className="daypart" key={e.id}>
                    <span className="daypart-name">
                      <span className="daypart-ico">{e.ico}</span>
                      {e.label}
                    </span>
                    <input
                      type="time"
                      className="daypart-time"
                      value={e.time}
                      onChange={(ev) => setGuide(e.akey, ev.target.value)}
                      aria-label={`Hora de ${e.label}`}
                    />
                  </div>
                ) : (
                  (() => {
                    const t = e.t;
                    const start = clockES(t.date ?? "");
                    const end = t.estMin ? clockPlusES(t.date ?? "", t.estMin) : "";
                    return (
                      <div
                        key={e.id}
                        className={`dayblock ${t.status === "Done" ? "done" : ""} ${
                          overlaps.has(e.id) ? "overlap" : ""
                        }`}
                        onClick={() => openTaskSheet(t)}
                      >
                        <div className="dayblock-time">
                          {start}
                          {end && <span className="dayblock-end">{end}</span>}
                        </div>
                        <div className="dayblock-body">
                          <i className="dot" style={{ background: statusColor(t.status) }} />
                          <span className="dayblock-title">{t.title}</span>
                          {t.estMin ? <span className="agenda-time">{fmtMin(t.estMin)}</span> : null}
                          {overlaps.has(e.id) && <span className="overlap-tag">se solapa</span>}
                        </div>
                      </div>
                    );
                  })()
                )
              )}
            </div>

            {untimed.length > 0 && (
              <>
                <div className="sheet-divider">
                  <span>Sin hora</span>
                </div>
                <div className="list">{untimed.map((t) => renderCard(t))}</div>
              </>
            )}

            <p className="hint">
              Todo va en orden por hora; las anclas se mueven contigo. La duración marca cuándo
              una tarea se solapa con lo siguiente.
            </p>
          </section>
        );
      })()}

      {view === "perfil" && (() => {
        const all = profileHabits ?? [];
        const active = all.filter((h) => h.active);
        const inactive = all.filter((h) => !h.active);
        const fmtDay = (iso: string) =>
          new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "short",
            timeZone: "America/New_York",
          }).format(new Date(iso.length === 10 ? iso + "T12:00:00" : iso));

        // Summary: average constancia + totals across active habits.
        const withC = active.filter((h) => h.constancia != null);
        const avg = withC.length
          ? Math.round((withC.reduce((s, h) => s + (h.constancia ?? 0), 0) / withC.length) * 100)
          : null;
        const totalDone = active.reduce((s, h) => s + (h.timesDone ?? 0), 0);

        // Group a list by cadence, in a fixed order.
        const CAD_SEQ = ["Daily", "Weekly", "Monthly", "Bimonthly", "Yearly"];
        const CAD_PLURAL: Record<string, string> = {
          Daily: "Diarios",
          Weekly: "Semanales",
          Monthly: "Mensuales",
          Bimonthly: "Bimensuales",
          Yearly: "Anuales",
        };
        const groupByCadence = (list: HabitDef[]) => {
          const groups = CAD_SEQ.map((c) => ({
            key: c,
            label: CAD_PLURAL[c] ?? c,
            items: list.filter((h) => h.cadence === c),
          })).filter((g) => g.items.length);
          const rest = list.filter((h) => !CAD_SEQ.includes(h.cadence ?? ""));
          if (rest.length) groups.push({ key: "otros", label: "Otros", items: rest });
          return groups;
        };

        const renderHabit = (h: HabitDef) => {
          const tod = h.timeOfDay ? TOD_ES[h.timeOfDay] : null;
          const pct = h.constancia != null ? Math.round(h.constancia * 100) : null;
          return (
            <div key={h.id} className={`habit ${h.active ? "" : "habit-off"}`}>
              <div className="habit-head">
                <span className="habit-name">{h.name}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={h.active}
                  aria-label={h.active ? "Pausar hábito" : "Activar hábito"}
                  className={`hswitch ${h.active ? "on" : ""}`}
                  onClick={() => toggleHabitActive(h)}
                >
                  <span className="hswitch-knob" />
                </button>
              </div>
              <div className="habit-meta">
                {h.cadence && <span className="hchip">{cadenceES(h.cadence)}</span>}
                {h.target != null && h.target > 1 && (
                  <span className="hchip">meta {h.target}×</span>
                )}
                {tod && (
                  <span className="hchip">
                    {tod.ico} {tod.label}
                  </span>
                )}
                {h.estMin ? <span className="hchip">{fmtMin(h.estMin)}</span> : null}
              </div>
              {pct != null && (
                <div className="habit-barrow">
                  <div className="habit-bar">
                    <span style={{ width: pct + "%" }} />
                  </div>
                  <span className="habit-pct">{pct}%</span>
                </div>
              )}
              {(h.timesDone != null || h.lastDone) && (
                <div className="habit-foot">
                  {h.timesDone != null && (
                    <span>
                      Hecho {h.timesDone} {h.timesDone === 1 ? "vez" : "veces"}
                    </span>
                  )}
                  {h.lastDone && <span>· última: {fmtDay(h.lastDone)}</span>}
                </div>
              )}
            </div>
          );
        };

        return (
          <section className="section" style={{ marginTop: 22 }}>
            <div className="section-head">
              <h2 className="section-title serif">Mis hábitos</h2>
              <span className="count">
                {profileLoading && !profileHabits ? "…" : `${active.length} activos`}
              </span>
            </div>

            {profileLoading && !profileHabits ? (
              <div className="empty">Cargando…</div>
            ) : active.length === 0 ? (
              <div className="empty">No hay hábitos activos. ✦</div>
            ) : (
              <>
                <div className="hsummary">
                  <div>
                    <span className="hsummary-pct serif">{avg != null ? `${avg}%` : "—"}</span>
                    <span className="hsummary-label">Constancia promedio</span>
                  </div>
                  <div className="hsummary-sub">
                    <span>{active.length} activos</span>
                    <span>{totalDone} check-ins</span>
                  </div>
                </div>

                {groupByCadence(active).map((g) => (
                  <div key={g.key} className="hgroup">
                    <div className="group-label">{g.label}</div>
                    <div className="habits-list">{g.items.map(renderHabit)}</div>
                  </div>
                ))}
              </>
            )}

            {inactive.length > 0 && (
              <>
                <button
                  className="inactive-toggle"
                  onClick={() => setShowInactive((v) => !v)}
                >
                  <span>
                    {showInactive ? "Ocultar" : "Ver"} inactivos ({inactive.length})
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`chev ${showInactive ? "open" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {showInactive && (
                  <div className="habits-list">{inactive.map(renderHabit)}</div>
                )}
              </>
            )}
          </section>
        );
      })()}

      {/* add task / add habit */}
      <button
        className="fab"
        aria-label={view === "perfil" ? "Añadir hábito" : "Añadir tarea"}
        onClick={() => (view === "perfil" ? openAddHabit() : setSheet("add"))}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <BottomNav view={view} onNav={onNav} />

      {/* sheets */}
      {sheet && (
        <div
          className="sheet-backdrop"
          onClick={closeSheet}
          style={kbInset ? { paddingBottom: kbInset } : undefined}
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            {sheet === "habits" && (
              <>
                <h3 className="sheet-title serif">
                  {isToday ? "Hábitos de hoy" : `Hábitos · ${dayLabelES(data.date)}`}
                </h3>
                <p className="sheet-sub">
                  {habitsDone} de {habitsTotal} ✦ cada gota cuenta
                </p>
                {dailyHabits.length === 0 && otherHabits.length === 0 ? (
                  <div className="empty">No hay hábitos para hoy.</div>
                ) : (
                  <>
                    {dailyHabits.length > 0 && (
                      <div className="list">{dailyHabits.map(renderHabit)}</div>
                    )}
                    {otherHabits.length > 0 && (
                      <>
                        <div className="sheet-divider">
                          <span>Puedes hacerlos hoy · opcional</span>
                        </div>
                        <div className="list">{otherHabits.map(renderHabit)}</div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {sheet === "add" && (
              <>
                <h3 className="sheet-title serif">Nueva tarea</h3>
                <p className="sheet-sub">
                  {view === "planear"
                    ? `Se agrega a '${planWeek === "next" ? "Próxima semana" : "Esta semana"}' por repartir.`
                    : view === "semana"
                    ? "Se agrega a 'Esta semana' (sin fecha)."
                    : `Se agrega a ${isToday ? "hoy" : dayLabelES(data.date)} en tu Notion.`}
                </p>
                <form className="sheet-form" onSubmit={addTask}>
                  <input
                    autoFocus
                    placeholder="¿Qué quieres hacer?"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                  />
                  <button className="btn" type="submit" disabled={adding || !newTask.trim()}>
                    {adding ? "Guardando…" : "Añadir tarea"}
                  </button>
                </form>
              </>
            )}
            {sheet === "addhabit" && (
              <>
                <h3 className="sheet-title serif">Nuevo hábito</h3>
                <p className="sheet-sub">Se agrega a tu base de hábitos en Notion (activo).</p>
                <form className="sheet-form" onSubmit={addHabit}>
                  <input
                    autoFocus
                    placeholder="¿Qué hábito quieres construir?"
                    value={nhName}
                    onChange={(e) => setNhName(e.target.value)}
                  />

                  <div className="q">
                    <div className="q-label">Cadencia</div>
                    <div className="chips">
                      {["Daily", "Weekly", "Monthly", "Bimonthly", "Yearly"].map((c) => (
                        <button
                          type="button"
                          key={c}
                          className={`chip ${nhCadence === c ? "chip-on" : ""}`}
                          onClick={() => setNhCadence(c)}
                        >
                          {cadenceES(c)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="q">
                    <div className="q-label">Meta (veces por periodo)</div>
                    <div className="chips">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <button
                          type="button"
                          key={n}
                          className={`chip chip-num ${nhTarget === n ? "chip-on" : ""}`}
                          onClick={() => setNhTarget(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="q">
                    <div className="q-label">Momento del día (opcional)</div>
                    <div className="chips">
                      {(["morning", "afternoon", "night"] as const).map((t) => (
                        <button
                          type="button"
                          key={t}
                          className={`chip ${nhTod === t ? "chip-on" : ""}`}
                          onClick={() => setNhTod(nhTod === t ? null : t)}
                        >
                          {TOD_ES[t].ico} {TOD_ES[t].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="q">
                    <div className="q-label">Tiempo estimado (opcional)</div>
                    <div className="chips">
                      {TIME_OPTS.map((o) => (
                        <button
                          type="button"
                          key={o.v}
                          className={`chip ${nhEst === o.v ? "chip-on" : ""}`}
                          onClick={() => setNhEst(nhEst === o.v ? null : o.v)}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn"
                    type="submit"
                    disabled={addingHabit || !nhName.trim()}
                  >
                    {addingHabit ? "Guardando…" : "Añadir hábito"}
                  </button>
                </form>
              </>
            )}
            {sheet === "task" && activeTask && (() => {
              const live =
                (data?.tasks ?? []).find((x) => x.id === activeTask.id) ??
                (weekTasks ?? []).find((x) => x.id === activeTask.id) ??
                (planData?.pool ?? []).find((x) => x.id === activeTask.id) ??
                (planData?.week ?? []).find((x) => x.id === activeTask.id) ??
                activeTask;
              const done = live.status === "Done";
              const sug = suggestPriority(live);
              const showSug = sug && sug !== live.priority;
              const days = data ? weekBounds(data.today).days : [];
              return (
                <>
                  <h3 className="sheet-title serif">{live.title}</h3>

                  <button
                    className={`btn ${done ? "btn-ghost" : ""}`}
                    style={{ width: "100%", marginTop: 4, marginBottom: 6 }}
                    onClick={() => setStatus(live, done ? "Not started" : "Done")}
                  >
                    {done ? "Marcar como no hecha" : "Marcar como hecha ✓"}
                  </button>

                  <div className="q">
                    <div className="q-label">Estado</div>
                    <div className="chips">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          className={`chip ${live.status === s ? "chip-on" : ""}`}
                          onClick={() => setStatus(live, s)}
                        >
                          {statusES(s)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sheet-divider">
                    <span>Puntuar</span>
                  </div>

                  <div className="q">
                    <div className="q-label">Importancia</div>
                    <div className="chips">
                      {IMPORTANCE_OPTS.map((o) => (
                        <button
                          key={o.v}
                          className={`chip ${live.importance === o.v ? "chip-on" : ""}`}
                          onClick={() =>
                            setField(live, { importance: live.importance === o.v ? null : o.v })
                          }
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="q">
                    <div className="q-label">Impacto</div>
                    <div className="chips">
                      {SCALE.map((n) => (
                        <button
                          key={n}
                          className={`chip chip-num ${live.impact === n ? "chip-on" : ""}`}
                          onClick={() => setField(live, { impact: live.impact === n ? null : n })}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="q">
                    <div className="q-label">Esfuerzo</div>
                    <div className="chips">
                      {SCALE.map((n) => (
                        <button
                          key={n}
                          className={`chip chip-num ${live.effort === n ? "chip-on" : ""}`}
                          onClick={() => setField(live, { effort: live.effort === n ? null : n })}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="q">
                    <div className="q-label">Tiempo estimado</div>
                    <div className="chips">
                      {TIME_OPTS.map((o) => (
                        <button
                          key={o.v}
                          className={`chip ${live.estMin === o.v ? "chip-on" : ""}`}
                          onClick={() => setField(live, { estMin: live.estMin === o.v ? null : o.v })}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="q">
                    <div className="q-head">
                      <div className="q-label">Prioridad</div>
                      {showSug && (
                        <button
                          className="suggest-pill"
                          onClick={() => setField(live, { priority: sug })}
                        >
                          ✦ Sugerida: {prioES(sug!)}
                        </button>
                      )}
                    </div>
                    <div className="chips">
                      {PRIORITY_OPTS.map((o) => (
                        <button
                          key={o.v}
                          className={`chip ${live.priority === o.v ? "chip-on" : ""} ${
                            sug === o.v && live.priority !== o.v ? "chip-suggested" : ""
                          }`}
                          onClick={() =>
                            setField(live, { priority: live.priority === o.v ? null : o.v })
                          }
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sheet-divider">
                    <span>Agendar</span>
                  </div>

                  <div className="q">
                    <div className="q-label">Día</div>
                    <div className="assign-days">
                      {days.map((iso) => {
                        const sel = (live.date ?? "").slice(0, 10) === iso;
                        return (
                          <button
                            key={iso}
                            className={`btn assign-day ${sel ? "" : "btn-ghost"}`}
                            onClick={() => assignTaskToDay(live, iso)}
                          >
                            <span>
                              {shortDayES(iso)}
                              {iso === data!.today ? " · hoy" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="q">
                    <div className="q-label">Hora de inicio</div>
                    <div className="chips" style={{ alignItems: "center" }}>
                      <input
                        type="time"
                        className="time-input"
                        value={hasTime(live.date) ? timeHHMM_ET(live.date!) : ""}
                        onChange={(e) => saveTime(live, e.target.value ? e.target.value : null)}
                      />
                      {hasTime(live.date) && (
                        <button className="chip" onClick={() => saveTime(live, null)}>
                          Quitar hora
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="sheet-divider">
                    <span>Mover</span>
                  </div>
                  <div className="chips">
                    {BUCKETS.map((b) => (
                      <button
                        key={b.key}
                        className={`chip ${live.plan === b.key ? "chip-on" : ""}`}
                        onClick={() => moveTask(live, b.key)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {taskDetail?.url && (
                    <a
                      className="btn btn-ghost"
                      href={taskDetail.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        textAlign: "center",
                        textDecoration: "none",
                        marginTop: 16,
                      }}
                    >
                      Abrir en Notion ↗
                    </a>
                  )}

                  {!confirmDelete ? (
                    <button className="btn-text-danger" onClick={() => setConfirmDelete(true)}>
                      Borrar tarea
                    </button>
                  ) : (
                    <div className="confirm">
                      <p className="confirm-q">
                        ¿Borrar esta tarea? Se mueve a la papelera de Notion.
                      </p>
                      <div className="confirm-row">
                        <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                          Cancelar
                        </button>
                        <button className="btn btn-danger" onClick={() => removeTask(live)}>
                          Sí, borrar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            {sheet === "soon" && (
              <div className="soon">
                <span className="big">🌱</span>
                <strong>{soonLabel}</strong>
                <p>Próximamente. Lo construimos en la siguiente versión.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- header ---------- */
function Header({ onProfile }: { onProfile: () => void }) {
  return (
    <header className="head">
      <div>
        <p className="kicker">Mi día</p>
        <h1 className="hello serif">
          Hola, {NAME} <Heart />
        </h1>
        <p className="subtitle">Pequeños pasos, grandes cambios.</p>
      </div>
      <button className="avatar" aria-label="Perfil" onClick={onProfile}>
        <Leaf />
      </button>
    </header>
  );
}

/* ---------- bottom nav ---------- */
function BottomNav({
  view,
  onNav,
}: {
  view: string;
  onNav: (tab: string) => void;
}) {
  const sw = { strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <nav className="nav">
      <div className="nav-inner">
        <button
          className={`tab ${view === "hoy" ? "active" : ""}`}
          onClick={() => onNav("hoy")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
            <path d="M4 11l8-6 8 6" />
            <path d="M6 10v9h12v-9" />
          </svg>
          Hoy
        </button>
        <button
          className={`tab ${view === "dia" ? "active" : ""}`}
          onClick={() => onNav("dia")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.5 2" />
          </svg>
          Día
        </button>
        <button
          className={`tab ${view === "planear" ? "active" : ""}`}
          onClick={() => onNav("semana")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
            <rect x="3.5" y="5" width="17" height="16" rx="2" />
            <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
            <path d="M7.5 13h3M7.5 17h3M13.5 13h3M13.5 17h3" />
          </svg>
          Semana
        </button>
        <button
          className={`tab ${view === "semana" ? "active" : ""}`}
          onClick={() => onNav("pendientes")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
            <path d="M4 6l1.4 1.4L8 4.8" />
            <path d="M4 12l1.4 1.4L8 10.8" />
            <path d="M4 18h2" />
            <path d="M11 6h9M11 12h9M11 18h9" />
          </svg>
          Pendientes
        </button>
        <button
          className={`tab ${view === "perfil" ? "active" : ""}`}
          onClick={() => onNav("perfil")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...sw}>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
          </svg>
          Perfil
        </button>
      </div>
    </nav>
  );
}
