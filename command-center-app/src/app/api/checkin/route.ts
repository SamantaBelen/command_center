import { NextResponse } from "next/server";
import { toggleCheckin } from "@/lib/notion";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { id, done } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    await toggleCheckin(id, Boolean(done));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
