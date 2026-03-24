# Claude Agent Hub

> **Experimental / testing grounds.** This is not a finished product — it's a working prototype used to coordinate multi-repo AI agent workflows. Expect rough edges.

A coordination hub for Claude Code agent workflows across multiple repos. Gives you a single place to track tasks, dispatch agents, and monitor progress — without leaving your terminal or a lightweight web dashboard.

## What It Does

- **Aggregates tasks and activity** from all your repos into one view
- **Dispatches Claude Code agents** to work on tasks, with progress tracked in markdown files
- **Web dashboard** for managing jobs, viewing terminal output, and reviewing agent work
- **CLI** for scripting and agent-to-agent queries

The "database" is plain markdown files (`todo.md`, `activity-log.md`, `notes/jobs/*.md`) — no external services, no database.

## Screenshots

> _(Coming soon)_

## Quick Start

**1. Configure your repos**

Copy `config.example.json` to `config.json` and point it at your repos:

```json
{
  "repos": [
    { "name": "app", "path": "../my-app", "taskFile": "todo.md", "activityFile": "activity-log.md" },
    { "name": "hub", "path": ".", "taskFile": "todo.md", "activityFile": "activity-log.md" }
  ],
  "hubRoot": "."
}
```

Each repo needs a `todo.md` with markdown checkboxes (`- [ ] task`) and an `activity-log.md` with date headers (`## YYYY-MM-DD`).

**2. Try the CLI (no install needed)**

```bash
node cli.js status        # Overview of all repos
node cli.js tasks         # All open tasks
node cli.js tasks --repo=app
node cli.js swarm         # Active agent jobs
```

**3. Run the terminal dashboard**

```bash
node terminal.js
```

**4. Run the web dashboard**

```bash
cd dashboard && yarn install
yarn dev    # http://localhost:5173
```

## Architecture

```
config.json ─── loadConfig() ───┐
                                │
                          parsers.js (shared)
                           │    │    │
                    ┌──────┘    │    └──────┐
                    v           v           v
                 cli.js    terminal.js   dashboard/server.js
              (JSON out)   (ANSI out)    (Express REST API)
                                              │
                                         dashboard/src/
                                        (React + Tailwind SPA)
```

- **`parsers.js`** — shared data layer, zero external dependencies
- **`cli.js`** — JSON CLI for agent and script consumption
- **`terminal.js`** — ANSI read-only dashboard
- **`dashboard/`** — React SPA + Express API, WebSocket terminal with PTY

## Task & Activity Format

Tasks live in `todo.md` in each repo:

```markdown
## Open

- [ ] Add input validation to the API
- [ ] Write tests for auth module

## Done

- [x] Set up CI pipeline
```

Activity lives in `activity-log.md`:

```markdown
# Activity Log

**Current stage:** MVP

## 2026-03-24

- **Added auth module** — JWT-based authentication with refresh tokens
```

## Agent Job Format

When the dashboard dispatches an agent, it creates a progress file at `notes/jobs/YYYY-MM-DD-slug.md`:

```markdown
# Job Task: Add input validation to the API
Started: 2026-03-24 10:00:00
Status: In progress
Repo: app
Session: session-abc123

## Progress
- [2026-03-24 10:00:00] Task initiated from dashboard
- [2026-03-24 10:01:30] Reading existing validation patterns...

## Results
...

## Validation
...
```

The dashboard polls these files to show live progress.

## Claude Skills

Two Claude Code skills are included in `.claude/skills/`:

- **`/hub`** — Ask Claude for a cross-repo task view and work recommendations
- **`/jobs`** — Dispatch multiple Claude sub-agents in parallel from a task list

Two hooks are included in `.claude/hooks/`:

- **`protect-env.js`** — Blocks Claude from accidentally reading `.env` files
- **`hub-stop.js`** — Signals the dashboard when a dispatched session ends

For a fuller Claude Code skill suite, see [Clauffice](https://github.com/pi0neerpat/clauffice).

## Requirements

- Node.js 18+
- [Claude Code](https://claude.ai/code) (for agent dispatch features)
- Yarn (for dashboard): `corepack enable && corepack prepare yarn@stable --activate`

> **Note on Node.js version:** `node-pty` (used for terminal PTY) requires rebuilding from source on Node v24+. The dashboard's `postinstall` script handles this automatically via `npx node-gyp rebuild`.

## Project Structure

```
hub/
├── cli.js              # JSON CLI
├── terminal.js         # ANSI terminal dashboard
├── parsers.js          # Shared data layer
├── config.json         # Your repo configuration
├── config.example.json # Example configuration
├── todo.md             # Hub's own tasks
├── activity-log.md     # Hub's own activity log
├── dashboard/          # Web dashboard (React + Express)
│   ├── server.js       # Express API + WebSocket terminal
│   ├── eventPipeline.js# Terminal event capture
│   └── src/            # React SPA
├── docs/               # Architecture docs
│   ├── cli-architecture.md
│   ├── dashboard-architecture.md
│   └── coding-standards.md
├── notes/jobs/         # Agent job progress files (gitignored)
└── .claude/            # Claude Code hooks and skills
    ├── settings.json
    ├── hooks/
    └── skills/
```

## Status

This is experimental software built for a specific workflow. It works, but:

- No tests
- Minimal error handling in places
- Some UI rough edges
- The "swarm" terminology in older parts of the codebase is being migrated to "jobs"

Contributions and feedback welcome, but manage expectations accordingly.

## License

MIT
