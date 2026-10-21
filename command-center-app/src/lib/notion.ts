import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const TASKS_DB = process.env.NOTION_TASKS_DB ?? "3872cd384e9780dea0d0e780b94cfb40";
const CHECKINS_DB = process.env.NOTION_CHECKINS_DB ?? "25c3317dc9c7430a885c0aa6b009f1f1";

// "Hoy" in America/New_York (Eastern), regardless of the server's UTC clock.
export function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  type: string | null;
  date: string | null; // may be "YYYY-MM-DD" or a full ISO timestamp
  plan: string | null; // "Planeación" bucket: Agendado / Esta semana / Próxima semana / Eventualmente
  estMin: number | null; // Estimated Time (min)
  importance: string | null; // Urgent / Need / Required / Schedule / Want
  impact: number | null; // 0–5
  effort: number | null; // 0–5
};

export type Habit = {
  id: string;
  title: string;
  done: boolean;
  cadence: string | null;
  order: number | null;
};

function plainTitle(prop: any): string {
  const arr = prop?.title ?? prop?.rich_text ?? [];
  return arr.map((t: any) => t?.plain_text ?? "").join("").trim();
}

function firstMultiSelect(prop: any): string | null {
  const arr = prop?.multi_select;
  if (Array.isArray(arr) && arr.length) return arr[0]?.name ?? null;
  return null;
}

function mapTaskPage(page: any): Task {
  const props = page.properties ?? {};
  return {
    id: page.id,
    title: plainTitle(props["Tasks"]) || "(sin título)",
    status: props["Status"]?.status?.name ?? "",
    priority: props["Priority"]?.select?.name ?? null,
    type: firstMultiSelect(props["Task Type"]),
    date: props["Date"]?.date?.start ?? null,
    plan: props["Planeación"]?.select?.name ?? null,
    estMin: props["Estimated Time (min)"]?.number ?? null,
    importance: props["Importance"]?.select?.name ?? null,
    impact: props["Impact"]?.number ?? null,
    effort: props["Effort"]?.number ?? null,
  };
}

// Dated, not-done tasks whose Date falls within [startISO, endISO].
export async function getWeekTasks(startISO: string, endISO: string): Promise<Task[]> {
  const res = await notion.databases.query({
    database_id: TASKS_DB,
    filter: {
      and: [
        { property: "Date", date: { on_or_after: startISO } },
        { property: "Date", date: { on_or_before: endISO } },
        { property: "Status", status: { does_not_equal: "Done" } },
        { property: "Status", status: { does_not_equal: "Cancel" } },
      ],
    },
    page_size: 100,
  });
  return res.results.map(mapTaskPage);
}

// Tasks for a given day (not Cancel). Tasks dated that day are shown even when
// Done, so completed tasks stay visible (marked done). For today we also bubble
// up overdue tasks that are still pending (Date before today, not Done).
export async function getTasks(dateISO: string, includeOverdue: boolean): Promise<Task[]> {
  // Tasks scheduled on this exact day (any status except Cancel → includes Done).
  const sameDay = {
    and: [
      { property: "Date", date: { equals: dateISO } },
      { property: "Status", status: { does_not_equal: "Cancel" } },
    ],
  };
  const filter = includeOverdue
    ? {
        or: [
          sameDay,
          {
            and: [
              { property: "Date", date: { before: dateISO } },
              { property: "Status", status: { does_not_equal: "Done" } },
              { property: "Status", status: { does_not_equal: "Cancel" } },
            ],
          },
        ],
      }
    : sameDay;

  const res = await notion.databases.query({
    database_id: TASKS_DB,
    filter,
    page_size: 100,
  });

  const tasks = res.results.map(mapTaskPage);

  // Pending first, completed last; within each, earliest date first.
  tasks.sort((a, b) => {
    const ad = a.status === "Done" ? 1 : 0;
    const bd = b.status === "Done" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    const ax = a.date ?? "9999";
    const bx = b.date ?? "9999";
    return ax < bx ? -1 : ax > bx ? 1 : 0;
  });

  return tasks;
}

