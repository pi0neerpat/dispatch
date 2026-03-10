# Plan: `hub` CLI — Agent-Friendly Data Access for Coordination Hub

## Context

The coordination hub has data scattered across markdown files (`todo.md`, `activity-log.md`, `notes/swarm/*.md`) and git repos. Both humans and AI agents need fast, structured access to this data. The terminal dashboard (`hub/dashboard.js`) is human-friendly (ANSI boxes, colors) but useless for agents — they need JSON.

This CLI is the **data access layer** for the coordination hub. It's agent-first: every command outputs structured JSON by default. Agents (including `/swarm` sub-agents, the `/hub` skill, and the `/morning-brief` command) call it to get state without reading and parsing multiple files themselves.

**Read-only for now.** Future: start/update swarm, validate tasks, update todo.md.

---

## Design

A single Node.js script at `hub/cli.js` with subcommands. No build step, no dependencies beyond Node built-ins. Shares parsing logic with the existing `hub/dashboard.js`.

```
hub status              → full overview: stage, all repos, tasks, git, swarm summary
hub tasks               → open tasks across all repos
hub tasks --repo=marketing  → tasks for one repo
hub swarm               → all swarm agents with status
hub swarm <id>          → single agent detail (full progress + results)
hub repos               → git status for all repos
hub activity            → recent activity entries across repos
hub config              → raw hub config
```

**Output:** JSON to stdout. Errors to stderr. Exit code 0 on success, 1 on error.

**Invocation by agents:** `node "/Volumes/My Shared Files/scribular/hub/cli.js" status`
**Alias for humans:** `alias hub='node "/Volumes/My Shared Files/scribular/hub/cli.js"'` (replaces the current dashboard.js alias)

---

## Step 1: Extract shared parsers into `hub/parsers.js`

**New file:** `hub/parsers.js`

Extract from `hub/dashboard.js` (lines 25-95):
- `parseTaskFile(filePath)` → `{ sections: [{ name, tasks: [{ text, done }] }], openCount, doneCount }`
- `parseActivityLog(filePath)` → `{ stage, entries: [{ date, bullet }] }`
- `getGitInfo(repoPath)` → `{ branch, dirtyCount }`

Add new:
- `parseSwarmFile(filePath)` → `{ id, taskName, started, status, validation, lastProgress, progressCount, durationMinutes, resultsSummary, progressEntries, results, validationNotes }`
- `parseSwarmDir(dirPath)` → array of parseSwarmFile results for all `*.md` files in directory
- `loadConfig(hubDir)` → reads and returns `config.json`, resolves repo paths to absolute

**`parseSwarmFile` spec** (based on real file `notes/swarm/2026-03-10-facebook-group-scan.md`):

```
# Swarm Task: (.+)        → taskName
Started: (.+)              → started
Status: (.+)               → status (normalize: "In progress" → "in_progress", etc.)
Validation: (.+)           → validation (optional, default "none")
## Progress                → collect subsections (### headers) + bullet lines
## Results                 → collect until next ## or EOF
## Validation              → collect criteria + notes
```

Duration calculated as: `(now - started)` in minutes.

### Update `hub/dashboard.js`

Change it to `require('./parsers')` instead of defining parsing functions inline. Keeps the ANSI terminal output but delegates data gathering to the shared module.

---

## Step 2: Create `hub/cli.js`

**New file:** `hub/cli.js`

Single file, ~150 lines. No framework — just `process.argv` parsing. Uses `hub/parsers.js` for all data.

### Subcommands

#### `hub status`
The "give me everything" command. Agents call this on session start.
```json
{
  "stage": "Get it on 10 people's computers",
  "repos": [
    {
      "name": "marketing",
      "git": { "branch": "main", "dirtyCount": 5 },
      "tasks": { "openCount": 15, "doneCount": 8 },
      "lastActivity": { "date": "2026-03-10", "bullet": "Published LinkedIn Post 4..." }
    }
  ],
  "swarm": {
    "active": 1,
    "completed": 2,
    "failed": 0,
    "needsValidation": 1
  },
  "totals": { "openTasks": 20, "doneTasks": 12 }
}
```

#### `hub tasks [--repo=name]`
All open tasks, optionally filtered by repo.
```json
{
  "repos": [
    {
      "name": "marketing",
      "sections": [
        {
          "name": "Today — 2026-03-10",
          "tasks": [
            { "text": "Draft and publish LinkedIn Post 4", "done": false },
            { "text": "Contact Daisy Sky", "done": false }
          ]
        }
      ],
      "openCount": 15,
      "doneCount": 8
    }
  ]
}
```

#### `hub swarm [id]`
Without id: summary of all swarm agents.
```json
{
  "agents": [
    {
      "id": "2026-03-10-facebook-group-scan",
      "taskName": "Facebook Group Scan",
      "started": "2026-03-10",
      "status": "in_progress",
      "validation": "none",
      "lastProgress": "Scanning Group 3: Healers & Holistic Therapists",
      "progressCount": 12,
      "durationMinutes": 25
    }
  ],
  "summary": { "active": 1, "completed": 0, "failed": 0, "needsValidation": 0 }
}
```

With id: full detail for one agent (all progress entries, results, validation notes).
```json
{
  "id": "2026-03-10-facebook-group-scan",
  "taskName": "Facebook Group Scan",
  "started": "2026-03-10",
  "status": "in_progress",
  "validation": "none",
  "progressEntries": [
    "Browser session verified. Logged in as Alissa.",
    "Scanning Group 1: Therapists Supporting Therapists",
    "\"AI notes\": Corwin Frey (March 9, already commented)..."
  ],
  "results": null,
  "validationNotes": null
}
```

