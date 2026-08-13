# SETUP — for Claude Code to execute

Task list to set up this repo. Work through it in order.
- 🤖 = Claude Code can run this directly.
- 🙋 = needs Samanta (secrets, approvals, cloud UI). Pause and ask her.

Read `CLAUDE.md` first for full context (IDs, schema, gotchas).

---

## 1. 🤖 Initialize git + first commit

```bash
git init
git add .
git commit -m "Command Center: initial structure + habits system"
git branch -M main
```

## 2. 🤖 Create the private GitHub repo and push

Check auth first: `gh auth status`. If not authenticated, ask Samanta to run
`gh auth login`, then continue.

```bash
gh repo create command-center --private --source=. --remote=origin --push
```

If `gh` isn't available, ask Samanta to create an empty **private** repo on
GitHub, then:

```bash
git remote add origin git@github.com:<user>/command-center.git
git push -u origin main
```

## 3. 🙋 Notion connection + token (Samanta)

In Notion → Developer tools → Connections → New connection:
- **Access token** (internal), name "Habits Generator".
- Capabilities: **Read**, **Insert**, **Update**.
- Copy the `ntn_...` token (shown once).
- Grant it access to **both** databases (IDs in `CLAUDE.md`): Content access tab,
  or in Notion open each DB → ••• → Connections → add "Habits Generator".

## 4. 🤖 Local env for testing

Create `.env` from the template. `.env` is gitignored — never commit it.

```bash
cp .env.example .env
```

Then 🙋 ask Samanta to paste the `ntn_` token into `NOTION_TOKEN` in `.env`.
Do NOT print, echo, or commit the token.

## 5. 🤖 Local test run

> ⚠️ This writes REAL check-ins to Notion for today (it's idempotent, so it's
> safe and re-running creates 0). If Samanta would rather let the Routine do the
> first run, skip this step.

```bash
pip install -r requirements.txt
set -a && source .env && set +a
python logistics/habits/generate_habits.py
```

Expect: `Done. Created N check-in(s) as of YYYY-MM-DD.`
Run it twice — the second run should create 0 (proves idempotency).

## 6. 🙋 Routine (Samanta — Claude Code cloud)

**Set up the environment BEFORE creating the Routine** (it can't be edited from
the Routine form).

Environment:
- Network: allowlist `api.notion.com`
- Env var: `NOTION_TOKEN` = the token
- Setup script: `pip install requests tzdata`
- Do NOT add the Notion connector (the script uses REST directly)

Then `/schedule` (or claude.ai/code/routines): this repo, the env above,
trigger **daily ~4:00 AM ET**, prompt:

> Run `python logistics/habits/generate_habits.py` and report the summary line
> it prints. Do not modify anything else.

## 7. 🙋 Notion "Hoy" view (Samanta)

In Check-ins → new **Table** view "Hoy":
- Filter: `Period start` on-or-before **Today** AND `Period end` on-or-after **Today**
- Sort: `Order` ascending
- (Optional) group by `Cadence`

---

## Done when

- [ ] Repo pushed (private)
- [ ] Notion connection created + both DBs shared
- [ ] Local test run created today's rows (or skipped intentionally)
- [ ] Routine live on a daily ET trigger
- [ ] "Hoy" view filtering to the current period
