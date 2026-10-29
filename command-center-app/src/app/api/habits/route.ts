import { NextResponse } from "next/server";
import { getAllHabits } from "@/lib/notion";

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
