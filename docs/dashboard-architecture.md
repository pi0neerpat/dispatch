# Dashboard Architecture

Code map for the web dashboard: Express backend + React SPA.

---

## Project Structure

```
dashboard/
├── server.js              # Express API + WebSocket terminal server (ESM)
├── eventPipeline.js       # Terminal output → structured events (NDJSON)
├── eventPipeline.test.mjs # Event pipeline tests
├── package.json           # Dependencies (Yarn 4, nodeLinker: node-modules)
├── .yarnrc.yml            # Yarn config
├── vite.config.js         # Vite build config (React + Tailwind + API proxy)
├── index.html             # SPA shell
└── src/
    ├── main.jsx           # Entry point — mounts <App /> with StrictMode
    ├── App.jsx            # Root component — state, navigation, data fetching
    ├── components/
    │   ├── ActivityBar.jsx      # Left nav: icon tabs + worker badges
    │   ├── ActivityFeed.jsx     # Activity timeline with relative dates
    │   ├── AllTasksView.jsx     # Task lists grouped by repo with status derivation
    │   ├── CommandPalette.jsx   # Global search/command palette (Cmd+K)
    │   ├── DispatchView.jsx     # Worker dispatch form (repo, model, turns, merge)
    │   ├── HeaderBar.jsx        # Top bar: title, search, refresh, context usage
    │   ├── JobDetailView.jsx    # Drill-down: terminal + review tabs for one job
    │   ├── JobsView.jsx         # Worker list grouped by status
    │   ├── ProgressTimeline.jsx # Agent progress entries with timestamps
    │   ├── RepoStatus.jsx       # Repo cards with progress rings + checkpoints
    │   ├── ResultsPanel.jsx     # Review tab: agent results + validate/reject/merge
    │   ├── SchedulesView.jsx    # CRUD for cron-based scheduled dispatches
    │   ├── StatusView.jsx       # Dashboard overview: repo stats + activity feed
    │   ├── SwarmDetail.jsx      # Full agent detail view
    │   ├── SwarmPanel.jsx       # Grid of agent cards
    │   ├── TerminalPanel.jsx    # xterm.js terminal instances (one per worker)
    │   ├── Toast.jsx            # Toast notification component
    │   └── mdComponents.jsx     # Shared react-markdown component overrides
    ├── lib/
    │   ├── constants.js      # repoIdentityColors, modelOptions
    │   ├── statusConfig.js   # statusConfig, validationConfig for swarm states
    │   ├── usePolling.js     # Hook: poll API endpoint at interval
    │   ├── useSearch.js      # Hook: indexes repos, tasks, agents for search
    │   ├── useTerminal.js    # Hook: xterm.js + WebSocket PTY connection
    │   ├── utils.js          # cn() class merger + timeAgo() formatter
    │   └── workerUtils.js    # buildWorkerNavItems() — unifies sessions + agents
    └── styles/
        ├── tailwind.css       # Tailwind v4 import + source config
        └── theme.css          # CSS custom properties (colors, fonts, animations)
```

---

## Dependencies

### Runtime (production)

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `express` | ^4.21 | server.js | REST API server |
| `cors` | ^2.8 | server.js | CORS middleware for dev |
| `ws` | ^8.18 | server.js | WebSocket server for terminal |
| `node-pty` | ^1.0 | server.js | PTY process spawning (zsh terminals) |
| `react` | ^18.3 | src/ | UI framework |
| `react-dom` | ^18.3 | src/ | React DOM renderer |
| `@xterm/xterm` | ^5.5 | useTerminal.js | Terminal emulator widget |
| `@xterm/addon-fit` | ^0.10 | useTerminal.js | Auto-resize terminal to container |
| `@xterm/addon-web-links` | ^0.11 | useTerminal.js | Clickable URLs in terminal |
| `lucide-react` | 0.487 | components/ | Icon library (tree-shakeable) |
| `react-markdown` | ^10.1 | ResultsPanel, SwarmDetail | Render markdown in results/validation |
| `clsx` | 2.1 | utils.js | Conditional class name joining |
| `tailwind-merge` | 3.2 | utils.js | Merge conflicting Tailwind classes |

