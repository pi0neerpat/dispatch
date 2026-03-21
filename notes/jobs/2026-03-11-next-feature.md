# Swarm Task: Find and Implement Next Feature
Started: 2026-03-11
Status: Complete
Validation: Validated

## Progress
- Read all feature sources: cli-plan.md, web-dashboard-plan.md, todo.md
- Read all current code: parsers.js, cli.js, terminal.js, dashboard/server.js, config.json
- Read sample todo.md (marketing) to understand task file format for writing
- Analyzed 5 candidate features, ranked by impact-to-effort ratio
- Chose feature: CLI write commands (tasks done, tasks add, swarm validate, swarm reject)
- Added 3 write functions to parsers.js: writeTaskDone, writeTaskAdd, writeSwarmValidation
- Updated cli.js: new subcommand routing, 4 write commands, updated USAGE string
- Added 4 POST endpoints to dashboard/server.js with express.json() middleware
- Tested all write commands successfully with actual node cli.js calls
- Tested all error handling (missing args, bad repo, bad task number, missing notes)
- Verified all existing read commands still work
- Verified terminal.js backward compatibility
- Updated todo.md (marked "Add write commands to CLI" as done via the new CLI itself)
- Updated activity-log.md with new entries

## Feature Analysis

### Candidates ranked by impact:
1. **CLI write commands** (CHOSEN) — HIGH impact, MEDIUM effort — closes the read/write loop
2. **Swarm validation commands** — included in #1
3. **Dashboard interactivity** — depends on #1, higher effort (React UI)
4. **Checkpoint/revert support** — complex git branch management
5. **Inter-agent communication** — overkill for current stage

### Decision rationale:
The CLI was read-only. Write commands are the foundation for everything else — dashboard
buttons, agent automation, and the review gate workflow all depend on being able to
modify tasks and swarm files programmatically. This single feature unlocks the entire
write side of the hub.

## Results

### Implemented: 4 CLI write commands + 4 REST API endpoints

**CLI commands:**
- `hub tasks done <repo> <num>` — marks the Nth open task as done in a repo's todo.md
- `hub tasks add <repo> "text" [--section=name]` — adds a new task, optionally in a named section
- `hub swarm validate <id> [--notes="..."]` — sets validation to "Validated" on a swarm file
- `hub swarm reject <id> --notes="reason"` — sets validation to "Rejected" with required notes

**REST API endpoints (dashboard/server.js):**
- `POST /api/tasks/done` — body: `{ repo, taskNum }`
- `POST /api/tasks/add` — body: `{ repo, text, section? }`
- `POST /api/jobs/:id/validate` — body: `{ notes? }`
- `POST /api/jobs/:id/reject` — body: `{ notes }`

**Parser functions (parsers.js):**
- `writeTaskDone(filePath, taskNum)` — finds Nth open task across all sections, toggles checkbox
- `writeTaskAdd(filePath, text, section)` — smart section matching, auto-detects numbered vs bullet format
- `writeSwarmValidation(filePath, status, notes)` — inserts/updates Validation: line and ## Validation Notes

### Files modified:
- `/Volumes/My Shared Files/scribular/hub/parsers.js` — added 3 write functions (~130 lines)
- `/Volumes/My Shared Files/scribular/hub/cli.js` — added 4 write commands + updated router/USAGE (~100 lines)
- `/Volumes/My Shared Files/scribular/hub/dashboard/server.js` — added 4 POST endpoints (~70 lines)
- `/Volumes/My Shared Files/scribular/hub/todo.md` — marked write commands task as done
- `/Volumes/My Shared Files/scribular/hub/activity-log.md` — added entries for today

### Verified:
- All 4 write commands work with real data
- All 6 read commands still work unchanged
- Terminal dashboard still works (backward compat)
- Error handling covers: missing args, bad repo name, bad task number, missing notes for reject
- Subcommand routing correctly dispatches `tasks done`/`tasks add` vs bare `tasks`


## Validation Notes
- [2026-03-11] CLI write commands implemented and tested. All 4 commands working: tasks done, tasks add, swarm validate, swarm reject. POST endpoints added to dashboard.