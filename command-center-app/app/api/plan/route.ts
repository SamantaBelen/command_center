import { NextResponse } from "next/server";
import { getPlannedTasks, getWeekTasks, weekBounds, todayET } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = todayET();
    const { start, end, days } = weekBounds(today);
    const [week, planned] = await Promise.all([
      getWeekTasks(start, end),
      getPlannedTasks(),
    ]);
    const pool = planned.filter((t) => t.plan === "Esta semana");
    return NextResponse.json({
      today,
      weekStart: start,
      weekEnd: end,
      weekDays: days,
      week,
      pool,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
