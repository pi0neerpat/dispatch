# Swarm Task: Create CLAUDE.md
Started: 2026-03-11
Status: Complete
Validation: Validated

## Progress
- [2026-03-11] Starting task — reading key files to understand codebase
- [2026-03-11] Read config.json, parsers.js, cli.js, terminal.js, dashboard/server.js, dashboard/package.json
- [2026-03-11] Read clauffice/install.sh, clauffice/CLAUDE.md, activity-log.md, todo.md
- [2026-03-11] Read dashboard/vite.config.js, checked .claude/ directory structure
- [2026-03-11] Wrote CLAUDE.md at repo root

## Results
Created `/Volumes/My Shared Files/scribular/hub/CLAUDE.md` with 7 sections:
1. Project overview — what the hub is and the 4 repos it coordinates
2. Architecture — data flow diagram showing parsers.js as shared layer feeding CLI, terminal, and dashboard
3. Key files — descriptions of config.json, parsers.js, cli.js, terminal.js, dashboard/, clauffice/
4. Running things — exact commands for CLI, terminal dashboard, and web dashboard
5. Conventions — JS style (CommonJS root, ESM dashboard), output formats, task/activity/swarm file formats
6. Rules — .claude/ is read-only, config.json is source of truth, parsers.js is shared, swarm file naming, no TypeScript, no external deps at root


## Validation Notes
- [2026-03-11] Needs to include write command examples in the CLAUDE.md
- [2026-03-11] CLAUDE.md created with accurate architecture docs, key files, conventions, and rules. Verified by reading output.