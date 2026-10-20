// Pure planning/scoring logic — no Notion or React imports, so it can be used
// from both server and client code and unit-tested in isolation.

export type ScoreInput = {
  importance: string | null;
  impact: number | null;
  effort: number | null;
};

// Suggested priority from Importancia + Impacto vs Esfuerzo.
// Returns null until all three inputs are filled.
export function suggestPriority(t: ScoreInput): "High" | "Medium" | "Low" | null {
  const { importance: imp, impact, effort } = t;
  if (imp == null || impact == null || effort == null) return null;
  // Alta
  if (imp === "Urgent" || imp === "Need") return "High";
  if (impact >= 4 && effort <= 2) return "High";
  // Baja
  if (imp === "Want") return "Low";
  if (impact <= 2) return "Low";
  if (effort >= 4 && impact <= 3) return "Low";
  return "Medium";
}

// Mon–Sun ISO bounds for the week containing the given day (YYYY-MM-DD).
export function weekBounds(todayISO: string): {
  start: string;
  end: string;
  days: string[];
} {
  const [y, m, d] = todayISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const toMonday = (base.getUTCDay() + 6) % 7;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - toMonday);
  const iso = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
      dt.getUTCDate()
    ).padStart(2, "0")}`;
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const c = new Date(monday);
    c.setUTCDate(monday.getUTCDate() + i);
    days.push(iso(c));
  }
  return { start: days[0], end: days[6], days };
}
