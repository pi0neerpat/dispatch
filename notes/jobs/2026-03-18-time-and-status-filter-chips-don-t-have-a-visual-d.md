# Swarm Task: Time and Status filter chips don't have a visual differentiation between active/inactive states
Started: 2026-03-18 15:28:09
Status: Complete
Validation: Validated
OriginalTask: Time and Status filter chips don't have a visual differentiation between active/inactive states
Repo: hub
Session: session-1773847689371
Model: claude-opus-4-6
MaxTurns: 10
BaseBranch: github-integration

## Progress
- [2026-03-18 15:28:09] Task initiated from dashboard
- [2026-03-18 15:28:30] Read both FilterChip copies in AllTasksView.jsx (line 77-92) and JobsView.jsx (line 41-56). Confirmed they are identical.
- [2026-03-18 15:28:35] Active state uses `bg-primary/12 border-primary/35 text-foreground` — the 12% bg opacity and 35% border opacity are too subtle against the dark card background (#1c1c1e).
- [2026-03-18 15:28:40] Applied fix to both files: increased active bg opacity from 12% to 20%, and active border opacity from 35% to 50%.
- [2026-03-18 15:28:50] Verified both files have matching changes.

## Results
Fixed the FilterChip active state visual differentiation in both files:

**Before:** `bg-primary/12 border-primary/35 text-foreground`
**After:** `bg-primary/20 border-primary/50 text-foreground`

Changes:
- `bg-primary/12` -> `bg-primary/20` (background opacity 12% -> 20%, ~67% more visible)
- `border-primary/35` -> `border-primary/50` (border opacity 35% -> 50%, noticeably stronger)

Files modified:
- `dashboard/src/components/AllTasksView.jsx` (line 84)
- `dashboard/src/components/JobsView.jsx` (line 48)

The inactive state (`bg-card border-border text-muted-foreground/60`) was left unchanged. The `color` prop inline style override for Bug/Repo chips was also left unchanged.
