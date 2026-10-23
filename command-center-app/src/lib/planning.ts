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

// America/New_York UTC offset (e.g. "-04:00") for a given day (YYYY-MM-DD).
export function etOffset(dayISO: string): string {
  const d = new Date(`${dayISO}T12:00:00Z`);
  const name =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "shortOffset",
    })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const m = name.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  const h = m ? parseInt(m[1], 10) : -5;
  const mm = m && m[2] ? parseInt(m[2], 10) : 0;
  const sign = h < 0 ? "-" : "+";
  return `${sign}${String(Math.abs(h)).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Build an ISO datetime for HH:MM on a day, anchored to Eastern time.
export function buildETDateTime(dayISO: string, hhmm: string): string {
  return `${dayISO}T${hhmm}:00${etOffset(dayISO)}`;
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
