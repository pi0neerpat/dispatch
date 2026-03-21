# Swarm Task: Add start/test/cleanup scripts to config.json
Started: 2026-03-18
Status: Complete
Validation: Validated

## Progress
- Starting task: adding startScript, testScript, and cleanupScript to each repo in config.json
- Read current config.json — confirmed 4 repos with name, path, taskFile, activityFile fields
- Discovered scripts from each repo's package.json
- Updated config.json with all three script fields for each repo

## Results

Added `startScript`, `testScript`, and `cleanupScript` to each repo in `config.json`:

| Repo | startScript | testScript | cleanupScript |
|------|------------|-----------|--------------|
| marketing | `node index.js` | `null` | `rm -rf node_modules/.cache` |
| website | `npm run dev` | `npm run test` | `rm -rf .next` |
| electron | `npm run dev` | `npm run test` | `rm -rf dist build` |
| hub | `cd dashboard && yarn dev` | `null` | `cd dashboard && rm -rf dist node_modules/.vite` |

No changes needed to `parsers.js` — `loadConfig()` already spreads all config fields through via `...repo`.
