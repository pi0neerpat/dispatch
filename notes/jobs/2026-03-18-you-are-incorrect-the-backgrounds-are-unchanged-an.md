# Swarm Task: Fix dropdown backgrounds to be opaque
Started: 2026-03-18
Status: Complete
Validation: Validated
Skills: frontend-design

## Progress
- Read HeaderBar.jsx and AllTasksView.jsx to identify the three problem areas
- Changed search input background from `bg-card/50` to `bg-card` (removing 50% opacity)
- Changed search results dropdown from `bg-background-raised` to `bg-secondary` and fixed border class from `border-card-border` to `border-border`
- Changed repo dropdown in AllTasksView from `bg-card` to `bg-secondary`

## Results
Three edits made across two files:

1. **HeaderBar.jsx line 109** -- Search input: `bg-card/50` -> `bg-card` (fully opaque)
2. **HeaderBar.jsx line 128** -- Search results dropdown: `bg-background-raised` -> `bg-secondary` (#282930), border class fixed to `border-border`
3. **AllTasksView.jsx line 324** -- Repo dropdown: `bg-card` -> `bg-secondary` (#282930)

All dropdowns now use `bg-secondary` which is visually distinct from the base background (`#1c1d21`) and `bg-card` (`#222328`), making them clearly elevated above the page.
