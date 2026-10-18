"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const NAME = "Samanta";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  type: string | null;
  date: string | null;
};
type Habit = {
  id: string;
  title: string;
  done: boolean;
  cadence: string | null;
  order: number | null;
};
type Data = { today: string; tasks: Task[]; habits: Habit[] };

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
    // phone
    path = (
      <>
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" />
      </>
    );
  } else if (/casa|home|hogar|limpieza|personal/.test(t)) {
    // house
    path = (
      <>
        <path d="M4 11l8-6 8 6" />
        <path d="M6 10v9h12v-9" />
      </>
    );
  } else if (/salud|health|gym|gimnasio|ejercicio/.test(t)) {
    // heart
    path = (
      <path d="M12 20s-6-4-8-8c-1.3-2.9 0-5.5 2.8-5.5 1.6 0 2.7 1 3.2 1.8.5-.8 1.6-1.8 3.2-1.8C16 6.5 17.3 9.1 16 12c-2 4-4 8-4 8z" />
    );
  } else {
    // laptop (work / default)
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
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}
function weekDays(todayISO: string) {
  const [y, m, d] = todayISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = base.getUTCDay(); // 0 Sun .. 6 Sat
  const toMonday = (dow + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - toMonday);
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const out: { iso: string; num: number; dow: string; today: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(monday.getUTCDate() + i);
    const iso = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}-${String(cur.getUTCDate()).padStart(2, "0")}`;
    out.push({ iso, num: cur.getUTCDate(), dow: labels[i], today: iso === todayISO });
  }
  return out;
}
function taskWhen(dateStr: string | null, todayISO: string): string {
  if (!dateStr) return "";
  const datePart = dateStr.slice(0, 10);
  // yesterday iso
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

  // time, if the value carries one
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
  const [sheet, setSheet] = useState<null | "habits" | "add" | "soon">(null);
  const [soonLabel, setSoonLabel] = useState("");
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/today", { cache: "no-store" });
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
    markPending(t.id, true);
    setData((d) =>
      d
        ? {
            ...d,
            tasks: d.tasks.map((x) =>
              x.id === t.id
                ? { ...x, status: willBeDone ? "Done" : "Not started" }
                : x
            ),
          }
        : d
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
        d
          ? {
              ...d,
              tasks: d.tasks.map((x) =>
                x.id === t.id ? { ...x, status: t.status } : x
              ),
            }
          : d
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
      d
        ? {
            ...d,
            habits: d.habits.map((x) =>
              x.id === h.id ? { ...x, done: nextDone } : x
            ),
          }
        : d
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
        d
          ? {
              ...d,
              habits: d.habits.map((x) =>
                x.id === h.id ? { ...x, done: h.done } : x
              ),
            }
          : d
      );
      setError("No se pudo guardar el hábito");
    } finally {
      markPending(h.id, false);
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setData((d) =>
        d ? { ...d, tasks: [...d.tasks, body.task] } : d
      );
      setNewTask("");
      setSheet(null);
    } catch {
      setError("No se pudo crear la tarea");
    } finally {
      setAdding(false);
    }
  }

  function openSoon(label: string) {
    setSoonLabel(label);
    setSheet("soon");
  }

  /* ----- render states ----- */
  if (error && !data) {
    return (
      <>
        <Header onProfile={() => openSoon("Perfil")} />
        <div className="empty">{error}</div>
        <div className="center">
          <button className="refresh" onClick={load}>
            Reintentar
          </button>
        </div>
        <BottomNav active="hoy" onTab={openSoon} />
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Header onProfile={() => openSoon("Perfil")} />
        <div className="loading">Cargando…</div>
        <BottomNav active="hoy" onTab={openSoon} />
      </>
    );
  }

  const pendingTasks = data.tasks.filter((t) => t.status !== "Done").length;
  const habitsDone = data.habits.filter((h) => h.done).length;
  const habitsTotal = data.habits.length;
  const pct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0;

  return (
    <>
      <Header onProfile={() => openSoon("Perfil")} />

      {/* week strip */}
      <div className="week">
        {week.map((d, i) => (
          <div key={i} className={`day ${d.today ? "today" : ""}`}>
            <div className="dow">{d.dow}</div>
            <div className="dnum">{d.num}</div>
          </div>
        ))}
      </div>

      {/* tea hero -> habits */}
      <div
        className="hero"
        role="button"
        tabIndex={0}
        onClick={() => setSheet("habits")}
      >
        <div className="hero-text">
          <p className="hero-label serif">Tu té de hoy</p>
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
          <div className="list">
            {data.tasks.map((t) => {
              const done = t.status === "Done";
              return (
                <div key={t.id} className={`item ${done ? "done" : ""}`}>
                  <span onClick={() => toggleTask(t)}>
                    <CheckMark />
                  </span>
                  <div className="item-body" onClick={() => toggleTask(t)}>
                    <div className="item-title">{t.title}</div>
                    <div className="item-meta">
                      <TypeIcon type={t.type} />
                      {t.type && <span>{t.type}</span>}
                      {t.type && t.date && <span className="meta-sep">|</span>}
                      {t.date && <span>{taskWhen(t.date, data.today)}</span>}
                    </div>
                  </div>
                  <Chevron />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="center" style={{ marginTop: 22 }}>
        <button className="refresh" onClick={load}>
          Actualizar
        </button>
      </div>

      {/* add task */}
      <button className="fab" aria-label="Añadir tarea" onClick={() => setSheet("add")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <BottomNav active="hoy" onTab={openSoon} />

      {/* sheets */}
      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            {sheet === "habits" && (
              <>
                <h3 className="sheet-title serif">Hábitos de hoy</h3>
                <p className="sheet-sub">
                  {habitsDone} de {habitsTotal} ✦ cada gota cuenta
                </p>
                {habitsTotal === 0 ? (
                  <div className="empty">No hay hábitos para hoy.</div>
                ) : (
                  <div className="list">
                    {data.habits.map((h) => (
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
                              <span>{h.cadence}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {sheet === "add" && (
              <>
                <h3 className="sheet-title serif">Nueva tarea</h3>
                <p className="sheet-sub">Se agrega a hoy en tu Notion.</p>
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
  onTab,
}: {
  active: string;
  onTab: (label: string) => void;
}) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <button className={`tab ${active === "hoy" ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-6 8 6" />
            <path d="M6 10v9h12v-9" />
          </svg>
          Hoy
        </button>
        <button className="tab" onClick={() => onTab("Calendario")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M4 9h16M8 3v4M16 3v4" />
          </svg>
          Calendario
        </button>
        <button className="tab" onClick={() => onTab("Proyectos")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 5C11 5 7 9.5 7 15c0 .8.1 1.6.3 2.3M20 5c0 7.5-4.5 10.8-10.5 11.3M20 5c-2 .3-5.8 1.3-8.3 4.2" />
          </svg>
          Proyectos
        </button>
        <button className="tab" onClick={() => onTab("Perfil")}>
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