// Check-ins whose period contains the given day: Period start <= day <= Period end.
export async function getHabits(dateISO: string): Promise<Habit[]> {
  const res = await notion.databases.query({
    database_id: CHECKINS_DB,
    filter: {
      and: [
        { property: "Period start", date: { on_or_before: dateISO } },
        { property: "Period end", date: { on_or_after: dateISO } },
      ],
    },
    page_size: 200,
  });

  const habits = res.results.map((page: any) => {
    const props = page.properties ?? {};
    return {
      id: page.id,
      title: plainTitle(props["Log"]) || "(sin título)",
      done: props["Done"]?.checkbox ?? false,
      cadence: props["Cadence"]?.select?.name ?? null,
      order: props["Order"]?.number ?? null,
    };
  });

  habits.sort((a, b) => {
    const ao = a.order ?? 9999;
    const bo = b.order ?? 9999;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title);
  });

  return habits;
}

export type TaskDetailField = { label: string; value: string };
export type TaskDetail = {
  id: string;
  url: string | null;
  title: string;
  lastEdited: string | null;
  fields: TaskDetailField[];
};

function formatDate(prop: any): string {
  const start: string | undefined = prop?.date?.start;
  const end: string | undefined = prop?.date?.end;
  if (!start) return "";
  const fmt = (s: string) => {
    const hasTime = s.length > 10 && s.includes("T");
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
      timeZone: "America/New_York",
    }).format(new Date(s));
  };
  return end ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}

function formatValue(p: any): string {
  switch (p?.type) {
    case "title":
    case "rich_text":
      return (p[p.type] ?? []).map((t: any) => t?.plain_text ?? "").join("").trim();
    case "select":
      return p.select?.name ?? "";
    case "status":
      return p.status?.name ?? "";
    case "multi_select":
      return (p.multi_select ?? []).map((s: any) => s.name).join(", ");
    case "date":
      return formatDate(p);
    case "number":
      return p.number === null || p.number === undefined ? "" : String(p.number);
    case "checkbox":
      return p.checkbox ? "Sí" : "No";
    case "url":
      return p.url ?? "";
    case "email":
      return p.email ?? "";
    case "phone_number":
      return p.phone_number ?? "";
    case "people":
      return (p.people ?? []).map((u: any) => u?.name ?? "Alguien").join(", ");
    case "relation": {
      const n = (p.relation ?? []).length;
      return n ? `${n} vinculada${n > 1 ? "s" : ""}` : "";
    }
    case "files":
      return (p.files ?? []).length ? `${p.files.length} archivo(s)` : "";
    case "created_time":
      return formatDate({ date: { start: p.created_time } });
    case "last_edited_time":
      return formatDate({ date: { start: p.last_edited_time } });
    case "formula": {
      const f = p.formula;
      if (!f) return "";
      if (f.type === "string") return f.string ?? "";
      if (f.type === "number") return f.number === null ? "" : String(f.number);
      if (f.type === "boolean") return f.boolean ? "Sí" : "No";
      if (f.type === "date") return formatDate(f);
      return "";
    }
    case "rollup": {
      const r = p.rollup;
      if (!r) return "";
      if (r.type === "number") return r.number === null ? "" : String(r.number);
      if (r.type === "date") return formatDate(r);
      if (r.type === "array") return `${(r.array ?? []).length} elemento(s)`;
      return "";
    }
    default:
      return "";
  }
}

// Preferred ordering for the detail view; everything else follows alphabetically.
const FIELD_ORDER = [
  "Status",
  "Priority",
  "Date",
  "Importance",
  "Task Type",
  "Estimated Time (min)",
];

