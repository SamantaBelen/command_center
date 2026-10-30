import { NextResponse } from "next/server";
import { getCalendarEvents, gcalConfigured } from "@/lib/gcal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
