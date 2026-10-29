import { NextResponse } from "next/server";
import { getAllHabits, setHabitActive } from "@/lib/notion";

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
    if (typeof body?.id === "string" && typeof body?.active === "boolean") {
      await setHabitActive(body.id, body.active);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "id y active requeridos" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
