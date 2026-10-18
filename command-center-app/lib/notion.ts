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

// Tasks due today or overdue, not Done / Cancel.
export async function getTodayTasks(): Promise<Task[]> {
  const today = todayET();
  const res = await notion.databases.query({
    database_id: TASKS_DB,
    filter: {
      and: [
        { property: "Date", date: { on_or_before: today } },
        { property: "Status", status: { does_not_equal: "Done" } },
        { property: "Status", status: { does_not_equal: "Cancel" } },
      ],
    },
    page_size: 100,
  });

  const tasks = res.results.map((page: any) => {
    const props = page.properties ?? {};
    return {
      id: page.id,
      title: plainTitle(props["Tasks"]) || "(sin título)",
      status: props["Status"]?.status?.name ?? "",
      priority: props["Priority"]?.select?.name ?? null,
      type: firstMultiSelect(props["Task Type"]),
      date: props["Date"]?.date?.start ?? null,
    };
  });

  // Earliest first; undated last.
  tasks.sort((a, b) => {
    const ad = a.date ?? "9999";
    const bd = b.date ?? "9999";
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });

  return tasks;
}

// Check-ins whose current period contains today: Period start <= today <= Period end.
export async function getTodayHabits(): Promise<Habit[]> {
  const today = todayET();
  const res = await notion.databases.query({
    database_id: CHECKINS_DB,
    filter: {
      and: [
        { property: "Period start", date: { on_or_before: today } },
        { property: "Period end", date: { on_or_after: today } },
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

export async function setTaskStatus(id: string, status: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: { Status: { status: { name: status } } },
  });
}

export async function createTask(title: string): Promise<Task> {
  const today = todayET();
  const page: any = await notion.pages.create({
    parent: { database_id: TASKS_DB },
    properties: {
      Tasks: { title: [{ text: { content: title } }] },
      Status: { status: { name: "Not started" } },
      Date: { date: { start: today } },
    },
  });
  return {
    id: page.id,
    title,
    status: "Not started",
    priority: null,
    type: null,
    date: today,
  };
}

export async function toggleCheckin(id: string, done: boolean): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: { Done: { checkbox: done } },
  });
}
