import { NextResponse } from "next/server";
import {
  toggleCheckin,
  setCheckinPlanned,
  setCheckinReal,
  setCheckinEst,
  createHabitBlock,
  deleteCheckin,
} from "@/lib/notion";

export const runtime = "nodejs";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, done, planned, real, est } = body;

    // Create a new session block for an hours-habit on a day.
    if (body?.op === "block") {
      if (typeof body?.itemId !== "string" || !body.itemId) {
        return NextResponse.json({ error: "itemId requerido" }, { status: 400 });
      }
      if (!DATE_RE.test(body?.day ?? "")) {
        return NextResponse.json({ error: "día inválido" }, { status: 400 });
      }
      const block = await createHabitBlock(body.itemId, body.day);
      return NextResponse.json({ ok: true, block });
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    // Delete a session block.
    if (body?.op === "delete") {
      await deleteCheckin(id);
      return NextResponse.json({ ok: true });
    }
    // "est" present (number or null) sets this block's estimated minutes.
    if ("est" in body) {
      await setCheckinEst(id, typeof est === "number" ? est : null);
      return NextResponse.json({ ok: true });
    }
    // "real" present (number or null) sets the tracked minutes.
    if ("real" in body) {
      await setCheckinReal(id, typeof real === "number" ? real : null);
      return NextResponse.json({ ok: true });
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
