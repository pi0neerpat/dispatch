# Swarm Task: Clicking a job should take me to the terminal tab if active, and the review tab if complete/needing review
Started: 2026-03-18 17:56:22
Status: Complete
Validation: Validated
OriginalTask: Clicking a job should take me to the terminal tab if active, and the review tab if complete/needing review
Repo: hub
Session: session-1773856581687
Model: claude-opus-4-6
MaxTurns: 10
BaseBranch: github-integration

## Progress
- [2026-03-18 17:56:22] Task initiated from dashboard
- [2026-03-18 17:56:30] Read JobDetailView.jsx, identified that `view` state defaults to `'review'` and never resets on jobId change
- [2026-03-18 17:56:35] Added `useEffect` import and effect hook that checks `agentTerminals.get(jobId).ptySessionId` on jobId change
- [2026-03-18 17:56:40] Verified final file structure is correct

## Results
Modified `dashboard/src/components/JobDetailView.jsx`:
1. Added `useEffect` to the React import
2. Added a `useEffect` hook that runs when `jobId` changes:
   - If `agentTerminals.get(jobId)` exists and has a truthy `ptySessionId`, sets view to `'terminal'`
   - Otherwise sets view to `'review'`
3. The dependency array is `[jobId]` only (not `agentTerminals`) since we want this to trigger on job selection, not on terminal state changes mid-session
