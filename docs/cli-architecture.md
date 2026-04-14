# CLI Architecture

Code map for Dispatch's command-line interfaces: `cli.js` and `terminal.js`.

---

## File Overview

| File | Purpose | Module | Dependencies |
|------|---------|--------|--------------|
| `parsers.js` | Shared data layer — all reading and writing | CommonJS | `fs`, `path`, `child_process` (Node built-ins only) |
| `cli.js` | Agent-friendly CLI (JSON to stdout) | CommonJS | `parsers.js`, `fs`, `path` |
| `terminal.js` | Human-friendly ANSI dashboard | CommonJS | `parsers.js`, `fs`, `path` |
| `config.json` | Repo registry (names, paths, file locations) | JSON | — |

All three JS files have **zero npm dependencies**. They run with a bare `node` install.

---

## parsers.js — Shared Data Layer

Every consumer (CLI, terminal, dashboard server) imports from `parsers.js`. This is the **only** place data is parsed or written.

Primary naming has moved from "swarm" to "job". The parser exports the new `parseJob*` / `writeJob*` functions and keeps `parseSwarm*` / `writeSwarm*` aliases for compatibility.

### Read Functions

| Function | Input | Output | What It Parses |
|----------|-------|--------|----------------|
| `loadConfig(dispatchRootDir)` | Dispatch root path | `{ repos: [{ name, path, resolvedPath, taskFile, activityFile }], dispatchRoot? }` | `config.json` — resolves relative repo paths to absolute |
| `parseTaskFile(filePath)` | Path to `todo.md` | `{ sections: [{ name, tasks: [{ text, done }] }], openCount, doneCount }` | Markdown `## Section` headers + `- [ ]`/`- [x]` checkboxes |
| `parseActivityLog(filePath)` | Path to `activity-log.md` | `{ stage, entries: [{ date, bullet }] }` | `**Current stage:**` line + `## YYYY-MM-DD` headers + first bullet per date |
| `getGitInfo(repoPath)` | Repo directory path | `{ branch, dirtyCount }` | `git branch --show-current` + `git status --porcelain` |
| `parseJobFile(filePath)` | Path to job `.md` file | `{ id, taskName, started, status, validation, originalPrompt, session, skipPermissions, resumeId, resumeCommand, ... }` | Job/swarm file header metadata + `## Progress`, `## Results`, `## Validation` sections |
| `parseJobDir(dirPath)` | Path to `.dispatch/jobs/` dir | `[parseJobFile result, ...]` | All `.md` files in the directory |
| `parseSwarmFile(filePath)` | Legacy alias of `parseJobFile` | Same as `parseJobFile` | Backward compatibility for older callers |
| `parseSwarmDir(dirPath)` | Legacy alias of `parseJobDir` | Same as `parseJobDir` | Backward compatibility for older callers |

### Write Functions

| Function | What It Does | File Modified |
|----------|--------------|---------------|
| `writeTaskDone(filePath, taskNum)` | Replaces `[ ]` with `[x]` on the Nth open task | `todo.md` |
| `writeTaskDoneByText(filePath, searchText)` | Finds open task by text match and marks done | `todo.md` |
| `writeTaskAdd(filePath, text, section)` | Inserts a `- [ ]` line after the last task in a section | `todo.md` |
| `writeTaskEdit(filePath, taskNum, newText)` | Replaces the text of the Nth open task | `todo.md` |
| `writeTaskMove(sourceFile, taskNum, destFile, section)` | Removes task from source, adds to destination | Two `todo.md` files |
| `writeJobValidation(filePath, status, notes)` | Sets `Validation:` line, appends `## Validation Notes` | Job `.md` file |
| `writeJobKill(filePath)` | Sets `Status: Stopped`, marks the job for review, writes `.kill` marker file | Job `.md` file |
| `writeJobStatus(filePath, newStatus)` | Updates the `Status:` line to a new value | Job `.md` file |
| `writeSwarmValidation(filePath, status, notes)` | Legacy alias of `writeJobValidation` | Job `.md` file |
| `writeSwarmKill(filePath)` | Legacy alias of `writeJobKill` | Job `.md` file |
| `writeSwarmStatus(filePath, newStatus)` | Legacy alias of `writeJobStatus` | Job `.md` file |
| `createCheckpoint(repoPath)` | Creates a git branch capturing current working directory | Git (new branch) |
| `revertCheckpoint(repoPath, id)` | Restores working directory from checkpoint branch | Git (checkout + delete branch) |
| `dismissCheckpoint(repoPath, id)` | Deletes checkpoint branch, keeps current state | Git (delete branch) |
| `listCheckpoints(repoPath)` | Lists `checkpoint/*` branches with metadata | Git (read-only) |

### Schedule Functions

