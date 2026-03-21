# Swarm Task: Investigate "kill marks as validated" bug
Started: 2026-03-18
Status: Complete
Validation: Rejected

## Progress

- [x] Read and understand `writeSwarmStatus` in `parsers.js`
- [x] Read PTY `onExit` handler and session DELETE endpoint in `server.js`
- [x] Read `/api/jobs/init` handler in `server.js`
- [ ] Document root cause
- [ ] Implement fix in `parsers.js`
- [ ] Add explicit `Validation: none` to swarm init template in `server.js`
- [ ] Update progress file with results

## Investigation

### Bug Report
User hit "Kill" on the terminal for job "Time and Status filter chips" but it showed as "Validated" instead of "Killed".

### Reading key files now...


## Validation Notes
- [2026-03-18] dnc