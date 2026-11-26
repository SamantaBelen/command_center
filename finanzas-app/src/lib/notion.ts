import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const BUDGET_DB = process.env.NOTION_BUDGET_DB ?? "69c7b67130c34969a1a3ac0008ac1437";
const BALANCES_DB = process.env.NOTION_BALANCES_DB ?? "2dfcd460fcf645f2ba46e41252c9c554";
const RECURRENTES_DB = process.env.NOTION_RECURRENTES_DB ?? "e620040c92ab4a6480c84e82bcc0557e";
const DEBTS_DB = process.env.NOTION_DEBTS_DB ?? "f786f33e24e64f52b5345970ecf83de3";
const SAVINGS_DB = process.env.NOTION_SAVINGS_DB ?? "88ad297b1bb94844b162cf5ff8ec6899";

// ---- property readers -------------------------------------------------------
function txt(p: any): string {
  const a = p?.title ?? p?.rich_text ?? [];
  return Array.isArray(a) ? a.map((x: any) => x.plain_text).join("").trim() : "";
}
function num(p: any): number | null {
  if (!p) return null;
  if (p.type === "number") return p.number ?? null;
  if (p.type === "formula") return p.formula?.type === "number" ? p.formula.number ?? null : null;
  if (p.type === "rollup") return p.rollup?.type === "number" ? p.rollup.number ?? null : null;
  return null;
}
function fstr(p: any): string {
  if (p?.type === "formula") {
    const f = p.formula;
    if (f?.type === "string") return f.string ?? "";
    if (f?.type === "number") return f.number != null ? String(f.number) : "";
  }
  return "";
}
function sel(p: any): string | null {
  return p?.select?.name ?? null;
}
function dstart(p: any): string | null {
  return p?.date?.start ?? null;
}

async function queryAll(dbId: string, body: any = {}): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const r: any = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
      start_cursor: cursor,
      ...body,
    });
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

// ---- month helpers ----------------------------------------------------------
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}

// ---- types ------------------------------------------------------------------
export type BudgetRow = {
  category: string;
  planned: number;
  spent: number; // abs(Actual)
  remaining: number; // planned - spent
  pct: number; // 0..100+
};
export type BalanceRow = {
  name: string;
  real: number | null;
  calculado: number | null;
  diferencia: number | null;
  ok: boolean;
  statusRaw: string;
};
export type Recurrente = {
  name: string;
  estado: string;
  cadencia: string;
  monto: number | null;
  cuando: string;
  categoria: string | null;
};
export type Debt = {
  name: string;
  owed: number | null;
  paid: number | null;
  saldo: number | null;
  priority: string | null;
  status: string | null;
  target: string | null;
};
export type SavingsGoal = {
  name: string;
  target: number | null;
  current: number | null;
  pct: number;
  status: string | null;
  targetDate: string | null;
};
export type FinanceData = {
  budget: { month: string; rows: BudgetRow[]; planned: number; spent: number } | null;
  balances: { month: string; rows: BalanceRow[] } | null;
  recurrentes: {
    mensual: Recurrente[];
    anual: Recurrente[];
    canceladas: Recurrente[];
    totalMensual: number;
  };
  debts: Debt[];
  savings: SavingsGoal[];
};

// ---- fetchers ---------------------------------------------------------------
function ym(dateStr: string | null): string | null {
  return dateStr ? dateStr.slice(0, 7) : null;
}
function latestMonth(months: (string | null)[]): string | null {
  const valid = months.filter((m): m is string => !!m);
  return valid.length ? valid.sort().reverse()[0] : null;
}

