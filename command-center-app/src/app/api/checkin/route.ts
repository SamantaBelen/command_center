import { NextResponse } from "next/server";
import { toggleCheckin, setCheckinPlanned } from "@/lib/notion";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, done, planned } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    // "planned" present (string or null) sets/clears the planned time;
    // otherwise this is a Done toggle.
    if ("planned" in body) {
      await setCheckinPlanned(id, typeof planned === "string" ? planned : null);
      return NextResponse.json({ ok: true });
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
