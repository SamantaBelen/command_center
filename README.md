# Command Center

Personal command center repository. Organized into three top-level areas.

## Structure

```
command-center/
├── README.md
├── requirements.txt
├── .gitignore
├── .env.example
├── logistics/      🟡  → habits/
├── professional/   🔵 + 🟢  (Shortcuts, Links, Guidelines, Job Hunt Tracker)
└── home-life/      🟣
```

## Areas

- **logistics/** 🟡 — day-to-day logistics, including `habits/`.
- **professional/** 🔵🟢 — Shortcuts, Links, Guidelines, and the Job Hunt Tracker.
- **home-life/** 🟣 — home and personal life.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in your own values
```

> `.env` is ignored by git. Only `.env.example` is tracked.
