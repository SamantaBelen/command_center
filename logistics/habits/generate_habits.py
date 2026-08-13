#!/usr/bin/env python3
"""
Habit check-in generator for Notion (quota model, idempotent).

For each active habit, ensures the current period has exactly `Target`
check-in rows. Creates `Target - existing` rows per run, so every run is
safe to repeat: a crash, retry, or missed day self-heals on the next run.

Runs all four cadences every day. The Period key makes off-day cadences
(Weekly/Monthly/Yearly) no-ops except the first run of each period.

Requires env var: NOTION_TOKEN  (scoped internal integration token,
shared with BOTH databases below).
"""

import os
import sys
import time
import datetime
from zoneinfo import ZoneInfo

import requests

# --- Config -----------------------------------------------------------------
NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
if not NOTION_TOKEN:
    sys.exit("ERROR: NOTION_TOKEN environment variable is not set.")

# "Today" is always evaluated in Eastern time, not the sandbox's UTC clock,
# so period keys and bounds match Miami's calendar day regardless of when
# (or in what timezone) the routine fires. America/New_York tracks EST/EDT.
EASTERN = ZoneInfo("America/New_York")

HABITS_DB = "1265804c0ee44dfeb9532b677cba03da"       # Habits
CHECKINS_DB = "25c3317dc9c7430a885c0aa6b009f1f1"     # Habits Check-ins

NOTION_VERSION = "2022-06-28"
BASE = "https://api.notion.com/v1"
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}

CADENCES = ["Daily", "Weekly", "Monthly", "Yearly"]
THROTTLE_SECONDS = 0.34   # ~3 requests/sec, Notion's documented ceiling
MAX_RETRIES = 6

session = requests.Session()


# --- HTTP with retry/backoff/throttle ---------------------------------------
def api(method, path, **kwargs):
    url = f"{BASE}{path}"
    for attempt in range(MAX_RETRIES):
        resp = session.request(method, url, headers=HEADERS, timeout=30, **kwargs)

        if resp.status_code == 429:  # rate limited -> honor Retry-After
            wait = float(resp.headers.get("Retry-After", "1"))
            time.sleep(wait)
            continue
        if resp.status_code >= 500:  # transient server error -> backoff
            time.sleep(2 ** attempt)
            continue
        if resp.status_code >= 400:  # real error -> fail loud
            raise RuntimeError(f"{method} {path} -> {resp.status_code}: {resp.text}")

        time.sleep(THROTTLE_SECONDS)
        return resp.json()

    raise RuntimeError(f"{method} {path} failed after {MAX_RETRIES} retries")


# --- Period keys ------------------------------------------------------------
def period_key(cadence, today):
    if cadence == "Daily":
        return today.isoformat()                       # 2026-08-12
    if cadence == "Weekly":
        y, w, _ = today.isocalendar()
        return f"{y}-W{w:02d}"                          # 2026-W33
    if cadence == "Monthly":
        return f"{today.year}-{today.month:02d}"        # 2026-08
    if cadence == "Yearly":
        return str(today.year)                          # 2026
    raise ValueError(f"Unknown cadence: {cadence}")


def period_bounds(cadence, today):
    """Return (start_date, end_date) for the period containing `today`.
    Written to each check-in so a view can filter with a self-updating
    'start <= today <= end' rule across every cadence."""
    if cadence == "Daily":
        return today, today
    if cadence == "Weekly":
        monday = today - datetime.timedelta(days=today.weekday())
        return monday, monday + datetime.timedelta(days=6)
    if cadence == "Monthly":
        first = today.replace(day=1)
        if today.month == 12:
            nxt = first.replace(year=today.year + 1, month=1)
        else:
            nxt = first.replace(month=today.month + 1)
        return first, nxt - datetime.timedelta(days=1)
    if cadence == "Yearly":
        return datetime.date(today.year, 1, 1), datetime.date(today.year, 12, 31)
    raise ValueError(f"Unknown cadence: {cadence}")


# --- Notion queries ---------------------------------------------------------
def query_all(db_id, filter_):
    results, cursor = [], None
    while True:
        body = {"filter": filter_, "page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        data = api("POST", f"/databases/{db_id}/query", json=body)
        results.extend(data["results"])
        if not data.get("has_more"):
            return results
        cursor = data["next_cursor"]


def active_habits(cadence):
    filt = {"and": [
        {"property": "Active", "checkbox": {"equals": True}},
        {"property": "Cadence", "select": {"equals": cadence}},
    ]}
    return query_all(HABITS_DB, filt)


def existing_count(habit_id, key):
    filt = {"and": [
        {"property": "Item", "relation": {"contains": habit_id}},
        {"property": "Period", "rich_text": {"equals": key}},
    ]}
    return len(query_all(CHECKINS_DB, filt))


# --- Habit property readers -------------------------------------------------
def habit_name(habit):
    title = habit["properties"]["Name"]["title"]
    return title[0]["plain_text"] if title else "(untitled)"


def habit_target(habit):
    n = habit["properties"].get("Target", {}).get("number")
    return int(n) if n else 1   # unset target defaults to 1


def habit_order(habit):
    return habit["properties"].get("Order", {}).get("number")


# --- Create a check-in ------------------------------------------------------
def create_checkin(habit, cadence, key, start, end):
    props = {
        "Log": {"title": [{"text": {"content": habit_name(habit)}}]},
        "Item": {"relation": [{"id": habit["id"]}]},
        "Period": {"rich_text": [{"text": {"content": key}}]},
        "Period start": {"date": {"start": start.isoformat()}},
        "Period end": {"date": {"start": end.isoformat()}},
        "Cadence": {"select": {"name": cadence}},
        "Done": {"checkbox": False},
        # Date intentionally left empty -> set it when Done is checked,
        # so the "Last done" rollup stays truthful.
    }
    order = habit_order(habit)
    if order is not None:
        props["Order"] = {"number": order}  # copied so views can sort by it
    api("POST", "/pages",
        json={"parent": {"database_id": CHECKINS_DB}, "properties": props})


# --- Main -------------------------------------------------------------------
def main():
    today = datetime.datetime.now(EASTERN).date()
    created_total = 0

    for cadence in CADENCES:
        key = period_key(cadence, today)
        start, end = period_bounds(cadence, today)
        for habit in active_habits(cadence):
            name = habit_name(habit)
            target = habit_target(habit)
            have = existing_count(habit["id"], key)
            need = max(0, target - have)

            for _ in range(need):
                create_checkin(habit, cadence, key, start, end)
                created_total += 1

            print(f"[{cadence} {key}] {name}: target={target} had={have} created={need}")

    print(f"Done. Created {created_total} check-in(s) as of {today.isoformat()}.")


if __name__ == "__main__":
    main()
