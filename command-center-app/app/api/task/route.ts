import { NextResponse } from "next/server";
import { setTaskStatus, createTask, getTaskDetail } from "@/lib/notion";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Create a new task.
    if (typeof body?.title === "string" && body.title.trim()) {
      const date =
        typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
          ? body.date
          : undefined;
      const task = await createTask(body.title.trim(), date);
      return NextResponse.json({ ok: true, task });
    }

    // Toggle status of an existing task.
    if (typeof body?.id === "string" && body.id) {
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
