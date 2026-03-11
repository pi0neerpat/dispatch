# Hub — Activity Log

**Current stage:** Get it on 10 people's computers

## 2026-03-11
- **Dashboard refinements** — context-aware tabs (repos show Tasks only, workers show Terminal + Review), per-agent terminals with auto-launch of Claude Code, Worker Bees rename, header title from config
- **Per-agent terminal architecture** — each started task spawns its own PTY/WebSocket/xterm instance with `claude --dangerously-skip-permissions` auto-launch and `/swarm` prompt injection
- **Start button + kill bee** — green Start button on task rows creates worker sessions, Kill button on terminal status bar destroys sessions, swarm file auto-created on start
- **YOLO/Safe permissions toggle** — header toggle for `--dangerously-skip-permissions` flag on new terminal sessions
- **UI polish pass** — collapsible done sections, simplified header, repo-scoped terminal CWD, swarm file init endpoint

---

## 2026-03-10
- **Built CLI** (cli.js) — agent-friendly JSON data access layer for coordination hub
- **Built shared parsers** (parsers.js) — extracted from terminal dashboard for reuse across CLI, terminal, and web dashboard
- **Scaffolded web dashboard** (dashboard/) — Vite + React + Express SPA with live polling
- **Added CLI write commands** — `tasks done`, `tasks add`, `swarm validate`, `swarm reject` close the read/write loop; agents and humans can now update tasks and validate swarm work programmatically via JSON CLI
- **Added POST endpoints to web dashboard** — `/api/tasks/done`, `/api/tasks/add`, `/api/swarm/:id/validate`, `/api/swarm/:id/reject` enable future dashboard UI buttons
- **Added interactive controls to web dashboard** — validate/reject buttons in the UI for swarm task management
- **Added kill-agent control from dashboard** — ability to stop running agents directly from the web dashboard
- **Added task reassignment from dashboard** — reassign tasks between agents via the dashboard UI
- **Added activity timeline to dashboard** — visual timeline of activity across all repos in the web dashboard
- **Added hub repo to hub config** — hub now tracks its own tasks and activity alongside marketing, website, and electron repos

## 2026-03-09
- **Initialized hub repo** — coordination hub for Scribular repos with terminal dashboard
