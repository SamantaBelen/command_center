import { NextResponse } from "next/server";
import { setTaskStatus, createTask, getTaskDetail, setTaskPlan, deleteTask, setTaskFields, setTaskTime } from "@/lib/notion";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    const detail = await getTaskDetail(id);
    return NextResponse.json(detail);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    await deleteTask(id);
    return NextResponse.json({ ok: true });
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

    // Create a new task.
    if (typeof body?.title === "string" && body.title.trim()) {
      const date =
        typeof body?.date === "string" && DATE_RE.test(body.date) ? body.date : undefined;
      const plan = typeof body?.plan === "string" ? body.plan : undefined;
      const task = await createTask(body.title.trim(), { date, plan });
      return NextResponse.json({ ok: true, task });
    }

    if (typeof body?.id === "string" && body.id) {
      // Set / clear a start time for the day.
      if ("startTime" in body && typeof body?.day === "string" && DATE_RE.test(body.day)) {
        const hhmm =
          typeof body.startTime === "string" && /^\d{2}:\d{2}$/.test(body.startTime)
            ? body.startTime
            : null;
        await setTaskTime(body.id, body.day, hhmm);
        return NextResponse.json({ ok: true });
      }
      // Set scoring/analysis fields.
      if (body?.fields && typeof body.fields === "object") {
        await setTaskFields(body.id, body.fields);
        return NextResponse.json({ ok: true });
      }
      // Change the planning bucket (optionally clearing or setting the date).
      if (typeof body?.plan === "string") {
        let dateArg: string | null | undefined;
        if (body.clearDate) dateArg = null;
        else if (typeof body.date === "string" && DATE_RE.test(body.date)) dateArg = body.date;
        await setTaskPlan(body.id, body.plan, dateArg);
        return NextResponse.json({ ok: true });
      }
      // Set an explicit status.
      if (typeof body?.status === "string") {
        const allowed = ["Not started", "In progress", "Waiting", "Done", "Cancel"];
        if (!allowed.includes(body.status)) {
          return NextResponse.json({ error: "estado inválido" }, { status: 400 });
        }
        await setTaskStatus(body.id, body.status);
        return NextResponse.json({ ok: true });
      }
      // Toggle done.
      const status = body?.done ? "Done" : "Not started";
      await setTaskStatus(body.id, status);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "id o title requerido" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Notion error" },
      { status: 500 }
    );
  }
}
