# Swarm Task: Add validate/reject buttons to SwarmPanel
Started: 2026-03-11
Status: Completed
Validation: Validated

## Progress
- Read SwarmPanel.jsx, App.jsx, usePolling.js, and server.js endpoints
- Confirmed backend API: POST /api/jobs/:id/validate and /api/jobs/:id/reject exist
- Confirmed usePolling hook exposes `refresh` function
- Confirmed API returns { success, id, validation, taskName }
- Added `onSwarmRefresh` prop to AgentCard and SwarmPanel
- Added state variables: showRejectInput, rejectNotes, actionLoading, feedback
- Added handleValidate() and handleReject() async handler functions
- Added canAct computed flag (shows buttons only for needs_validation or none)
- Added green Validate button with CheckCircle icon
- Added red Reject button with XCircle icon that toggles inline notes input
- Added inline reject input with Submit and Cancel buttons, Enter key support
- Added feedback flash message (auto-clears after 2s) for success/error states
- Built successfully with `vite build` -- no errors

## Results
All changes in `dashboard/src/components/SwarmPanel.jsx`:

1. **AgentCard** now accepts `onSwarmRefresh` prop and has 4 new state vars for the action UI
2. **Validate button** (green, CheckCircle icon) -- POSTs to `/api/jobs/:id/validate`, updates local detail state, calls `onSwarmRefresh()`, shows "Validated" flash
3. **Reject button** (red, XCircle icon) -- toggles inline text input; Submit POSTs to `/api/jobs/:id/reject` with notes, updates local state, calls `onSwarmRefresh()`, shows "Rejected" flash
4. **Reject notes input** -- inline with Submit/Cancel buttons, supports Enter key, placeholder "Reason for rejection (required)", auto-focused
5. **Feedback flash** -- state-driven div that auto-clears after 2s, green for success, red for errors
6. **canAct guard** -- buttons only shown when validation is `needs_validation` or `none` AND detail hasn't already been validated/rejected locally
7. **SwarmPanel** accepts `onSwarmRefresh` prop and passes it to each AgentCard

**Note:** App.jsx was NOT edited per instructions. The user will wire `onSwarmRefresh={swarm.refresh}` in App.jsx themselves.

## Validation
Build passes. No new dependencies added. Consistent with existing dark theme using CSS variables (--status-active, --status-failed) and Tailwind utility classes (bg-status-active-bg, border-status-failed-border, etc.).
