import { NextResponse } from "next/server";
import { setRecurrenteCobro } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.id !== "string" || !body.id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    await setRecurrenteCobro(body.id, Boolean(body.done));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Notion error" }, { status: 500 });
  }
}