export async function getTaskDetail(id: string): Promise<TaskDetail> {
  const page: any = await notion.pages.retrieve({ page_id: id });
  const props = page.properties ?? {};

  let title = "";
  const fields: TaskDetailField[] = [];
  for (const [label, prop] of Object.entries<any>(props)) {
    if (prop?.type === "title") {
      title = formatValue(prop);
      continue;
    }
    const value = formatValue(prop);
    if (value) fields.push({ label, value });
  }

  fields.sort((a, b) => {
    const ai = FIELD_ORDER.indexOf(a.label);
    const bi = FIELD_ORDER.indexOf(b.label);
    const aa = ai === -1 ? 999 : ai;
    const bb = bi === -1 ? 999 : bi;
    if (aa !== bb) return aa - bb;
    return a.label.localeCompare(b.label);
  });

  return {
    id: page.id,
    url: page.url ?? null,
    title: title || "(sin título)",
    lastEdited: page.last_edited_time ?? null,
    fields,
  };
}

export async function setTaskStatus(id: string, status: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: { Status: { status: { name: status } } },
  });
}

// Un-scheduled tasks (no Date), grouped later by their "Planeación" bucket.
export async function getPlannedTasks(): Promise<Task[]> {
  const res = await notion.databases.query({
    database_id: TASKS_DB,
    filter: {
      and: [
        { property: "Date", date: { is_empty: true } },
        { property: "Status", status: { does_not_equal: "Done" } },
        { property: "Status", status: { does_not_equal: "Cancel" } },
      ],
    },
    page_size: 100,
  });

  return res.results.map(mapTaskPage);
}

type CreateOpts = { date?: string | null; plan?: string | null };

export async function createTask(title: string, opts: CreateOpts = {}): Promise<Task> {
  const properties: any = {
    Tasks: { title: [{ text: { content: title } }] },
    Status: { status: { name: "Not started" } },
  };
  // Date: explicit date, or default to today unless we're creating into a bucket.
  let date: string | null;
  if (opts.date === null) {
    date = null;
  } else if (typeof opts.date === "string") {
    date = opts.date;
  } else if (opts.plan && opts.plan !== "Agendado") {
    date = null; // bucketed task, no date
  } else {
    date = todayET();
  }
  if (date) properties.Date = { date: { start: date } };
  if (opts.plan) properties["Planeación"] = { select: { name: opts.plan } };

  const page: any = await notion.pages.create({
    parent: { database_id: TASKS_DB },
    properties,
  });
  return {
    id: page.id,
    title,
    status: "Not started",
    priority: null,
    type: null,
    date,
    plan: opts.plan ?? null,
    estMin: null,
    importance: null,
    impact: null,
    effort: null,
  };
}

// Set any of the scoring/analysis fields. Omitted keys are left unchanged;
// a key set to null clears that property.
export type TaskFields = {
  priority?: string | null;
  importance?: string | null;
  estMin?: number | null;
  impact?: number | null;
  effort?: number | null;
};
export async function setTaskFields(id: string, fields: TaskFields): Promise<void> {
  const properties: any = {};
  if ("priority" in fields)
    properties.Priority = fields.priority ? { select: { name: fields.priority } } : { select: null };
  if ("importance" in fields)
    properties.Importance = fields.importance ? { select: { name: fields.importance } } : { select: null };
  if ("estMin" in fields)
    properties["Estimated Time (min)"] = { number: fields.estMin ?? null };
  if ("impact" in fields) properties.Impact = { number: fields.impact ?? null };
  if ("effort" in fields) properties.Effort = { number: fields.effort ?? null };
  await notion.pages.update({ page_id: id, properties });
}

// Set the planning bucket. dateArg: null clears the Date, a string sets it,
// undefined leaves the Date untouched.
export async function setTaskPlan(
  id: string,
  plan: string,
  dateArg: string | null | undefined
): Promise<void> {
  const properties: any = { "Planeación": { select: { name: plan } } };
  if (dateArg === null) properties.Date = { date: null };
  else if (typeof dateArg === "string") properties.Date = { date: { start: dateArg } };
  await notion.pages.update({ page_id: id, properties });
}

// Moves the task to Notion's trash (recoverable ~30 days), not a hard delete.
export async function deleteTask(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}

export async function toggleCheckin(id: string, done: boolean): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: { Done: { checkbox: done } },
  });
}