async function getBudget(): Promise<FinanceData["budget"]> {
  const rows = await queryAll(BUDGET_DB);
  const month = latestMonth(rows.map((p) => ym(dstart(p.properties?.Month))));
  if (!month) return null;
  const inMonth = rows.filter((p) => ym(dstart(p.properties?.Month)) === month);
  const out: BudgetRow[] = inMonth
    .map((p) => {
      const pr = p.properties ?? {};
      const planned = num(pr.Planned) ?? 0;
      const spent = Math.abs(num(pr.Actual) ?? 0);
      return {
        category: sel(pr.Category) ?? txt(pr.Name) ?? "—",
        planned,
        spent,
        remaining: planned - spent,
        pct: planned > 0 ? Math.round((spent / planned) * 100) : spent > 0 ? 100 : 0,
      };
    })
    .filter((r) => r.planned > 0 || r.spent > 0)
    .sort((a, b) => b.spent - a.spent);
  const planned = out.reduce((s, r) => s + r.planned, 0);
  const spent = out.reduce((s, r) => s + r.spent, 0);
  return { month, rows: out, planned, spent };
}

async function getBalances(): Promise<FinanceData["balances"]> {
  const rows = await queryAll(BALANCES_DB);
  const month = latestMonth(rows.map((p) => ym(dstart(p.properties?.Month))));
  if (!month) return null;
  const inMonth = rows.filter((p) => ym(dstart(p.properties?.Month)) === month);
  const out: BalanceRow[] = inMonth.map((p) => {
    const pr = p.properties ?? {};
    const statusRaw = fstr(pr.Status);
    const diferencia = num(pr.Diferencia);
    return {
      name: txt(pr.Name).replace(/\s*[—-]\s*\w+\s*\d{4}\s*$/, ""),
      real: num(pr["Balance End (Real)"]),
      calculado: num(pr["Balance End (Calculado)"]),
      diferencia,
      ok: statusRaw.includes("✅") || (diferencia != null && Math.abs(diferencia) < 0.01),
      statusRaw,
    };
  });
  return { month, rows: out };
}

async function getRecurrentes(): Promise<FinanceData["recurrentes"]> {
  const rows = await queryAll(RECURRENTES_DB);
  const all: Recurrente[] = rows.map((p) => {
    const pr = p.properties ?? {};
    return {
      name: txt(pr.Name),
      estado: sel(pr.Estado) ?? "",
      cadencia: sel(pr.Cadencia) ?? "",
      monto: num(pr["Monto esperado"]),
      cuando: txt(pr["Cuándo"]),
      categoria: sel(pr["Categoría"]),
    };
  });
  const activas = all.filter((r) => r.estado === "Activa");
  const mensual = activas.filter((r) => r.cadencia === "Mensual").sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0));
  const anual = activas.filter((r) => r.cadencia !== "Mensual").sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0));
  const canceladas = all.filter((r) => r.estado === "Cancelada");
  const totalMensual = mensual.reduce((s, r) => s + (r.monto ?? 0), 0);
  return { mensual, anual, canceladas, totalMensual };
}

async function getDebts(): Promise<Debt[]> {
  const rows = await queryAll(DEBTS_DB);
  return rows
    .map((p) => {
      const pr = p.properties ?? {};
      return {
        name: txt(pr.Name),
        owed: num(pr["Amount Owed"]),
        paid: num(pr["Total Pagado"]),
        saldo: num(pr["Saldo Pendiente"]),
        priority: sel(pr.Priority),
        status: sel(pr.Status),
        target: dstart(pr["Target Date"]),
      };
    })
    .filter((d) => d.status !== "Pagada")
    .sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));
}

async function getSavings(): Promise<SavingsGoal[]> {
  const rows = await queryAll(SAVINGS_DB);
  return rows
    .map((p) => {
      const pr = p.properties ?? {};
      const target = num(pr["Target Amount"]);
      const current = num(pr["Current Amount"]);
      return {
        name: txt(pr.Name),
        target,
        current,
        pct: target && target > 0 ? Math.round(((current ?? 0) / target) * 100) : 0,
        status: sel(pr.Status),
        targetDate: dstart(pr["Target Date"]),
      };
    })
    .filter((g) => g.status !== "Completada")
    .sort((a, b) => b.pct - a.pct);
}

export async function getFinanceData(): Promise<FinanceData> {
  const [budget, balances, recurrentes, debts, savings] = await Promise.all([
    getBudget(),
    getBalances(),
    getRecurrentes(),
    getDebts(),
    getSavings(),
  ]);
  return { budget, balances, recurrentes, debts, savings };
}
