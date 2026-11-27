"use client";

import { useMemo, useState } from "react";
import type { FinanceData, Recurrente } from "@/lib/notion";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("es-US", { style: "currency", currency: "USD" });

type Tab = "mes" | "recurrentes" | "deudas";

export default function Dashboard({ data }: { data: FinanceData }) {
  const [tab, setTab] = useState<Tab>("recurrentes");
  const [recs, setRecs] = useState(data.recurrentes);

  async function toggleRec(r: Recurrente) {
    const done = !r.listoMes;
    const patch = (x: Recurrente) => (x.id === r.id ? { ...x, listoMes: done } : x);
    setRecs((cur) => ({ ...cur, mensual: cur.mensual.map(patch), anual: cur.anual.map(patch) }));
    try {
      const res = await fetch("/api/recurrente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, done }),
      });
      if (!res.ok) throw new Error();
    } catch {
      const revert = (x: Recurrente) => (x.id === r.id ? { ...x, listoMes: !done } : x);
      setRecs((cur) => ({ ...cur, mensual: cur.mensual.map(revert), anual: cur.anual.map(revert) }));
    }
  }

  return (
    <main className="fin">
      <header className="fin-head">
        <h1>💰 Finanzas</h1>
      </header>

      <nav className="fin-tabs">
        <button className={tab === "recurrentes" ? "on" : ""} onClick={() => setTab("recurrentes")}>Recurrentes</button>
        <button className={tab === "mes" ? "on" : ""} onClick={() => setTab("mes")}>Este mes</button>
        <button className={tab === "deudas" ? "on" : ""} onClick={() => setTab("deudas")}>Deudas y metas</button>
      </nav>

      {tab === "recurrentes" && <RecurrentesTab recs={recs} onToggle={toggleRec} />}
      {tab === "mes" && <MesTab data={data} />}
      {tab === "deudas" && <DeudasTab data={data} />}
    </main>
  );
}

function RecurrentesTab({
  recs,
  onToggle,
}: {
  recs: FinanceData["recurrentes"];
  onToggle: (r: Recurrente) => void;
}) {
  const activas = useMemo(() => [...recs.mensual, ...recs.anual], [recs]);
  const listas = activas.filter((r) => r.listoMes).length;

  return (
    <section className="fin-sec">
      <div className="fin-card fin-sum">
        <div className="fin-sum-top">
          <span className="fin-label">Cobradas este mes</span>
          <span className="fin-sum-amt">
            {listas} <span className="fin-muted">/ {activas.length}</span>
          </span>
        </div>
        <Bar pct={activas.length ? (listas / activas.length) * 100 : 0} tone="gold" />
        <span className="fin-hint" style={{ marginTop: 2 }}>
          Fijo mensual: {money(recs.totalMensual)} · toca una para marcarla ✓
        </span>
      </div>

      <h2 className="fin-h2">Mensuales</h2>
      <ul className="fin-list">
        {recs.mensual.map((x) => (
          <RecRow key={x.id} r={x} onToggle={onToggle} />
        ))}
        {recs.mensual.length === 0 && <p className="fin-muted">—</p>}
      </ul>

      {recs.anual.length > 0 && (
        <>
          <h2 className="fin-h2">Anuales / otras</h2>
          <ul className="fin-list">
            {recs.anual.map((x) => (
              <RecRow key={x.id} r={x} onToggle={onToggle} />
            ))}
          </ul>
        </>
      )}

      {recs.canceladas.length > 0 && (
        <>
          <h2 className="fin-h2">Canceladas · no deberían reaparecer</h2>
          <div className="fin-cancel">
            {recs.canceladas.map((x) => (
              <span key={x.id} className="fin-cancel-pill">{x.name}</span>
            ))}
          </div>
          <p className="fin-hint">Si alguna de estas reaparece en el banco, es un cargo no deseado.</p>
        </>
      )}
    </section>
  );
}