### Dev

| Package | Purpose |
|---------|---------|
| `vite` | Build tool + dev server |
| `@vitejs/plugin-react` | JSX transform |
| `tailwindcss` + `@tailwindcss/vite` | Tailwind CSS v4 |
| `concurrently` | Run server + vite in parallel during dev |

---

## Server (server.js)

ESM module. Bridges to `parsers.js` (CommonJS) via `createRequire`.

### REST API Endpoints

#### Read Endpoints

| Endpoint | parsers.js Functions Used |
|----------|--------------------------|
| `GET /api/config` | `loadConfig` |
| `GET /api/overview` | `parseTaskFile`, `parseActivityLog`, `getGitInfo`, `listCheckpoints` |
| `GET /api/swarm` | `parseSwarmDir` |
| `GET /api/swarm/:id` | `parseSwarmFile` |
| `GET /api/activity` | `parseActivityLog` |
| `GET /api/sessions` | Reads from `ptySessions` Map |
| `GET /api/sessions/:id/events` | `eventPipeline.getSessionEvents` (paginated, filterable by kind) |
| `GET /api/sessions/:id/summary` | `eventPipeline.getSessionSummary` |
| `GET /api/repos/:name/checkpoints` | `listCheckpoints` |
| `GET /api/schedules` | Reads `schedules.json` |
| `GET /api/events/search` | `eventPipeline.searchEvents` |

#### Write Endpoints

| Endpoint | parsers.js Function | What It Does |
|----------|---------------------|--------------|
| `POST /api/swarm/init` | None (direct `fs.writeFileSync`) | Creates swarm file from task text |
| `POST /api/tasks/done` | `writeTaskDone` | Mark open task as done by index |
| `POST /api/tasks/done-by-text` | `writeTaskDoneByText` | Mark open task as done by text match |
| `POST /api/tasks/edit` | `writeTaskEdit` | Edit task text |
| `POST /api/tasks/add` | `writeTaskAdd` | Add new task to todo.md |
| `POST /api/tasks/move` | `writeTaskMove` | Move task between repos |
| `POST /api/swarm/:id/validate` | `writeSwarmValidation` | Set validation to "validated" |
| `POST /api/swarm/:id/reject` | `writeSwarmValidation` | Set validation to "rejected" |
| `POST /api/swarm/:id/kill` | `writeSwarmKill` | Mark agent as killed |
| `POST /api/swarm/:id/merge` | None (git operations) | Merge agent branch into target |
| `DELETE /api/swarm/:id` | None (fs unlink) | Delete swarm file |
| `POST /api/repos/:name/checkpoint` | `createCheckpoint` |
| `POST /api/repos/:name/checkpoint/:id/revert` | `revertCheckpoint` |
| `DELETE /api/repos/:name/checkpoint/:id` | `dismissCheckpoint` |
| `POST /api/schedules` | None (JSON file) | Create schedule |
| `PUT /api/schedules/:id` | None (JSON file) | Update schedule |
| `DELETE /api/schedules/:id` | None (JSON file) | Delete schedule |
| `POST /api/schedules/:id/toggle` | None (JSON file) | Toggle schedule enabled/disabled |
| `DELETE /api/sessions/:id` | None (kills PTY) | Kill PTY session |
| `POST /api/sessions/:id/chat` | `eventPipeline.answerFromEvents` | Ask questions about session history |

### WebSocket Terminal Server

Path: `/ws/terminal`

**Query parameters:**
- `repo` — Repo name (resolves cwd)
- `session` — Session ID for reconnect
- `swarmFile` — Absolute path to swarm file (for completion tracking)

**Protocol:**
- Client → Server: raw keystrokes, or `\x01RESIZE:cols,rows`
- Server → Client: raw terminal output, or `\x01SESSION:id` (on new session)

