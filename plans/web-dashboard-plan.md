# Plan: Live Web Dashboard for Agent Coordination Hub

## Context

The `/swarm` skill launches parallel sub-agents that write progress to `notes/swarm/YYYY-MM-DD-slug.md`. Currently there's no way to watch these agents work — you have to manually `cat` each progress file or scroll back in the conversation. The terminal dashboard (`hub/dashboard.js`) shows tasks and git status but has zero agent awareness.

We need a live web dashboard that auto-refreshes and shows what every agent is doing in real-time, alongside the existing task and repo views.

**Key decisions:**
- Validation is a first-class phase — completed agents go through a review gate before being accepted
- Checkpoints / revertibility using branches → **future feature** (not this build)
- Interactive controls (kill agent, reassign task) → **future feature**

---

## Architecture

```
hub/dashboard/                    ← New Vite + React SPA + Express backend
  package.json
  vite.config.ts
  index.html
  server/
    index.ts                      ← Express: 4 JSON endpoints (~120 lines)
    parsers.ts                    ← Ported from dashboard.js + new swarm parser
    git.ts                        ← Async git status
  src/
    main.tsx
    App.tsx                       ← Layout: HeaderBar + 2-column grid
    lib/
      api.ts                      ← Fetch wrappers
      usePolling.ts               ← Custom hook: poll endpoint at interval
    components/
      HeaderBar.tsx               ← Stage + quick stats + refresh indicator
      SwarmPanel.tsx              ← PRIMARY: live agent activity list
      SwarmAgentCard.tsx          ← Single agent: status, progress, validation
      TaskBoard.tsx               ← Open tasks across repos (tabbed by repo)
      RepoStatus.tsx              ← Git branch + dirty + recent activity
      ValidationBadge.tsx         ← Status badge with state-specific colors
    styles/
      tailwind.css
      theme.css                   ← Extended from slide-carousel with status colors
```

**Stack:** Vite + React 18 + Tailwind v4 (`@tailwindcss/vite`) + Radix/shadcn components + lucide-react. Same stack as `linkedin-slide-carousel/`.

**Hosting:** portless at `http://dashboard.localhost:1355`

---

## Step 1: Scaffold the project

Create `hub/dashboard/` with:
- `package.json` — dependencies: react, react-dom, express, lucide-react, tailwind-merge, clsx, class-variance-authority, @radix-ui/react-tabs, @radix-ui/react-tooltip, @radix-ui/react-separator, @radix-ui/react-collapsible. devDeps: vite, @vitejs/plugin-react, @tailwindcss/vite, tailwindcss, tsx, typescript
- `vite.config.ts` — react plugin + tailwindcss plugin + dev proxy (`/api` → `localhost:3001`)
- `index.html` — minimal SPA shell
- `tsconfig.json`

Copy from `linkedin-slide-carousel/src/`:
- `styles/tailwind.css` + `styles/theme.css` (extend theme.css with status color variables: `--status-active`, `--status-complete`, `--status-failed`, `--status-needs-review`)
- UI primitives needed: `badge.tsx`, `card.tsx`, `tabs.tsx`, `tooltip.tsx`, `separator.tsx`, `skeleton.tsx` + `lib/utils.ts` (the `cn()` helper)

---

## Step 2: Express backend — 4 endpoints

Port parsing functions from `hub/dashboard.js` (lines 25-95) to TypeScript in `server/parsers.ts`. Add new swarm parser.

### `GET /api/config`
Reads `hub/config.json`. Called once on app load.

### `GET /api/overview`
**Reads:** All repos' `todo.md` + `activity-log.md` + git status
**Returns:**
```ts
{
  stage: string,
  repos: [{ name, git: { branch, dirtyCount }, tasks: { openCount, doneCount, sections }, activity: { entries } }],
  totals: { open, done }
}
```
**Poll:** Every 10s

### `GET /api/swarm`
**Reads:** `notes/swarm/*.md` from each repo in config
**Returns:**
```ts
{
  agents: [{
    id: string,           // filename slug
    taskName: string,     // from "# Swarm Task: X"
    started: string,      // from "Started: X"
    status: "in_progress" | "complete" | "failed",
    validation: "none" | "needs_validation" | "validated" | "rejected",
    lastProgress: string, // last "- " line from ## Progress
    progressCount: number,
    durationMinutes: number,
    resultsSummary: string | null,  // first 200 chars of ## Results
  }],
  summary: { active, completed, failed, needsValidation }
}
```
**Poll:** Every 5s (the hot path — watching agents work in real-time)

### `GET /api/swarm/:id`
**Reads:** Single swarm file by slug
**Returns:** Full parsed content — all progress entries, results, validation notes, raw markdown
**Used:** On-demand when expanding an agent card (not polled)

### Swarm file parser (`parseSwarmFile`)

Parses the real format from `notes/swarm/`:
```
# Swarm Task: (.+)          → taskName
Started: (.+)                → started
Status: (.+)                 → status (normalize to in_progress/complete/failed)
Validation: (.+)             → validation state (optional field — "none" if absent)
## Progress                  → collect all "- " lines and "### " subsections
## Results                   → collect everything until next ## or EOF
## Validation                → collect validation criteria and notes
```

---

## Step 3: Validation as first-class phase

### Extended swarm file format

Add `Validation:` header and `## Validation` section to the swarm progress file contract:

```markdown
# Swarm Task: Facebook Group Scan
Started: 2026-03-10
Status: Complete
Validation: needs_validation

## Progress
- [10:30] Scanning Group 1...
- [10:42] Found 3 candidate posts

## Results
Found 1 strong match. Draft reply prepared.

## Validation
Criteria:
  - [ ] Posts are recent (< 7 days)
  - [ ] Draft follows playbook tone
  - [ ] No product names in draft
Notes:
```

