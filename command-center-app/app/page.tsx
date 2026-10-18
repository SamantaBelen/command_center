"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  "Done": { es: "Hecha", color: "#6f8a4f" },
  "Cancel": { es: "Cancelada", color: "#a1392c" },
};
// Options offered in the quick picker (in order).
const STATUS_OPTIONS = ["Not started", "In progress", "Waiting", "Done"];
const statusES = (s: string) => STATUS_META[s]?.es ?? s;
const statusColor = (s: string) => STATUS_META[s]?.color ?? "#9a8f84";

const CADENCE_ES: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};
const cadenceES = (c: string | null) =>
  c ? CADENCE_ES[c.toLowerCase()] ?? c : "";

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
function TypeIcon({ type }: { type: string | null }) {
  const t = (type ?? "").toLowerCase();
  let path: React.ReactNode;
  if (/red|social|instagram|tiktok|tik tok|marketing|content/.test(t)) {
    path = (
      <>
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" />
      </>
    );
  } else if (/casa|home|hogar|limpieza|personal/.test(t)) {
    path = (
      <>
        <path d="M4 11l8-6 8 6" />
        <path d="M6 10v9h12v-9" />
      </>
    );
  } else if (/salud|health|gym|gimnasio|ejercicio/.test(t)) {
    path = (
      <path d="M12 20s-6-4-8-8c-1.3-2.9 0-5.5 2.8-5.5 1.6 0 2.7 1 3.2 1.8.5-.8 1.6-1.8 3.2-1.8C16 6.5 17.3 9.1 16 12c-2 4-4 8-4 8z" />
    );
  } else {
    path = (
      <>
        <rect x="4" y="5" width="16" height="11" rx="1.5" />
        <path d="M2.5 19.5h19" />
      </>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path}
    </svg>
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
function fmtMin(total: number): string {
  if (!total) return "";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
function taskWhen(dateStr: string | null, todayISO: string): string {
  if (!dateStr) return "";
  const datePart = dateStr.slice(0, 10);
  const [y, m, d] = todayISO.split("-").map(Number);
  const yest = new Date(Date.UTC(y, m - 1, d));
  yest.setUTCDate(yest.getUTCDate() - 1);
  const yestISO = `${yest.getUTCFullYear()}-${String(yest.getUTCMonth() + 1).padStart(2, "0")}-${String(yest.getUTCDate()).padStart(2, "0")}`;

  let label: string;
  if (datePart === todayISO) label = "Hoy";
  else if (datePart === yestISO) label = "Ayer";
  else if (datePart < todayISO) label = "Vencida";
  else {
    const [yy, mm, dd] = datePart.split("-").map(Number);
    const dt = new Date(Date.UTC(yy, mm - 1, dd));
    label = new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(dt);
  }

  if (dateStr.length > 10 && dateStr.includes("T")) {
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(new Date(dateStr));
    return `${label}, ${time}`;
  }
  return label;
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<
    null | "habits" | "add" | "soon" | "task" | "plan" | "status" | "assign"
  >(null);
  const [soonLabel, setSoonLabel] = useState("");
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetailData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [view, setView] = useState<"hoy" | "semana" | "planear">("hoy");
  const [weekTasks, setWeekTasks] = useState<Task[] | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planWeek, setPlanWeek] = useState<"this" | "next">("this");

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
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
    setData((d) =>
      d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: next } : x)) } : d
    );
    setWeekTasks((ws) =>
      ws ? ws.map((x) => (x.id === t.id ? { ...x, status: next } : x)) : ws
    );
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, done: willBeDone }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setData((d) =>
        d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)) } : d
      );
      setWeekTasks((ws) =>
        ws ? ws.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)) : ws
      );
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
      const body =
        view === "semana" ? { title, plan: "Esta semana" } : { title, date: data.date };
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const payload = await res.json();
      if (view === "semana") {
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
  async function moveTask(t: Task, plan: string, scheduleToday = false) {
    setSheet(null);
    if (view === "hoy") {
      setData((d) => (d ? { ...d, tasks: d.tasks.filter((x) => x.id !== t.id) } : d));
    } else {
      setWeekTasks((ws) => (ws ? ws.filter((x) => x.id !== t.id) : ws));
    }
    try {
      const body = scheduleToday
        ? { id: t.id, plan: "Agendado", date: data!.today }
        : { id: t.id, plan, clearDate: true };
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      if (view === "semana") loadWeek();
    } catch {
      setError("No se pudo mover la tarea");
      if (view === "hoy") load(data!.date);
      else loadWeek();
    }
  }

  async function setStatus(t: Task, status: string) {
    setSheet(null);
    if (pending.has(t.id)) return;
    markPending(t.id, true);
    setData((d) =>
      d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) } : d
    );
    setWeekTasks((ws) =>
      ws ? ws.map((x) => (x.id === t.id ? { ...x, status } : x)) : ws
    );
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setData((d) =>
        d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)) } : d
      );
      setWeekTasks((ws) =>
        ws ? ws.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)) : ws
      );
      setError("No se pudo cambiar el estado");
    } finally {
      markPending(t.id, false);
    }
  }

  function openStatusSheet(t: Task) {
    setActiveTask(t);
    setSheet("status");
  }

  function openSoon(label: string) {
    setSoonLabel(label);
    setSheet("soon");
  }

  function onNav(tab: string) {
    if (tab === "hoy") {
      setView("hoy");
    } else if (tab === "semana") {
      setView("semana");
      loadWeek();
    } else if (tab === "planear") {
      // On Sundays, default to planning next week.
      const w: "this" | "next" = data && isSundayISO(data.today) ? "next" : "this";
      setView("planear");
      setPlanWeek(w);
      loadPlan(w);
    } else {
      openSoon(tab === "proyectos" ? "Proyectos" : "Perfil");
    }
  }

  // Assign a pool task to a specific day: set its date + Planeación "Agendado".
  async function assignTaskToDay(t: Task, dayISO: string) {
    setSheet(null);
    setPlanData((p) =>
      p
        ? {
            ...p,
            pool: p.pool.filter((x) => x.id !== t.id),
            week: [...p.week, { ...t, date: dayISO, plan: "Agendado" }],
          }
        : p
    );
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, plan: "Agendado", date: dayISO }),
      });
      if (!res.ok) throw new Error();
      loadPlan(planWeek);
    } catch {
      setError("No se pudo asignar la tarea");
      loadPlan(planWeek);
    }
  }

  function openAssignSheet(t: Task) {
    setActiveTask(t);
    setSheet("assign");
  }

  async function removeTask(t: Task) {
    setSheet(null);
    setConfirmDelete(false);
    setData((d) => (d ? { ...d, tasks: d.tasks.filter((x) => x.id !== t.id) } : d));
    setWeekTasks((ws) => (ws ? ws.filter((x) => x.id !== t.id) : ws));
    try {
      const res = await fetch(`/api/task?id=${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setError("No se pudo borrar la tarea");
      if (view === "hoy") load(data!.date);
      else loadWeek();
    }
  }

  async function openTaskDetail(t: Task) {
    setActiveTask(t);
    setConfirmDelete(false);
    let opened = false;
    const reveal = (detail: TaskDetailData) => {
      if (opened) return;
      opened = true;
      setTaskDetail(detail);
      setSheet("task");
    };
    // If Notion is slow, open with the basics so the tap feels responsive.
    const fallback = setTimeout(() => reveal(basicDetail(t)), 450);
    try {
      const res = await fetch(`/api/task?id=${t.id}`, { cache: "no-store" });
      const full = res.ok ? await res.json() : null;
      clearTimeout(fallback);
      if (full && !opened) {
        reveal(full); // fast path: open once, already at final height
      } else if (full) {
        // basics were shown first (slow network): fill in the rest
        setTaskDetail((cur) => (cur && cur.id === full.id ? full : cur));
      } else {
        reveal(basicDetail(t));
      }
    } catch {
      clearTimeout(fallback);
      reveal(basicDetail(t));
    }
  }

  function pressStart(t: Task) {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setActiveTask(t);
      setSheet("plan");
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    }, 450);
  }
  function pressEnd() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }
  function afterPress(fn: () => void) {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    fn();
  }

  function renderTask(t: Task) {
    const done = t.status === "Done";
    return (
      <div
        key={t.id}
        className={`item ${done ? "done" : ""}`}
        onPointerDown={() => pressStart(t)}
        onPointerUp={pressEnd}
        onPointerLeave={pressEnd}
        onPointerCancel={pressEnd}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            afterPress(() => toggleTask(t));
          }}
        >
          <CheckMark />
        </span>
        <div className="item-body" onClick={() => afterPress(() => openTaskDetail(t))}>
          <div className="item-title">{t.title}</div>
          <div className="item-meta">
            <span
              className="status-chip"
              style={{ color: statusColor(t.status) }}
              onClick={(e) => {
                e.stopPropagation();
                afterPress(() => openStatusSheet(t));
              }}
            >
              <i className="dot" style={{ background: statusColor(t.status) }} />
              {statusES(t.status)}
            </span>
            {t.type && (
              <>
                <span className="meta-sep">·</span>
                <TypeIcon type={t.type} />
                <span>{t.type}</span>
              </>
            )}
            {t.date && (
              <>
                <span className="meta-sep">·</span>
                <span>{taskWhen(t.date, data!.today)}</span>
              </>
            )}
          </div>
        </div>
        <span onClick={() => afterPress(() => openTaskDetail(t))}>
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
        <BottomNav active={view} onNav={onNav} />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Header onProfile={() => openSoon("Perfil")} />
        <div className="loading">Cargando…</div>
        <BottomNav active={view} onNav={onNav} />
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
                <div className="list">{data.tasks.map((t) => renderTask(t))}</div>
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
                      <div className="list">{g.items.map((t) => renderTask(t))}</div>
                    )}
                  </div>
                ))}
                {unclassified.length > 0 && (
                  <div className="bucket">
                    <h3 className="bucket-title">Sin clasificar</h3>
                    <div className="list">{unclassified.map((t) => renderTask(t))}</div>
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
        <section className="section" style={{ marginTop: 22 }}>
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
                const mins = dayTasks.reduce((s, t) => s + (t.estMin ?? 0), 0);
                return { iso, count: dayTasks.length, mins };
              });
              const useMins = stats.some((s) => s.mins > 0);
              const max = Math.max(1, ...stats.map((s) => (useMins ? s.mins : s.count)));
              return (
                <>
                  <div className="balance">
                    {stats.map((s) => {
                      const metric = useMins ? s.mins : s.count;
                      const h = metric ? Math.max(12, Math.round((metric / max) * 100)) : 0;
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
                            <i style={{ height: `${h}%` }} />
                          </span>
                          <span className="bal-count">
                            {useMins ? (s.mins ? fmtMin(s.mins) : "—") : s.count || "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="section-head" style={{ marginTop: 26 }}>
                    <h3 className="bucket-title" style={{ margin: 0 }}>
                      {planData.bucket} · por repartir
                    </h3>
                    <span className="count">{planData.pool.length}</span>
                  </div>
                  {planData.pool.length === 0 ? (
                    <div className="empty">¡Semana repartida! ✦</div>
                  ) : (
                    <div className="list">
                      {planData.pool.map((t) => (
                        <div
                          key={t.id}
                          className="item"
                          onClick={() => openAssignSheet(t)}
                        >
                          <div className="item-body">
                            <div className="item-title">{t.title}</div>
                            <div className="item-meta">
                              <span
                                className="status-chip"
                                style={{ color: statusColor(t.status) }}
                              >
                                <i className="dot" style={{ background: statusColor(t.status) }} />
                                {statusES(t.status)}
                              </span>
                              {t.estMin ? (
                                <>
                                  <span className="meta-sep">·</span>
                                  <span>{fmtMin(t.estMin)}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <span className="assign-cta">Asignar →</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="hint">
                    Toca una tarea y elige el día. El balance de arriba se actualiza.
                  </p>

                  <h3 className="bucket-title" style={{ marginTop: 28 }}>
                    La semana
                  </h3>
                  <div className="agenda">
                    {planData.weekDays.map((iso) => {
                      const dayTasks = planData.week
                        .filter((t) => (t.date ?? "").slice(0, 10) === iso)
                        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
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
                                className="agenda-item"
                                onClick={() => openTaskDetail(t)}
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
                </>
              );
            })()
          ) : null}
        </section>
      )}

      {/* add task */}
      <button className="fab" aria-label="Añadir tarea" onClick={() => setSheet("add")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <BottomNav active={view} onNav={onNav} />

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
                  {view === "semana"
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
            {sheet === "plan" && activeTask && (
              <>
                <h3 className="sheet-title serif">{activeTask.title}</h3>
                <p className="sheet-sub">Mover a…</p>
                <div className="sheet-form">
                  {BUCKETS.map((b) => (
                    <button
                      key={b.key}
                      className={`btn ${activeTask.plan === b.key ? "" : "btn-ghost"}`}
                      onClick={() => moveTask(activeTask, b.key)}
                    >
                      {b.label}
                    </button>
                  ))}
                  {!activeTask.date && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => moveTask(activeTask, "Agendado", true)}
                    >
                      Agendar para hoy
                    </button>
                  )}
                </div>
              </>
            )}
            {sheet === "task" && activeTask && (() => {
              const live =
                data.tasks.find((x) => x.id === activeTask.id) ??
                (weekTasks ?? []).find((x) => x.id === activeTask.id) ??
                activeTask;
              const done = live.status === "Done";
              return (
                <>
                  <h3 className="sheet-title serif">{activeTask.title}</h3>
                  <button
                    className={`btn ${done ? "btn-ghost" : ""}`}
                    style={{ width: "100%", marginTop: 6, marginBottom: 16 }}
                    onClick={() => toggleTask(live)}
                  >
                    {done ? "Marcar como no hecha" : "Marcar como hecha ✓"}
                  </button>
                  {taskDetail && taskDetail.fields.length > 0 && (
                    <div className="detail">
                      {taskDetail.fields.map((f) => (
                        <div className="detail-row" key={f.label}>
                          <span className="detail-label">{labelES(f.label)}</span>
                          <span className="detail-value">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                        marginTop: 14,
                      }}
                    >
                      Abrir en Notion ↗
                    </a>
                  )}
                  {!confirmDelete ? (
                    <button
                      className="btn-text-danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Borrar tarea
                    </button>
                  ) : (
                    <div className="confirm">
                      <p className="confirm-q">¿Borrar esta tarea? Se mueve a la papelera de Notion.</p>
                      <div className="confirm-row">
                        <button
                          className="btn btn-ghost"
                          onClick={() => setConfirmDelete(false)}
                        >
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
            {sheet === "status" && activeTask && (
              <>
                <h3 className="sheet-title serif">{activeTask.title}</h3>
                <p className="sheet-sub">Cambiar estado</p>
                <div className="sheet-form">
                  {STATUS_OPTIONS.map((s) => {
                    const current = activeTask.status === s;
                    return (
                      <button
                        key={s}
                        className={`btn status-btn ${current ? "" : "btn-ghost"}`}
                        onClick={() => setStatus(activeTask, s)}
                      >
                        <i className="dot" style={{ background: statusColor(s) }} />
                        {statusES(s)}
                        {current && <span className="status-current"> ✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {sheet === "assign" && activeTask && planData && (
              <>
                <h3 className="sheet-title serif">{activeTask.title}</h3>
                <p className="sheet-sub">¿Qué día la haces?</p>
                <div className="assign-days">
                  {planData.weekDays.map((iso) => {
                    const n = planData.week.filter(
                      (t) => (t.date ?? "").slice(0, 10) === iso
                    ).length;
                    return (
                      <button
                        key={iso}
                        className="btn btn-ghost assign-day"
                        onClick={() => assignTaskToDay(activeTask, iso)}
                      >
                        <span>
                          {shortDayES(iso)}
                          {iso === planData.today ? " · hoy" : ""}
                        </span>
                        {n > 0 && <span className="assign-load">{n}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
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
  active,
  onNav,
}: {
  active: string;
  onNav: (tab: string) => void;
}) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <button
          className={`tab ${active === "hoy" ? "active" : ""}`}
          onClick={() => onNav("hoy")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-6 8 6" />
            <path d="M6 10v9h12v-9" />
          </svg>
          Hoy
        </button>
        <button
          className={`tab ${active === "semana" ? "active" : ""}`}
          onClick={() => onNav("semana")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l1.4 1.4L8 4.8" />
            <path d="M4 12l1.4 1.4L8 10.8" />
            <path d="M4 18h2" />
            <path d="M11 6h9M11 12h9M11 18h9" />
          </svg>
          Pendientes
        </button>
        <button
          className={`tab ${active === "planear" ? "active" : ""}`}
          onClick={() => onNav("planear")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="5" width="17" height="16" rx="2" />
            <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
            <path d="M7.5 13h3M7.5 17h3M13.5 13h3M13.5 17h3" />
          </svg>
          Planear
        </button>
        <button className="tab" onClick={() => onNav("proyectos")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 5C11 5 7 9.5 7 15c0 .8.1 1.6.3 2.3M20 5c0 7.5-4.5 10.8-10.5 11.3M20 5c-2 .3-5.8 1.3-8.3 4.2" />
          </svg>
          Proyectos
        </button>
        <button className="tab" onClick={() => onNav("perfil")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
          </svg>
          Perfil
        </button>
      </div>
    </nav>
  );
}
