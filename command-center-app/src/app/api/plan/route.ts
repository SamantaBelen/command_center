import { NextResponse } from "next/server";
import { getPlannedTasks, getWeekTasks, getWeekHabits, getHoursHabits, todayET } from "@/lib/notion";
import { weekBounds } from "@/lib/planning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeTz(tz: string | null): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const today = todayET(safeTz(url.searchParams.get("tz")));
    const which = url.searchParams.get("week") === "next" ? "next" : "this";
    const offset = which === "next" ? 7 : 0;

    // base date = today shifted by the week offset
    const [y, m, d] = today.split("-").map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + offset);
    const baseISO = `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;

    const { start, end, days } = weekBounds(baseISO);
    const bucket = which === "next" ? "Próxima semana" : "Esta semana";

    const [weekTasks, planned, weekHabits, hoursHabits] = await Promise.all([
      getWeekTasks(start, end),
      getPlannedTasks(),
      getWeekHabits(start, end),
      getHoursHabits(start, end),
    ]);
    const pool = planned.filter((t) => t.plan === bucket);

    return NextResponse.json({
      today,
      which,
      bucket,
      weekStart: start,
      weekEnd: end,
      weekDays: days,
      week: weekTasks,
      pool,
      weekHabits,
      hoursHabits,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