### Lifecycle

```
In progress → Complete → Needs Validation → Validated
                                          → Rejected (with notes)
```

1. **Agent completes** → writes `Status: Complete`
2. **Swarm orchestrator** (update to `/swarm` SKILL.md) → when collecting results, appends `Validation: needs_validation` and a `## Validation` section with task-type criteria:
   - Facebook/content tasks: follows playbook? no product names?
   - Research tasks: sources cited? findings specific?
   - Content drafts: passes anti-AI? matches voice?
   - Default: results complete? matches original task?
3. **Dashboard shows** amber "Needs Review" badge — the call-to-action for the human
4. **Human reviews** in dashboard (reads expanded results), then edits the file:
   - Set `Validation: validated` + check criteria → green badge
   - Set `Validation: rejected` + add notes → red badge
5. **Dashboard reflects** on next 5s poll

### Update to `/swarm` SKILL.md

Add to Step I (Collect Results): after all agents return, for each completed agent's progress file, append `Validation: needs_validation` and a `## Validation` section with criteria appropriate to the task type. This is the orchestrator's responsibility, not the sub-agent's.

---

## Step 4: Frontend components

### HeaderBar
Sticky top bar. Left: "SCRIBULAR HUB" + stage. Right: three badges (open tasks, active agents, needs review count) + "refreshed Xs ago".

### SwarmPanel (PRIMARY)
Card with "Swarm Activity" header + pulsing green dot when agents are active. Lists `SwarmAgentCard` items, newest first. Empty state: "No swarm tasks. Launch with /swarm."

### SwarmAgentCard
Collapsible row. Collapsed shows:
- Status icon: spinner (active), checkmark (complete), X (failed)
- Task name (bold)
- Duration ("12m")
- Last progress line (truncated, muted)
- ValidationBadge

Expanded (fetches `/api/swarm/:id`): all progress entries + results section rendered as readable content.

### TaskBoard
Card with repo tabs (Marketing / Website / Electron). Each tab lists task sections with checkbox-style items. Counts in tab labels.

### RepoStatus
Compact card grid — one mini-card per repo showing branch, dirty count (yellow if >0, green "clean"), most recent activity entry.

### ValidationBadge

| State | Color | Icon |
|-------|-------|------|
| `needs_validation` | amber | AlertCircle |
| `validated` | green | CheckCircle |
| `rejected` | red | XCircle |
| `none` | (hidden) | — |

---

## Step 5: Polling with `usePolling` hook

```ts
function usePolling<T>(url: string, intervalMs: number): {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}
```

- Uses `AbortController` to cancel in-flight requests on unmount or re-fire
- On error, keeps last good data + shows error indicator (not a crash page)
- `lastRefresh` feeds the HeaderBar's "refreshed Xs ago" display

Polling intervals:
- `/api/swarm` → 5s (hot path)
- `/api/overview` → 10s (tasks/git change slowly)

---

## Step 6: Portless integration

Add to `hub/dashboard/package.json`:
```json
"scripts": {
  "dev": "concurrently \"tsx server/index.ts\" \"vite\"",
  "build": "vite build",
  "start": "tsx server/index.ts"
}
```

Express serves built SPA from `dist/` in production + handles `/api/*` routes.

Create `hub/start-dashboard.sh`:
```bash
#!/usr/bin/env bash
cd "$(dirname "$0")/dashboard"
npx portless dashboard "npx tsx server/index.ts"
```

Access at `http://dashboard.localhost:1355`.

---

## Files changed

| File | Action |
|------|--------|
| `hub/dashboard/` (entire directory) | **Create** — Vite + React + Express project |
| `hub/start-dashboard.sh` | **Create** — portless launcher script |
| `clauffice/dot-claude/skills/swarm/SKILL.md` | **Edit** — add validation phase to Step I (collect results) |

**Reused from existing code:**
- `hub/dashboard.js` lines 25-95 → `server/parsers.ts` (parseTaskFile, parseActivityLog, getGitInfo)
- `linkedin-slide-carousel/src/styles/` → CSS variable system + theme
- `linkedin-slide-carousel/src/app/components/ui/` → badge, card, tabs, tooltip, separator, skeleton

---

## Future features (NOT this build)

- Checkpoints / revertibility using git branches (per Conductor's private-ref pattern)
- Interactive controls: validate/reject via dashboard buttons (POST endpoint)
- Kill stuck agents from dashboard
- Reassign tasks
- Inter-agent communication
- Decision log timeline (`decisions.jsonl`)

---

## Verification

1. **Start dashboard:** `cd hub/dashboard && yarn dev` → opens at `localhost:5173` with API proxy to `:3001`
2. **Swarm visibility:** Launch `/swarm` with 2 tasks → dashboard SwarmPanel shows both agents updating in real-time (5s polling picks up new progress lines)
3. **Completion + validation:** When an agent finishes, its card shows "Needs Review" amber badge → edit the file to set `Validation: validated` → badge goes green on next poll
4. **Task board:** All 3 repos' tasks visible in tabs with correct counts
5. **Repo status:** Shows correct branch + dirty count for each repo
6. **Empty state:** With no swarm files, SwarmPanel shows "No swarm tasks" message
7. **Portless:** `bash hub/start-dashboard.sh` → accessible at `http://dashboard.localhost:1355`
8. **Error resilience:** Stop the backend → frontend shows stale data with error indicator, doesn't crash
