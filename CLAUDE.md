# CLAUDE.md — Command Center context

Personal automations repo, mirroring my Notion "Command Center" workspace.
This file is the handoff from the chat where the habits system was designed.

> **Setting this up?** Follow `SETUP.md` — a step-by-step task list (marks what
> Claude Code runs vs what needs Samanta).

## Current status

**Done**
- Notion schema for the habits system (see below) — fully built.
- Dry run: 16 check-ins created live and idempotency verified.
- `generate_habits.py` written, Eastern-time aware, idempotent, retry/throttle.
- Repo skeleton (this).
- Notion `Done → Date` automation — set up manually in Notion UI.

**Pending**
1. Create the "Hoy" view in Check-ins (blocked by an approval gate in chat — do it in Notion UI).
2. Finish the Notion internal connection + token (was mid-creation).
3. First commit + push (private repo).
4. Set up the Routine environment, then the Routine.
5. (Optional) Generate today's daily rows so the view isn't empty.

---

## Habits system (`logistics/habits/`)

Generates check-in rows in Notion on a quota model. Each run ensures the current
period has exactly `Target` rows per active habit. Creates `Target − existing`,
so re-running is always safe (self-healing).

### Notion IDs

| Base                | Database ID                        | Data source ID                         |
|---------------------|------------------------------------|----------------------------------------|
| Habits (definition) | `1265804c0ee44dfeb9532b677cba03da` | `47579003-652f-4ab6-bc2e-90c99101a03e` |
| Habits Check-ins    | `25c3317dc9c7430a885c0aa6b009f1f1` | `b10f1ee5-b995-418b-a44f-0a144708a5cc` |

REST API version: `2022-06-28`. Auth: `NOTION_TOKEN` (internal connection
"Habits Generator"). Rate limit ~3 req/s.

### Schema (final)

**Habits:** `Name` (title), `Active` (checkbox), `Cadence`
(Daily/Weekly/Monthly/Yearly), `Target` (number), `Order` (number),
`Check-ins` (relation), `Project` (relation), rollups `Last done` / `Times done`.
*(`Type` was removed — it held the same value on every row.)*

**Check-ins:** `Log` (title), `Item` (relation→Habits), `Period` (text),
`Period start` (date), `Period end` (date), `Cadence` (select), `Order` (number),
`Date` (date — left empty on purpose), `Done` (checkbox).
*(`Type` removed here too.)*

### Period model

Runs all four cadences every day; dedup by `Period` makes off-period cadences
no-ops. `Period start`/`Period end` exist so a view can filter with a
self-updating "start ≤ today ≤ end" rule.

| Cadence | Key          | start / end            |
|---------|--------------|------------------------|
| Daily   | `YYYY-MM-DD` | today / today          |
| Weekly  | `YYYY-Www`   | Monday / Sunday (ISO)  |
| Monthly | `YYYY-MM`    | 1st / last of month    |
| Yearly  | `YYYY`       | Jan 1 / Dec 31         |

### Idempotency

`create = max(0, Target − count(check-ins with same Item AND Period))`.
Safe to repeat; if Monday is missed, Tuesday backfills the week (same weekly key).

### Timezone

"Today" is computed in `America/New_York` (Eastern), NOT the sandbox's UTC clock.
Handles EST/EDT automatically. `tzdata` is in requirements as insurance.

### Current habit data

15 daily habits (`Target 1`), in `Order`:
1 Tomar pastilla · 2 Sacar Coffee mañana · 3 Momento de calma · 4 Alistarse ·
5 Protector solar · 6 Arreglar cuarto · 7 Desayuno · 8 Arreglar cocina ·
9 Planear el día · 10 Responder emails y mensajes · 11 Almuerzo ·
12 Comida Coffee · 13 Sacar Coffee en la noche · 14 Arreglar cocina noche ·
15 Night Routine.

Plus **Gimnasio**: Weekly, `Target 3`.
(`Momento de calma` and `Planear el día` are new — added after the dry run, so
they have no check-in yet until the next generation.)

### Data-state note

The dry run created rows dated `2026-08-12`. The daily ones correctly age out of
the "current" filter once the date advances; the weekly Gimnasio rows
(week 33, 08-10 → 08-16) stay current through that week. Today's daily rows are
created by the next generation run.

---

## Notion-side config (lives outside the script)

- **"Hoy" view (Check-ins):** filter `Period start` on-or-before Today AND
  `Period end` on-or-after Today; sort by `Order` ascending. Optionally group by
  `Cadence`. *(Still needs creating — was blocked by an approval gate in chat.)*
- **`Done → Date` automation:** native Notion rule — when `Done` is checked, set
  `Date` = today. Keeps the `Last done` rollup truthful. *(Done.)*

---

## Routine deployment

Order matters — **set up the environment BEFORE creating the Routine** (you can't
edit the environment from the Routine form; you'd have to start over).

1. **Notion connection:** Developer tools → Connections → New connection →
   **Access token** (internal), name "Habits Generator". Capabilities: Read,
   Insert, Update. Copy the `ntn_...` token (shown once). Grant it access to BOTH
   databases (Content access tab, or share each DB in Notion via ••• → Connections).
2. **Commit & push** this repo (private).
3. **Environment** (claude.ai/code → environments):
   - Network: allowlist `api.notion.com`.
   - Env var: `NOTION_TOKEN` = the token.
   - Setup script: `pip install requests tzdata`.
   - Do NOT add the Notion connector (the script uses REST directly).
4. **Routine** (`/schedule` or claude.ai/code/routines): this repo, the env above,
   trigger **daily ~4:00 AM ET**.
   Prompt: `Run python logistics/habits/generate_habits.py and report the summary
   line it prints. Do not modify anything else.`

---

## Gotchas / troubleshooting

- **403 `host_not_allowed`** → `api.notion.com` not on the environment allowlist.
- **404 `object_not_found`** → the connection lacks access to one of the DBs
  (not a token problem).
- **`query_data_sources` looks stale right after a write** → its index lags;
  a direct page fetch is authoritative.
- **Routine runs have no approval prompts** (unlike interactive MCP), so silent
  approval blocks don't apply there.
- Daily Routine quota is shared with regular Claude Code usage.

---

## Conventions

- Secrets never in the repo: local `.env` (gitignored), Routine env var otherwise.
- Private repo by default (hardcoded DB IDs + personal structure).
- One README per system, documenting the non-obvious.
- RBT/ABA note pipeline does NOT belong here (PHI → needs its own access-controlled repo).
