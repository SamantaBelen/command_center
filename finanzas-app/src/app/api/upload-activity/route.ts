import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The routine's API-trigger "fire" endpoint. The trigger id is not secret; the
// token (ROUTINE_TOKEN) is. Override the whole URL with ROUTINE_FIRE_URL if the
// routine is recreated.
const FIRE_URL =
  process.env.ROUTINE_FIRE_URL ??
  "https://api.anthropic.com/v1/claude_code/routines/trig_01HbQ1UyWJcK3iFDBdJ6YkPE/fire";
const TOKEN = process.env.ROUTINE_TOKEN;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const csv = typeof body?.csv === "string" ? body.csv.trim() : "";
    if (!csv) {
      return NextResponse.json({ error: "CSV vacío" }, { status: 400 });
    }
    if (csv.length > 1_500_000) {
      return NextResponse.json({ error: "CSV demasiado grande" }, { status: 413 });
    }
    if (!TOKEN) {
      return NextResponse.json({ error: "ROUTINE_TOKEN no configurado" }, { status: 500 });
    }

    const text = `Aquí está el CSV de actividad del mes de mi cuenta de Wells Fargo. Procésalo según tus instrucciones para marcar las recurrentes cobradas:\n\n${csv}`;

    const res = await fetch(FIRE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return NextResponse.json({ error: `Trigger ${res.status}: ${detail}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "error" }, { status: 500 });
  }
}