| Function | What It Does | File Modified |
|----------|--------------|---------------|
| `loadSchedules(dispatchRoot)` | Reads all schedules from `schedules.json` | — (read-only) |
| `findSchedule(dispatchRoot, id)` | Finds a single schedule by ID | — (read-only) |
| `createSchedule(dispatchRoot, fields)` | Creates a new schedule with auto-generated ID | `schedules.json` |
| `updateSchedule(dispatchRoot, id, fields)` | Updates allowed fields on an existing schedule | `schedules.json` |
| `deleteSchedule(dispatchRoot, id)` | Removes a schedule by ID | `schedules.json` |
| `toggleSchedule(dispatchRoot, id)` | Flips the `enabled` flag | `schedules.json` |
| `updateScheduleLastRun(dispatchRoot, id, ...)` | Records last run time, status, and job ID | `schedules.json` |
| `getAdjacentSchedules(dispatchRoot, id, windowHours)` | Finds schedules within a time window for collision detection | — (read-only) |
| `loadScheduleEvents(dispatchRoot, opts)` | Reads structured event log (start/complete/fail/skip) | — (read-only) |
| `appendScheduleEvent(dispatchRoot, event)` | Appends an event to `schedule-events.json` | `schedule-events.json` |
| `clearScheduleEvents(dispatchRoot, scheduleId)` | Purges events (all or per-schedule) | `schedule-events.json` |
| `scheduleLogPath(dispatchRoot, scheduleId)` | Returns the path to a schedule's log file | — (path only) |
| `acquireScheduleLock(dispatchRoot, scheduleId, jobId)` | PID-based lock for concurrency control | `schedule-locks/<id>.lock` |
| `releaseScheduleLock(dispatchRoot, scheduleId)` | Removes lock file | `schedule-locks/<id>.lock` |
| `getActiveLocks(dispatchRoot)` | Lists active locks with stale PID detection | — (read-only) |
| `generateCrontabBlock(dispatchRoot)` | Builds crontab fenced block from enabled schedules | — (string only) |
| `syncCrontab(dispatchRoot)` | Replaces fenced block in system crontab | System crontab |

### Task Numbering Convention

`writeTaskDone` and `writeTaskAdd` both count tasks the same way:
- Iterate all lines in file order
- Match `^(\d+\.\s+|[-*]\s+)\[ \]\s+(.+)` (open tasks only)
- Increment a 1-based counter for each match
- `taskNum` refers to the Nth match

The TaskBoard UI uses the same counting, iterating sections in file order and only counting open tasks.

---

## cli.js — Agent CLI

JSON-only interface designed for consumption by Claude Code and other agents.

### Command Router

```
node cli.js <command> [subcommand] [positionals] [--flags]
```

| Command | Subcommand | What It Does |
|---------|------------|--------------|
| `status` | — | Full overview: stage, repos, tasks, git status, swarm summary |
| `tasks` | — | Open tasks across repos. `--repo=name` to filter |
| `tasks` | `done` | `tasks done <repo> <num>` — mark task as done |
| `tasks` | `add` | `tasks add <repo> "text"` — add task. `--section=name` optional |
| `swarm` | — | All swarm agents with summary counts |
| `swarm` | `<id>` | Single agent detail (progress, results, validation) |
| `swarm` | `validate` | `swarm validate <id>` — mark as validated |
| `swarm` | `reject` | `swarm reject <id> --notes="reason"` |
| `repos` | — | Git status (branch, dirty count) for all repos |
| `activity` | — | Recent activity entries. `--limit=N` |
| `config` | — | Raw config.json contents |
| `checkpoint` | `create` | `checkpoint create <repo>` |
| `checkpoint` | `revert` | `checkpoint revert <repo> <id>` |
| `checkpoint` | `dismiss` | `checkpoint dismiss <repo> <id>` |
| `checkpoint` | `list` | `checkpoint list [--repo=name]` |
| `schedule` | — / `list` | All schedules with cron descriptions, running status |
| `schedule` | `show` | `schedule show <id>` — detail + recent events + adjacent schedules |
| `schedule` | `add` | Create schedule. `--name`, `--repo`, `--cron` required. `--type` (prompt\|job\|loop\|shell), `--prompt`, `--model`, `--loop-type`, `--agent-spec`, `--command`, `--concurrency` |
| `schedule` | `edit` | `schedule edit <id>` — update fields (same flags as `add`) |
| `schedule` | `delete` | `schedule delete <id>` — remove + sync crontab |
| `schedule` | `enable` | `schedule enable <id>` — enable + sync crontab |
| `schedule` | `disable` | `schedule disable <id>` — disable + sync crontab |
| `schedule` | `run` | `schedule run <id>` — execute immediately (this is what cron calls) |
| `schedule` | `sync` | Rewrite system crontab from `schedules.json` |
| `schedule` | `active` | Show currently-running schedules (via PID lock files) |
| `schedule` | `events` | Event history. `--limit=N`, `--schedule-id=<id>`, `--type=<type>` |
| `schedule` | `clear-events` | `schedule clear-events [<id>]` — purge events (all or per-schedule) |

### Output Contract

- **Success**: JSON to stdout via `process.stdout.write(JSON.stringify(obj, null, 2) + '\n')`
- **Error**: JSON to stderr via `process.stderr.write(JSON.stringify({ error: msg }) + '\n')`, exit code 1