**Session persistence:** PTY sessions survive WebSocket disconnects. The `ptySessions` Map holds `{ shell, repo, cwd, scrollback, alive, swarmFilePath }`. On reconnect, scrollback is replayed. On shell exit, if the session has a `swarmFilePath` with `in_progress` status, it's auto-updated to `completed`.

**Event capture:** Terminal output is fed to `eventPipeline` for line classification and structured event storage.

---

## Event Pipeline (eventPipeline.js)

Captures and structures terminal session output into queryable events.

### What It Does

1. **Line classification** — Categorizes terminal output lines as: error, warning, progress, tool, file, thought, action
2. **Agent detection** — Identifies session agent kind (claude, codex, generic)
3. **Event persistence** — Writes NDJSON files to `.hub-runtime/events/<sessionId>.ndjson`
4. **Coalescing** — Deduplicates and merges related output lines
5. **Summary tracking** — Maintains per-session stats: last step, errors, files touched, tool calls
6. **Search** — Full-text search across session event history
7. **QA** — `answerFromEvents()` answers questions using session context

### Key Functions

| Function | Purpose |
|----------|---------|
| `ingestLine(sessionId, line)` | Classify and store a line of terminal output |
| `getSessionEvents(sessionId, opts)` | Retrieve events with cursor-based pagination |
| `getSessionSummary(sessionId)` | Stats: last step, error count, files touched |
| `searchEvents(query)` | Full-text search across all sessions |
| `answerFromEvents(sessionId, question)` | Answer questions from session context |

---

## React Component Tree

```
App (root state: activeNav, drillDownJobId, agentTerminals, skipPermissions)
├── HeaderBar (title, search trigger, refresh, context usage)
├── CommandPalette (global search — repos, tasks, agents)
├── ActivityBar (left icon nav: Status, Jobs, Tasks, Dispatch, Schedules)
├── Main content area (switches on activeNav):
│   ├── StatusView (overview: repo cards, activity feed)
│   ├── JobsView (workers grouped by status: Active, Needs Review, Completed, Failed)
│   ├── AllTasksView (tasks grouped by repo with status derivation)
│   ├── DispatchView (form: repo, task, model, turns, merge options)
│   └── SchedulesView (CRUD for cron-based scheduled dispatches)
├── JobDetailView (drill-down overlay when drillDownJobId is set)
│   ├── TerminalPanel → TerminalInstance (live terminal)
│   └── ResultsPanel (agent results + validate/reject/merge)
└── Toast (notifications)
```

### Navigation Model

The app uses a flat navigation with optional drill-down:

- `activeNav` state controls which view is shown: `status`, `jobs`, `tasks`, `dispatch`, `schedules`
- `drillDownJobId` opens `JobDetailView` as an overlay on top of the current view
- Selecting a job sets both `drillDownJobId` and `activeNav='jobs'`
- Back button clears `drillDownJobId`

### Component Responsibilities

| Component | Data Source | Write Actions |
|-----------|------------|---------------|
| **App** | `usePolling('/api/overview')`, `usePolling('/api/swarm')`, localStorage | Manages `agentTerminals` Map, session persistence |
| **ActivityBar** | Props from App | Navigation changes, badge counts for jobs/review |
| **StatusView** | Props (`overview`, `swarm`) | — |
| **JobsView** | Props (`swarm`, `agentTerminals`) | Select job for drill-down |
| **AllTasksView** | Props (`overview`) | `POST /api/tasks/done`, `/add`, `/edit`, `/move`, start task |
| **DispatchView** | Props (repos from overview) | Creates swarm + terminal session |
| **SchedulesView** | Own fetch to `/api/schedules` | CRUD via `/api/schedules` endpoints |
| **JobDetailView** | `GET /api/swarm/:id` | Tab between terminal and review |
| **TerminalPanel** | `agentTerminals` Map | Kill session, update session ID |
| **ResultsPanel** | `GET /api/swarm/:id` | `POST /api/swarm/:id/validate`, `/reject`, `/kill`, `/merge` |
| **CommandPalette** | `useSearch` (indexes repos, tasks, agents) | Navigation to results |