function RecRow({ r, onToggle }: { r: Recurrente; onToggle: (r: Recurrente) => void }) {
  return (
    <li>
      <button className={`fin-rec tappable ${r.listoMes ? "done" : ""}`} onClick={() => onToggle(r)}>
        <span className={`fin-check ${r.listoMes ? "on" : ""}`}>{r.listoMes ? "✓" : ""}</span>
        <div className="fin-rec-main">
          <span className="fin-rec-name">{r.name}</span>
          <span className="fin-rec-when">
            {r.listoMes ? "Listo este mes" : r.cuando || "Pendiente"}
            {r.priceChanged && (
              <span className="fin-price"> · subió a {money(Math.abs(r.ultimoMonto ?? 0))}</span>
            )}
          </span>
        </div>
        <span className="fin-rec-amt">{money(r.monto)}</span>
      </button>
    </li>
  );
}

function MesTab({ data }: { data: FinanceData }) {
  const b = data.budget;
  const bal = data.balances;
  return (
    <section className="fin-sec">
      {b ? (
        <>
          <div className="fin-card fin-sum">
            <div className="fin-sum-top">
              <span className="fin-label">Presupuesto · {monthLabel(b.month)}</span>
              <span className="fin-sum-amt">
                {money(b.spent)} <span className="fin-muted">/ {money(b.planned)}</span>
              </span>
            </div>
            <Bar pct={b.planned > 0 ? (b.spent / b.planned) * 100 : 0} />
          </div>
          <ul className="fin-list">
            {b.rows.map((r) => (
              <li key={r.category} className="fin-cat">
                <div className="fin-cat-top">
                  <span className="fin-cat-name">{r.category}</span>
                  <span className="fin-cat-amt">
                    {money(r.spent)} <span className="fin-muted">/ {money(r.planned)}</span>
                  </span>
                </div>
                <Bar pct={r.pct} />
                <div className={`fin-cat-rem ${r.remaining < 0 ? "neg" : "pos"}`}>
                  {r.remaining < 0
                    ? `${money(Math.abs(r.remaining))} sobre el límite`
                    : `${money(r.remaining)} disponible`}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="fin-muted">Sin presupuesto cargado todavía.</p>
      )}

      {bal && bal.rows.length > 0 && (
        <>
          <h2 className="fin-h2">Saldos · {monthLabel(bal.month)}</h2>
          <ul className="fin-list">
            {bal.rows.map((r, i) => (
              <li key={i} className="fin-card fin-bal">
                <div className="fin-bal-top">
                  <span className="fin-bal-name">{r.name}</span>
                  <span className="fin-bal-amt">{money(r.real)}</span>
                </div>
                <div className={`fin-chip ${r.ok ? "ok" : "warn"}`}>
                  {r.ok ? "✅ Cuadra" : `⚠️ Revisar · dif ${money(r.diferencia)}`}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DeudasTab({ data }: { data: FinanceData }) {
  return (
    <section className="fin-sec">
      <h2 className="fin-h2">Deudas</h2>
      <ul className="fin-list">
        {data.debts.map((d, i) => (
          <li key={i} className="fin-card fin-debt">
            <div className="fin-debt-top">
              <span className="fin-debt-name">{d.name}</span>
              {d.priority === "Urgente" && <span className="fin-chip warn">Urgente</span>}
            </div>
            <span className="fin-debt-amt">{money(d.saldo ?? d.owed)}</span>
            {d.owed != null && (
              <div className="fin-muted fin-small">
                Original {money(d.owed)}
                {d.paid ? ` · pagado ${money(d.paid)}` : ""}
              </div>
            )}
          </li>
        ))}
        {data.debts.length === 0 && <p className="fin-muted">Sin deudas activas 🎉</p>}
      </ul>

      <h2 className="fin-h2">Metas de ahorro</h2>
      <ul className="fin-list">
        {data.savings.map((g, i) => (
          <li key={i} className="fin-card fin-goal">
            <div className="fin-goal-top">
              <span className="fin-goal-name">{g.name}</span>
              <span className="fin-goal-amt">
                {money(g.current)} <span className="fin-muted">/ {money(g.target)}</span>
              </span>
            </div>
            <Bar pct={g.pct} tone="gold" />
            <div className="fin-muted fin-small">{g.pct}% completado</div>
          </li>
        ))}
        {data.savings.length === 0 && <p className="fin-muted">Sin metas activas.</p>}
      </ul>
    </section>
  );
}

function Bar({ pct, tone }: { pct: number; tone?: "gold" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const over = pct > 100;
  return (
    <div className="fin-bar">
      <div
        className={`fin-bar-fill ${over ? "over" : ""} ${tone === "gold" ? "gold" : ""}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
