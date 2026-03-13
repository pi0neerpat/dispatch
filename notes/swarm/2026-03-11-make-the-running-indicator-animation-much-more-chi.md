# Swarm Task: Make running indicator animations more chill
Started: 2026-03-11
Status: Complete
Skills: frontend-design

## Progress
- [2026-03-11] Read all relevant files. Identified changes needed in theme.css and 6 component files.
- [2026-03-11] theme.css: Slowed down pulse-soft (2s->4s), glow-pulse (2.5s->5s), spin-slow (3s->6s), ping-slow (2.5s->4s, scale 2->1.6), pulse-soft opacity (0.5->0.65)
- [2026-03-11] SwarmDetail.jsx: Changed 2 standalone `animate-spin` to `animate-spin-slow` (loading spinner line 129, kill button spinner line 224). Left conditional status-based `animate-spin-slow` on line 169 untouched.
- [2026-03-11] ResultsPanel.jsx: Changed 3 standalone `animate-spin` to `animate-spin-slow` (loading spinner line 281, kill button line 359, markDone button line 428). Left conditional status-based `animate-spin-slow` on line 315 untouched.
- [2026-03-11] TaskBoard.jsx: Changed 6 standalone `animate-spin` to `animate-spin-slow` (checkpoint dismiss line 75, checkpoint create line 121, being-worked indicator line 495, completing task line 505, save edit line 535, add task line 729).
- [2026-03-11] TerminalPanel.jsx: Changed 1 standalone `animate-spin` to `animate-spin-slow` (chat send button line 439).
- [2026-03-11] RightPanel.jsx: Changed 2 standalone `animate-spin` to `animate-spin-slow` (progress timeline loader line 73, activity feed loader line 183).
- [2026-03-11] RepoStatus.jsx: Changed 2 standalone `animate-spin` to `animate-spin-slow` (checkpoint dismiss line 121, checkpoint create line 164).
- [2026-03-11] Verified no remaining standalone `animate-spin` in dashboard/src. All conditional `animate-spin-slow` usages in SwarmDetail, SwarmPanel, and ResultsPanel were already correct and untouched.

## Results
All animation speeds have been slowed down for a more relaxed, chill feel:

**theme.css changes:**
- `animate-pulse-soft`: 2s -> 4s (gentle breathing effect)
- `pulse-soft` keyframe opacity: 0.5 -> 0.65 (subtler dimming)
- `animate-glow-pulse`: 2.5s -> 5s (slow glow)
- `animate-spin-slow`: 3s -> 6s (very lazy rotation)
- `animate-ping-slow`: 2.5s -> 4s, scale 2 -> 1.6 (gentler expansion)

**Component changes (16 total replacements across 6 files):**
- All standalone `animate-spin` (Tailwind default 1s) on Loader/Loader2 icons replaced with `animate-spin-slow` (now 6s)
- Entrance animation delays (`animationDelay` stagger patterns) were NOT changed
- Conditional status-based `animate-spin-slow` patterns were already correct and left untouched