### Shared Patterns

**Repo identity colors** — Single source of truth in `lib/constants.js`:
```js
import { repoIdentityColors } from '../lib/constants'
// { marketing: '#e0b44a', website: '#818cf8', electron: '#34d399', hub: '#7dd3fc' }
```

**Worker list building** — `lib/workerUtils.js` provides `buildWorkerNavItems()` which unifies active PTY sessions with swarm agents and validation states. Used by ActivityBar, JobsView, and App for badge counts.

**Status config** — In `lib/statusConfig.js`:
Maps status strings (`in_progress`, `completed`, `failed`, `killed`, `needs_validation`) to `{ icon, color, bg, label, dotColor }`.

**Markdown rendering** — Shared `mdComponents` in `components/mdComponents.jsx` for consistent react-markdown styling.

**Confirmation pattern** — Kill, revert, and merge actions use a 2-click confirm with 3-second timeout.

---

## Custom Hooks

### usePolling(url, intervalMs)

```js
const { data, loading, error, lastRefresh, refresh } = usePolling('/api/overview', 10000)
```

- Fetches URL on mount and every `intervalMs` ms
- `refresh()` triggers an immediate re-fetch
- Uses `AbortController` for cleanup
- All API data flows through this hook (overview at 10s, swarm at 5s)

### useTerminal({ onConnected, onIncomingData, repo, sessionId, onSessionId, swarmFilePath })

```js
const { termRef, isConnected, sendCommand, sendRaw, reconnect } = useTerminal({ ... })
```

- Creates xterm.js terminal and WebSocket connection
- `termRef` — attach to a DOM element via `ref={termRef}`
- `sendCommand(text)` — sends text + Enter
- `sendRaw(data)` — sends raw bytes
- `reconnect({ reattach })` — reconnects; if `reattach: true`, skips `onConnected` callback
- Handles container resize via `ResizeObserver` → `FitAddon`

### useSearch(overview, swarm)

- Builds a searchable index of repos, tasks, and agents
- Powers the `CommandPalette` global search
- Returns filtered results matching a query string

---

## ID Mapping: Sessions vs Swarm Files

The dashboard uses **two ID spaces** for swarm agents.

| ID Type | Format | Where Used |
|---------|--------|------------|
| Client session ID | `session-1710000000` | `agentTerminals` Map keys, `drillDownJobId` |
| Swarm file ID | `2026-03-11-slug` | API endpoints (`/api/swarm/:id`), swarm data |

The `agentTerminals` Map bridges these: each entry stores `{ swarmFile: { fileName, relativePath, absolutePath } }`. App.jsx derives `swarmFileId` by stripping `.md` from `fileName`.

---

## Terminal Session Lifecycle

1. User fills out DispatchView form (repo, task, model, turns) and clicks "Dispatch"
2. `App.handleStartTask` → `POST /api/swarm/init` (creates swarm file) → adds to `agentTerminals` Map
3. Navigation switches to Jobs view with drill-down to the new job
4. `JobDetailView` renders `TerminalPanel` with a `TerminalInstance`
5. `useTerminal` opens WebSocket to `/ws/terminal?repo=name&swarmFile=path`
6. Server spawns PTY (`/bin/zsh --login`) in repo directory, returns `\x01SESSION:id`
7. `onConnected` fires → sends `claude --dangerously-skip-permissions` command
8. Terminal output watcher detects Claude's `❯` prompt → sends `/swarm <task text>`
9. Terminal output is captured by `eventPipeline.ingestLine()` for structured event storage
10. When PTY shell exits, server checks swarm file — if `in_progress`, marks as `completed`
11. Client's `/api/swarm` polling picks up the status change within 5 seconds

---

## Vite Configuration

- **React plugin**: `@vitejs/plugin-react` for JSX
- **Tailwind plugin**: `@tailwindcss/vite` for CSS processing
- **Dev server proxy**: `/api` → `http://localhost:3001`, `/ws` → `ws://localhost:3001`
- **Build output**: `dashboard/dist/` (served by Express in production)
