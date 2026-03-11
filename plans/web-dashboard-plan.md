# Plan: Live Web Dashboard for Agent Coordination Hub

## Context

The `/swarm` skill launches parallel sub-agents that write progress to `notes/swarm/YYYY-MM-DD-slug.md`. Currently there's no way to watch these agents work — you have to manually `cat` each progress file or scroll back in the conversation.

The CLI (`hub/cli.js`) and shared parsers (`hub/parsers.js`) are now built and working. The web dashboard builds on top of these — the Express backend reuses `parsers.js` directly instead of rewriting anything.

**Key decisions:**
- Express server reuses `hub/parsers.js` — no TypeScript rewrite needed
- JavaScript throughout (matching CLI/parsers), JSX for React components only
- Validation is a first-class phase — completed agents go through a review gate
- Checkpoints / revertibility using branches → **future feature**
- Interactive controls (kill agent, reassign task) → **future feature**

---

## Architecture

```
hub/
  parsers.js              ← EXISTING shared parsing module
  cli.js                  ← EXISTING agent-friendly CLI
  terminal.js             ← EXISTING ANSI terminal dashboard
  config.json             ← EXISTING repo configuration
  dashboard/              ← NEW: Vite + React SPA + Express backend
    package.json
    vite.config.js
    index.html
    server.js             ← Express: 4 JSON endpoints (~80 lines, reuses ../parsers.js)
    src/
      main.jsx
      App.jsx             ← Layout: HeaderBar + 2-column grid
      styles/
        tailwind.css
        theme.css          ← Extended with status colors
      lib/
        utils.js           ← cn() helper
        usePolling.js      ← Custom hook: poll endpoint at interval
      components/
        HeaderBar.jsx      ← Stage + quick stats + refresh indicator
        SwarmPanel.jsx     ← Live agent activity list
        TaskBoard.jsx      ← Open tasks across repos (tabbed by repo)
        RepoStatus.jsx     ← Git branch + dirty + recent activity
```

**Stack:** Vite + React 18 + Tailwind v4 (`@tailwindcss/vite`) + lucide-react icons. Same toolchain as `linkedin-slide-carousel/`.

---

## Step 1: Scaffold the project

Create `hub/dashboard/` with:
- `package.json` — deps: react, react-dom, express, cors, lucide-react, clsx, tailwind-merge. devDeps: vite, @vitejs/plugin-react, @tailwindcss/vite, tailwindcss
- `vite.config.js` — react + tailwindcss plugins + dev proxy (`/api` → `localhost:3001`)
- `index.html` — minimal SPA shell
- `src/styles/tailwind.css` + `src/styles/theme.css` — reuse carousel theme, extend with status colors

---

## Step 2: Express backend — 4 endpoints

The server is ~80 lines. It `require`s `../parsers` and wraps the same logic as `cli.js`.

### `GET /api/config`
Reads hub config. Called once on app load.

### `GET /api/overview`
Returns stage, repos with git/task/activity data, totals. Same shape as `cli.js status`.
**Poll:** Every 10s

### `GET /api/swarm`
Returns all swarm agents with status summary. Same shape as `cli.js swarm`.
**Poll:** Every 5s

### `GET /api/swarm/:id`
Returns full detail for one agent. Same shape as `cli.js swarm <id>`.
**Used:** On-demand when expanding an agent card.

---

## Step 3: Frontend components

### HeaderBar
Sticky top bar. Left: "SCRIBULAR HUB" + stage. Right: badges (open tasks, active agents, needs review) + "refreshed Xs ago".

### SwarmPanel (PRIMARY)
Card with "Swarm Activity" header + pulsing dot when agents active. Lists agents newest first. Each row: status icon, task name, duration, last progress line, validation badge. Expandable to show full progress.

### TaskBoard
Card with repo tabs (Marketing / Website / Electron). Each tab lists task sections with checkbox-style items. Counts in tab labels.

### RepoStatus
Compact card grid — one mini-card per repo showing branch, dirty count (yellow if >0, green "clean"), most recent activity.

### usePolling hook
```js
function usePolling(url, intervalMs) → { data, loading, error, lastRefresh }
```
AbortController for cleanup. Keeps last good data on error.

---

## Step 4: Start script

```json
"scripts": {
  "dev": "concurrently \"node server.js\" \"vite\"",
  "build": "vite build",
  "start": "node server.js"
}
```

Express serves built SPA from `dist/` in production + handles `/api/*` routes.

---

## Files changed

| File | Action |
|------|--------|
| `hub/dashboard/` (entire directory) | **Create** — Vite + React + Express project |
| `hub/plans/web-dashboard-plan.md` | **Update** — this file |

**Reused from existing code:**
- `hub/parsers.js` → Express backend imports directly
- `linkedin-slide-carousel/` → CSS variable system pattern + Tailwind config approach

---

## Future features (NOT this build)

- Checkpoints / revertibility using git branches
- Interactive controls: validate/reject via dashboard buttons (POST endpoint)
- Kill stuck agents from dashboard
- Reassign tasks
- Inter-agent communication
- Decision log timeline

---

## Verification

1. **Start dashboard:** `cd hub/dashboard && yarn dev` → opens at `localhost:5173` with API proxy to `:3001`
2. **API works:** `curl localhost:3001/api/overview` → returns JSON matching CLI output shape
3. **Task board:** All 3 repos' tasks visible in tabs with correct counts
4. **Repo status:** Shows correct branch + dirty count for each repo
5. **Swarm visibility:** If swarm files exist, SwarmPanel shows agents
6. **Empty state:** With no swarm files, SwarmPanel shows "No swarm tasks" message
7. **Auto-refresh:** Overview updates every 10s, swarm every 5s
8. **Error resilience:** Stop the backend → frontend shows stale data with error indicator
