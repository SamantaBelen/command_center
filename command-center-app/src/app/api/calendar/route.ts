import { NextResponse } from "next/server";
import {
  getCalendarEvents,
  gcalConfigured,
  createEvent,
  updateEvent,
  deleteEvent,
  type EventInput,
} from "@/lib/gcal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseInput(body: any): EventInput | null {
  if (typeof body?.title !== "string" || !body.title.trim()) return null;
  if (!DATE_RE.test(body?.dayISO ?? "")) return null;
  const allDay = !!body.allDay;
  return {
    title: body.title.trim(),
    dayISO: body.dayISO,
    allDay,
    startTime: !allDay && TIME_RE.test(body?.startTime ?? "") ? body.startTime : null,
    endTime: !allDay && TIME_RE.test(body?.endTime ?? "") ? body.endTime : null,
  };
}

export async function GET(req: Request) {
  try {
    if (!gcalConfigured()) {
      return NextResponse.json({ connected: false, events: [] });
    }
    const url = new URL(req.url);
    const start = url.searchParams.get("start") ?? "";
    const end = url.searchParams.get("end") ?? start;
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
      return NextResponse.json({ error: "start/end inválidos" }, { status: 400 });
    }
    const events = await getCalendarEvents(start, end);
    return NextResponse.json({ connected: true, events });
  } catch (e: any) {
    return NextResponse.json(
      { connected: true, events: [], error: e?.message ?? "calendar error" },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!gcalConfigured()) {
      return NextResponse.json({ error: "Google Calendar no está conectado" }, { status: 400 });
    }
    const body = await req.json();
    const op = body?.op ?? "create";

    if (op === "delete") {
      if (typeof body?.id !== "string" || !body.id) {
        return NextResponse.json({ error: "id requerido" }, { status: 400 });
      }
      await deleteEvent(body.id);
      return NextResponse.json({ ok: true });
    }

    const input = parseInput(body);
    if (!input) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

    if (op === "update") {
      if (typeof body?.id !== "string" || !body.id) {
        return NextResponse.json({ error: "id requerido" }, { status: 400 });
      }
      const event = await updateEvent(body.id, input);
      return NextResponse.json({ ok: true, event });
    }

    const event = await createEvent(input);
    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "calendar error" }, { status: 500 });
  }
}
