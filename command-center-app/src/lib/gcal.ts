import { etOffset } from "./planning";

// Google Calendar (read-only) via OAuth. Single-user: a refresh token obtained
// once (through /api/google/auth) is stored as an env var and used server-side.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

// calendar.events = read + create/update/delete events (not full calendar mgmt).
export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function hasOAuthClient(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}
export function gcalConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

export function authUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GCAL_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange an auth code for tokens (used once, to obtain the refresh token).
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ refresh_token?: string; access_token?: string; error?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error_description ?? JSON.stringify(json) };
  return json;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
      refresh_token: REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? "token refresh failed");
  return json.access_token as string;
}

export type CalEvent = {
  id: string;
  title: string;
  start: string; // ISO datetime, or "YYYY-MM-DD" for all-day
  end: string;
  allDay: boolean;
  htmlLink?: string;
};

function mapEvent(e: any): CalEvent {
  const allDay = !!e.start?.date;
  return {
    id: e.id,
    title: (e.summary ?? "(sin título)").trim(),
    start: allDay ? e.start.date : e.start.dateTime,
    end: allDay ? e.end.date : e.end.dateTime,
    allDay,
    htmlLink: e.htmlLink,
  };
}

const CAL_BASE = (id: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`;

// Build the Google event body from app-level fields.
export type EventInput = {
  title: string;
  dayISO: string; // YYYY-MM-DD
  allDay: boolean;
  startTime?: string | null; // HH:MM (timed)
  endTime?: string | null; // HH:MM (timed)
};
function toGoogleBody(ev: EventInput): any {
  const body: any = { summary: ev.title };
  if (ev.allDay) {
    const [y, m, d] = ev.dayISO.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nextISO = next.toISOString().slice(0, 10);
    body.start = { date: ev.dayISO };
    body.end = { date: nextISO };
  } else {
    const off = etOffset(ev.dayISO);
    const s = ev.startTime || "09:00";
    const e = ev.endTime || s;
    body.start = { dateTime: `${ev.dayISO}T${s}:00${off}`, timeZone: "America/New_York" };
    body.end = { dateTime: `${ev.dayISO}T${e}:00${off}`, timeZone: "America/New_York" };
  }
  return body;
}

// Events overlapping [startISO, endISO] (inclusive days), Eastern time.
export async function getCalendarEvents(
  startISO: string,
  endISO: string
): Promise<CalEvent[]> {
  if (!gcalConfigured()) return [];
  const token = await getAccessToken();
  const timeMin = `${startISO}T00:00:00${etOffset(startISO)}`;
  const timeMax = `${endISO}T23:59:59${etOffset(endISO)}`;
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
    `?singleEvents=true&orderBy=startTime&maxResults=250` +
    `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "calendar fetch failed");
  return (json.items ?? [])
    .filter((e: any) => e.status !== "cancelled")
    .map(mapEvent);
}

export async function createEvent(ev: EventInput): Promise<CalEvent> {
  const token = await getAccessToken();
  const res = await fetch(CAL_BASE(CALENDAR_ID), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(toGoogleBody(ev)),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "create failed");
  return mapEvent(json);
}

export async function updateEvent(id: string, ev: EventInput): Promise<CalEvent> {
  const token = await getAccessToken();
  const res = await fetch(`${CAL_BASE(CALENDAR_ID)}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(toGoogleBody(ev)),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "update failed");
  return mapEvent(json);
}

export async function deleteEvent(id: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${CAL_BASE(CALENDAR_ID)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 410 = already deleted; treat as success.
  if (!res.ok && res.status !== 410) {
    const txt = await res.text();
    throw new Error("delete failed: " + txt);
  }
}