#### `hub repos`
Git status for all repos.
```json
{
  "repos": [
    { "name": "marketing", "branch": "main", "dirtyCount": 5 },
    { "name": "website", "branch": "main", "dirtyCount": 0 },
    { "name": "electron", "branch": "main", "dirtyCount": 0 }
  ]
}
```

#### `hub activity [--limit=N]`
Recent activity across repos. Default limit: 3 entries per repo.
```json
{
  "stage": "Get it on 10 people's computers",
  "repos": [
    {
      "name": "marketing",
      "entries": [
        { "date": "2026-03-10", "bullet": "Published LinkedIn Post 4..." },
        { "date": "2026-03-09", "bullet": "Turned off Facebook ad campaign..." }
      ]
    }
  ]
}
```

#### `hub config`
Raw config.json with resolved absolute paths.

### Error handling

All errors go to stderr as JSON: `{ "error": "message" }`. Exit code 1.
Unknown subcommand: print usage to stderr, exit 1.
Missing hub/config.json: `{ "error": "hub/config.json not found" }`, exit 1.

---

## Step 3: Swarm directory scanning

The swarm parser needs to find `notes/swarm/` across all repos in config, not just the current repo. For each repo in `config.repos`:
1. Check if `<repoPath>/notes/swarm/` exists
2. If yes, read all `*.md` files
3. Parse each with `parseSwarmFile`
4. Add `repo` field to each result

This means `hub swarm` shows agents from ALL repos, not just marketing.

---

## Step 4: Wire into existing skills

### Update `/hub` skill (`clauffice/dot-claude/skills/hub/SKILL.md`)
Instead of instructing Claude to manually read 6+ files, tell it to run:
```bash
node "/Volumes/My Shared Files/scribular/hub/cli.js" status
```
Parse the JSON output. This is faster and more reliable than file-by-file reading.

### Update `/swarm` skill (`clauffice/dot-claude/skills/swarm/SKILL.md`)
In Step E (Context Gathering), instead of reading `hub/config.json` + `todo.md` manually, run:
```bash
node "/Volumes/My Shared Files/scribular/hub/cli.js" tasks
```

### Update `morning-brief` command
Replace the instruction to run `node hub/dashboard.js` with `node hub/cli.js status` for structured data, keeping the terminal dashboard as a supplementary human view.

---

## Step 5: Validation support (read-only)

The CLI reads validation state from swarm files but doesn't modify it (read-only for now).

The `hub swarm` output includes `validation` field per agent:
- `"none"` — no Validation header in file
- `"needs_validation"` — `Validation: needs_validation`
- `"validated"` — `Validation: validated`
- `"rejected"` — `Validation: rejected`

The `hub swarm <id>` output includes `validationNotes` with full criteria/notes from the `## Validation` section.

### Future write commands (NOT this build)
```
hub swarm validate <id>              → set Validation: validated
hub swarm reject <id> --notes="..."  → set Validation: rejected + notes
hub swarm start <task-list-file>     → launch a swarm from a file
hub tasks add <repo> "task text"     → add task to repo's todo.md
hub tasks done <repo> <task-number>  → check off a task
```

---

## Files changed

| File | Action |
|------|--------|
| `hub/parsers.js` | **Create** — shared parsing module (~120 lines) |
| `hub/cli.js` | **Create** — CLI entry point (~150 lines) |
| `hub/dashboard.js` | **Edit** — import from `parsers.js` instead of inline functions |
| `clauffice/dot-claude/skills/hub/SKILL.md` | **Edit** — use CLI instead of manual file reads |
| `clauffice/dot-claude/skills/swarm/SKILL.md` | **Edit** — use CLI for context gathering + add validation to Step I |
| `clauffice/dot-claude/commands/morning-brief.md` | **Edit** — use CLI for structured data |

**No new dependencies.** Pure Node.js built-ins (fs, path, child_process).

---

## Relationship to dashboard plan

The web dashboard (saved separately) will use the same `hub/parsers.js` module for its Express backend. The architecture layers:

```
hub/parsers.js          ← shared data layer (read markdown + git)
    ├── hub/cli.js      ← agent-friendly CLI (JSON output)
    ├── hub/dashboard.js ← human-friendly terminal (ANSI output)
    └── hub/dashboard/server/  ← future web dashboard (HTTP/JSON)
```

All three consume the same parsers. Build the CLI first → validate the parsers work → then the web dashboard reuses them.

---

## Verification

1. **Status:** `node hub/cli.js status` → returns JSON with stage, all 3 repos, task counts, swarm summary
2. **Tasks:** `node hub/cli.js tasks` → returns all open tasks grouped by repo and section
3. **Tasks filtered:** `node hub/cli.js tasks --repo=marketing` → only marketing tasks
4. **Swarm list:** `node hub/cli.js swarm` → lists all swarm agents with status
5. **Swarm detail:** `node hub/cli.js swarm 2026-03-10-facebook-group-scan` → full progress entries
6. **Repos:** `node hub/cli.js repos` → git status for all 3 repos
7. **Activity:** `node hub/cli.js activity` → recent entries across repos
8. **Error:** `node hub/cli.js badcommand` → usage message to stderr, exit 1
9. **Agent integration:** Update `/hub` skill to use CLI → run `/hub` → verify it calls CLI and formats output
10. **Dashboard compat:** `hub/dashboard.js` still works after refactoring parsers out
11. **Pipe-friendly:** `node hub/cli.js status | jq .swarm` → works correctly (clean JSON, no ANSI)
