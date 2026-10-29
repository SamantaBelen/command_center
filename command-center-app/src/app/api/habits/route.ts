import { NextResponse } from "next/server";
import { getAllHabits, setHabitActive, createHabit } from "@/lib/notion";

const CADENCES = ["Daily", "Weekly", "Monthly", "Bimonthly", "Yearly"];
const TIMES_OF_DAY = ["morning", "afternoon", "night"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const habits = await getAllHabits();
    return NextResponse.json({ habits });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Create a new habit.
    if (typeof body?.name === "string" && body.name.trim()) {
      const cadence = CADENCES.includes(body?.cadence) ? body.cadence : "Daily";
      const timeOfDay = TIMES_OF_DAY.includes(body?.timeOfDay) ? body.timeOfDay : null;
      const target =
        typeof body?.target === "number" && body.target > 0 ? Math.round(body.target) : 1;
      const estMin =
        typeof body?.estMin === "number" && body.estMin > 0 ? Math.round(body.estMin) : null;
      const order = typeof body?.order === "number" ? body.order : null;
      const habit = await createHabit(body.name.trim(), {
        cadence,
        target,
        timeOfDay,
        estMin,
        order,
      });
      return NextResponse.json({ ok: true, habit });
    }

    // Toggle a habit's Active state.
    if (typeof body?.id === "string" && typeof body?.active === "boolean") {
      await setHabitActive(body.id, body.active);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
