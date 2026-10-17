import { NextResponse } from "next/server";
import { getTodayTasks, getTodayHabits, todayET } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [tasks, habits] = await Promise.all([
      getTodayTasks(),
      getTodayHabits(),
    ]);
    return NextResponse.json({ today: todayET(), tasks, habits });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
