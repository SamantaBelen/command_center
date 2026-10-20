import { NextResponse } from "next/server";
import { getTasks, getHabits, todayET } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const today = todayET();
    const url = new URL(req.url);
    const param = url.searchParams.get("date");
    const date = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : today;
    const isToday = date === today;

    const [tasks, habits] = await Promise.all([
      getTasks(date, isToday),
      getHabits(date),
    ]);
    return NextResponse.json({ today, date, tasks, habits });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
