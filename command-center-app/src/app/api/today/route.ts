import { NextResponse } from "next/server";
import { getTasks, getHabits, getHoursHabits, todayET } from "@/lib/notion";
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
    const tz = safeTz(url.searchParams.get("tz"));
    const today = todayET(tz);
    const param = url.searchParams.get("date");
    const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : today;
    const isToday = date === today;

    const wb = weekBounds(date);
    const [tasks, habits, hoursHabits] = await Promise.all([
      getTasks(date, isToday),
      getHabits(date),
      getHoursHabits(wb.start, wb.end),
    ]);
    return NextResponse.json({ today, date, tasks, habits, hoursHabits });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
