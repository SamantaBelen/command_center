import { NextResponse } from "next/server";
import {
  getTripEvents,
  createTripEvent,
  deleteTripEvent,
  uploadNotionFile,
} from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS = ["Vuelo", "Hotel", "Comida", "Actividad", "Evento", "Transporte", "Otro"];

export async function GET(req: Request) {
  try {
    const trip = new URL(req.url).searchParams.get("trip");
    if (!trip) return NextResponse.json({ error: "trip requerido" }, { status: 400 });
    const events = await getTripEvents(trip);
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Notion error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const op = String(form.get("op") ?? "create");

    if (op === "delete") {
      const id = String(form.get("id") ?? "");
      if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
      await deleteTripEvent(id);
      return NextResponse.json({ ok: true });
    }

    const trip = String(form.get("trip") ?? "");
    const title = String(form.get("title") ?? "").trim();
    if (!trip || !title) {
      return NextResponse.json({ error: "trip y título requeridos" }, { status: 400 });
    }

    // Optional outfit photo.
    let photoUploadId: string | undefined;
    let photoName: string | undefined;
    const file = form.get("photo");
    if (file && typeof file !== "string") {
      const f = file as File;
      const buf = Buffer.from(await f.arrayBuffer());
      if (buf.length > 0) {
        if (buf.length > 4.4 * 1024 * 1024) {
          return NextResponse.json({ error: "Foto muy grande (máx ~4.4 MB)" }, { status: 413 });
        }
        const ct = (f.type || "image/jpeg").split(";")[0].trim();
        const mediaType = ct === "image/png" || ct === "image/webp" ? ct : "image/jpeg";
        const ext = mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
        photoName = `outfit-${Date.now()}.${ext}`;
        photoUploadId = await uploadNotionFile(buf, mediaType, photoName);
      }
    }

    const dateRaw = String(form.get("date") ?? "");
    const tipoRaw = String(form.get("tipo") ?? "");
    const ordenRaw = form.get("orden");
    const event = await createTripEvent(trip, {
      title,
      date: DATE_RE.test(dateRaw) ? dateRaw : null,
      hora: String(form.get("hora") ?? "").trim(),
      tipo: TIPOS.includes(tipoRaw) ? tipoRaw : null,
      lugar: String(form.get("lugar") ?? "").trim(),
      outfit: String(form.get("outfit") ?? "").trim(),
      notas: String(form.get("notas") ?? "").trim(),
      orden: ordenRaw != null && ordenRaw !== "" ? Number(ordenRaw) : null,
      photoUploadId,
      photoName,
    });
    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Notion error" }, { status: 500 });
  }
}
