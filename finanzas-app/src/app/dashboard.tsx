"use client";

import { useState } from "react";
import type { FinanceData } from "@/lib/notion";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}
const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("es-US", { style: "currency", currency: "USD" });

type Tab = "mes" | "recurrentes" | "deudas";

export default function Dashboard({ data }: { data: FinanceData }) {
  const [tab, setTab] = useState<Tab>("mes");
  return (
    <main className="fin">
      <header className="fin-head">
        <h1>💰 Finanzas</h1>
      </header>

      <nav className="fin-tabs">
        <button className={tab === "mes" ? "on" : ""} onClick={() => setTab("mes")}>Este mes</button>
        <button className={tab === "recurrentes" ? "on" : ""} onClick={() => setTab("recurrentes")}>Recurrentes</button>
        <button className={tab === "deudas" ? "on" : ""} onClick={() => setTab("deudas")}>Deudas y metas</button>
      </nav>

      {tab === "mes" && <MesTab data={data} />}
      {tab === "recurrentes" && <RecurrentesTab data={data} />}
      {tab === "deudas" && <DeudasTab data={data} />}
    </main>
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

function RecurrentesTab({ data }: { data: FinanceData }) {
  const r = data.recurrentes;
  return (
    <section className="fin-sec">
      <div className="fin-card fin-sum">
        <span className="fin-label">Fijo mensual (activas)</span>
        <span className="fin-sum-amt big">{money(r.totalMensual)}<span className="fin-muted"> /mes</span></span>
      </div>

      <h2 className="fin-h2">Mensuales</h2>
      <ul className="fin-list">
        {r.mensual.map((x, i) => (
          <li key={i} className="fin-rec">
            <div className="fin-rec-main">
              <span className="fin-rec-name">{x.name}</span>
              {x.cuando && <span className="fin-rec-when">{x.cuando}</span>}
            </div>
            <span className="fin-rec-amt">{money(x.monto)}</span>
          </li>
        ))}
        {r.mensual.length === 0 && <p className="fin-muted">—</p>}
      </ul>

      {r.anual.length > 0 && (
        <>
          <h2 className="fin-h2">Anuales / otras</h2>
          <ul className="fin-list">
            {r.anual.map((x, i) => (
              <li key={i} className="fin-rec">
                <div className="fin-rec-main">
                  <span className="fin-rec-name">{x.name}</span>
                  {x.cuando && <span className="fin-rec-when">{x.cuando}</span>}
                </div>
                <span className="fin-rec-amt">{money(x.monto)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {r.canceladas.length > 0 && (
        <>
          <h2 className="fin-h2">Canceladas · no deberían reaparecer</h2>
          <div className="fin-cancel">
            {r.canceladas.map((x, i) => (
              <span key={i} className="fin-cancel-pill">{x.name}</span>
            ))}
          </div>
          <p className="fin-hint">Si alguna de estas reaparece en el banco, es un cargo no deseado.</p>
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
