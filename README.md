# Work.Down

**Agents for your Markdown Files, not the other way around.**

> **Experimental / testing grounds.** This is a working prototype, not a finished product. Expect rough edges.

A coordination hub for Claude Code agent workflows across multiple repos. Tasks live in plain markdown files you already have. Work.Down gives you a dashboard to dispatch agents, track their progress, and automatically close out the work when you validate it — without touching your existing setup.

## What it does

- **Task dashboard** — open tasks and activity across all your repos in one place
- **Agent dispatch** — start Claude Code sessions from the dashboard, track terminal output live
- **Auto-completion** — validating a job marks the task done in `todo.md` and logs it to `activity-log.md` automatically
- **Job history** — every agent run is logged to a markdown file in `notes/jobs/`
- **CLI** — JSON output for scripting and agent-to-agent queries

## What gets installed where

The full list. Nothing is installed globally or outside the directories you explicitly connect.

| What | Where | Why |
|------|-------|-----|
| Dashboard (React + Express) | `hub/dashboard/` | The web UI and API server |
| CLI + parsers | `hub/` | `node cli.js` commands — zero external dependencies |
| Claude skills | `hub/.claude/skills/` | `/hub`, `/jobs`, `/add-repo`, `/done` — only active in this directory |
| Claude hooks | `hub/.claude/hooks/` | `protect-env.js` — only active in this directory |
| `hub-stop.js` hook | `<each connected repo>/.claude/hooks/` | Signals the dashboard when a dispatched job finishes |
| `settings.json` entry | `<each connected repo>/.claude/settings.json` | Registers the hook — merged with any existing config |

The `hub-stop.js` hook is a no-op unless the hub dashboard dispatched that session. It won't affect normal Claude usage in your repos.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/workdown hub
cd hub/dashboard && yarn install && cd ..
```

> **Node.js version note:** `node-pty` requires Node 18 or 20. On Node 24+ the `postinstall` script rebuilds it from source automatically — this takes a minute on first install.

### 2. Open in Claude Code

```bash
cd hub
claude .
```

### 3. Add your repos

In the Claude Code conversation, run:

```
/add-repo
```

Claude will ask for the repo name, path, and optional scripts, then:
- Add it to `config.json`
- Create `todo.md`, `bugs.md`, and `activity-log.md` in that repo if they don't exist
- Install the `hub-stop.js` hook in that repo's `.claude/` directory

Repeat for each repo you want to track.

### 4. Start the dashboard

```bash
cd dashboard && yarn dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How it works

1. Open tasks in your repos' `todo.md` files appear in the dashboard
2. Click a task to dispatch a Claude Code agent — it opens a terminal session in that repo
3. The agent writes progress to `notes/jobs/YYYY-MM-DD-slug.md` as it works
4. When you validate the job in the dashboard, Work.Down automatically:
   - Marks the task done in `todo.md`
   - Logs an entry to `activity-log.md`

Your markdown files stay the source of truth throughout. The dashboard is a lens over them.

---

## File formats

Work.Down reads and writes standard markdown. If you already have these files, they'll be picked up as-is.

### Tasks — `todo.md`

```markdown
## Open

- [ ] Add input validation to the API
- [ ] Write tests for auth module

## Done

- [x] Set up CI pipeline
```

### Bugs — `bugs.md`

```markdown
## Open

- [ ] Login fails on Safari

## Fixed

- [x] 500 error on empty form submit
```

### Activity — `activity-log.md`

Updated automatically when you validate a job. Also writable via `/done`.

```markdown
# My Repo — Activity Log

**Current stage:** MVP

## 2026-03-24

- **Added auth module** — JWT-based auth with refresh tokens
```

---

## CLI reference

```bash
node cli.js status              # Overview of all repos
node cli.js tasks               # All open tasks across repos
node cli.js tasks --repo=app    # Tasks for one repo
node cli.js swarm               # Active and recent agent jobs
node cli.js repos               # List configured repos
node cli.js config              # Dump full resolved config
```

All output is JSON — designed for scripting and agent consumption.

---

## Claude skills

Four skills are included and active when Claude Code is opened in the hub directory:

| Skill | Invoke | What it does |
|-------|--------|--------------|
| `/hub` | `/hub` or "what should I work on?" | Cross-repo task view and work recommendations |
| `/jobs` | `/jobs` + task list | Launch multiple Claude sub-agents in parallel |
| `/add-repo` | `/add-repo` | Connect a new repo to the hub |
| `/done` | `/done` or "we're done" | Mark a task done and log activity manually |

`/done` is for work done outside the dashboard — manual sessions, ad-hoc fixes, anything where you weren't dispatched through the UI.

---

## Requirements

- Node.js 18+ (20 recommended)
- [Claude Code](https://claude.ai/code)
- Yarn: `corepack enable && corepack prepare yarn@stable --activate`

---

## Status

Experimental. Works in practice, but:

- No automated tests
- The word "swarm" appears in older parts of the codebase — being migrated to "jobs"
- Some UI rough edges in the dashboard

Contributions welcome.

## License

MIT