### Internal Structure

```
cli.js
├── Arg parser (flags, positionals, subcommand detection)
├── Config loader (loadConfig)
├── Data gatherers
│   ├── gatherRepos()  — calls parseTaskFile, parseActivityLog, getGitInfo per repo
│   └── gatherSwarm()  — uses the legacy swarm command vocabulary while reading job/swarm markdown via parser compatibility aliases
├── Read commands (cmdStatus, cmdTasks, cmdSwarm, cmdRepos, cmdActivity, cmdConfig)
├── Write commands (cmdTasksDone, cmdTasksAdd, cmdSwarmValidate, cmdSwarmReject)
├── Checkpoint commands (cmdCheckpointCreate, cmdCheckpointRevert, cmdCheckpointDismiss, cmdCheckpointList)
├── Schedule commands (cmdScheduleList, cmdScheduleShow, cmdScheduleAdd, cmdScheduleEdit,
│   cmdScheduleDelete, cmdScheduleEnable, cmdScheduleDisable, cmdScheduleRun,
│   cmdScheduleSync, cmdScheduleActive, cmdScheduleEvents, cmdScheduleClearEvents)
└── Router (route function — maps command+subcommand to handler)
```

---

## terminal.js — ANSI Dashboard

Read-only, non-interactive terminal display using box-drawing characters.

### How It Differs From cli.js

| Aspect | cli.js | terminal.js |
|--------|--------|-------------|
| Output format | JSON | ANSI-colored box art |
| Audience | Agents / scripts | Humans |
| Interactivity | None | None |
| Activity parsing | Uses `parseActivityLog` from parsers.js | Uses `parseActivityLog(..., { dateFormat: 'compact', limit: 2 })` |

### Internal Structure

```
terminal.js
├── Config loader (loadConfig)
├── parseActivityLog(..., { dateFormat: 'compact', limit: 2 })
├── ANSI helpers (bold, dim, italic, cyan, yellow, green)
├── Layout helpers (boxLine, boxTop, boxBottom, boxDivider, boxSeparator, pad, truncate)
└── Main render loop
    ├── Header (SCRIBULAR DISPATCH + stage)
    ├── Per-repo section (name, git status, task count, task list, activity)
    └── Footer (totals + date)
```

---

## Data Flow Summary

```
config.json
    │
    ▼
loadConfig(dispatchRootDir)
    │
    ├──► parseTaskFile(todo.md)      ──► { sections, openCount, doneCount }
    ├──► parseActivityLog(activity-log.md) ──► { stage, entries }
    ├──► getGitInfo(repoPath)        ──► { branch, dirtyCount }
    └──► parseJobDir(.dispatch/jobs/) ──► [{ id, status, progress, results, ... }]
             │
             ├──► cli.js     → JSON stdout
             ├──► terminal.js → ANSI box art
             └──► server.js  → Express REST API → React SPA
```

All write operations (`writeTaskDone`, `writeTaskAdd`, etc.) go through `parsers.js` and are consumed by both `cli.js` (write commands) and `dashboard/server.js` (POST endpoints).

The CLI command surface still uses `swarm` for compatibility, but the dashboard/server side has standardized on jobs (`.dispatch/jobs`, `/api/jobs`).

### Schedule Data Flow

```
schedules.json
    │
    ▼
loadSchedules(dispatchRoot) ──► generateCrontabBlock() ──► syncCrontab()
    │                                                         │
    ▼                                                         ▼
cli.js schedule run <id>  ◄──────────── system crontab (fenced block)
    │
    ├── acquireScheduleLock()  ──► .dispatch/runtime/schedule-locks/<id>.lock
    ├── appendScheduleEvent()  ──► .dispatch/runtime/schedule-events.json
    ├── scheduleLogPath()      ──► .dispatch/runtime/schedule-logs/<id>.log
    │
    ├── [type=job]    ──► execFileSync('claude') ──► output → schedule log
    ├── [type=prompt] ──► execFileSync('claude') ──► output → schedule log
    ├── [type=shell]  ──► execFileSync('bash')   ──► output → schedule log
    └── [type=loop]   ──► spawnSync('bash', [script])
                            │
                            └──► <repo>/.dispatch/loops/<loopType>/<timestamp>/
                                  ├── loop.log       (full output via tee)
                                  ├── status.txt     (completion/failure status)
                                  ├── prompt.md      (prompt snapshot)
                                  ├── phase_iter*.txt   (per-iteration output)
                                  └── review_iter*.txt  (per-iteration reviews)
                                  │
                                  └──► schedule log gets "Loop log: <path>" pointer
                                       (dashboard inlines loop.log at read time)
```

Schedule logs for non-loop types contain the full captured output between run header/footer markers. For loop types, the schedule log contains only the header, a `Loop log:` pointer to the loop's own log file, and the footer — the dashboard API inlines the referenced content when serving `/api/schedule-logs/:id`.
