"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
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

function Check() {
  return (
    <span className="check" aria-hidden>
      <svg viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8.5l3.2 3.2L13 5"
          stroke="#f7f1ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function prettyDate(iso: string): string {
  // iso = YYYY-MM-DD (Eastern). Build a label without timezone drift.
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
}

function isOverdue(taskDate: string | null, today: string): boolean {
  return !!taskDate && taskDate.slice(0, 10) < today;
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());

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
          const body = await res.json();
          detail = body?.error ?? "";
        } catch {
          // ignore
        }
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

  async function completeTask(t: Task) {
    if (pending.has(t.id)) return;
    markPending(t.id, true);
    // optimistic: remove from list
    setData((d) =>
      d ? { ...d, tasks: d.tasks.filter((x) => x.id !== t.id) } : d
    );
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // revert
      setData((d) => (d ? { ...d, tasks: [t, ...d.tasks] } : d));
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

  if (error && !data) {
    return (
      <>
        <header className="head">
          <p className="kicker">Command Center</p>
          <h1 className="title serif">Hoy</h1>
        </header>
        <div className="empty">{error}</div>
        <div className="center">
          <button className="refresh" onClick={load}>
            Reintentar
          </button>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <header className="head">
          <p className="kicker">Command Center</p>
          <h1 className="title serif">Hoy</h1>
        </header>
        <div className="loading">Cargando…</div>
      </>
    );
  }

  const doneHabits = data.habits.filter((h) => h.done).length;

  return (
    <>
      <header className="head">
        <p className="kicker">Command Center</p>
        <h1 className="title serif">Hoy</h1>
        <p className="date">{prettyDate(data.today)}</p>
      </header>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title serif">Tareas</h2>
          <span className="count">{data.tasks.length} pendientes</span>
        </div>
        {data.tasks.length === 0 ? (
          <div className="empty">Nada pendiente. Respira. ✦</div>
        ) : (
          <div className="list">
            {data.tasks.map((t) => (
              <div
                key={t.id}
                className="item"
                onClick={() => completeTask(t)}
                role="button"
                tabIndex={0}
              >
                <Check />
                <div className="item-body">
                  <div className="item-title">{t.title}</div>
                  <div className="item-meta">
                    {isOverdue(t.date, data.today) && (
                      <span className="tag overdue">Vencida</span>
                    )}
                    {t.priority && <span className="tag">{t.priority}</span>}
                    {t.status && <span className="tag">{t.status}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title serif">Hábitos</h2>
          <span className="count">
            {doneHabits}/{data.habits.length}
          </span>
        </div>
        {data.habits.length === 0 ? (
          <div className="empty">No hay hábitos para hoy.</div>
        ) : (
          <div className="list">
            {data.habits.map((h) => (
              <div
                key={h.id}
                className={`item ${h.done ? "done" : ""}`}
                onClick={() => toggleHabit(h)}
                role="button"
                tabIndex={0}
              >
                <Check />
                <div className="item-body">
                  <div className="item-title">{h.title}</div>
                  {h.cadence && (
                    <div className="item-meta">
                      <span className="tag">{h.cadence}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="footer">
        <button className="refresh" onClick={load}>
          Actualizar
        </button>
      </div>
    </>
  );
}
