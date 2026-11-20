import { NextResponse } from "next/server";
import { getTrips, createTrip, deleteTrip } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  try {
    const trips = await getTrips();
    return NextResponse.json({ trips });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Notion error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body?.op === "delete" && typeof body?.id === "string") {
      await deleteTrip(body.id);
      return NextResponse.json({ ok: true });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
    }
    const inicio = DATE_RE.test(body?.inicio ?? "") ? body.inicio : null;
    const fin = DATE_RE.test(body?.fin ?? "") ? body.fin : null;
    const trip = await createTrip({
      name,
      destino: typeof body?.destino === "string" ? body.destino.trim() : "",
      inicio,
      fin,
      notas: typeof body?.notas === "string" ? body.notas.trim() : "",
    });
    return NextResponse.json({ ok: true, trip });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Notion error" }, { status: 500 });
  }
}
