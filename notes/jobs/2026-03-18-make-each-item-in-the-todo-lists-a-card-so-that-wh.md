# Swarm Task: Make todo list items into editable cards with multi-line editing
Started: 2026-03-18
Status: Complete
Validation: Validated
Skills: frontend-design

## Progress
- [09:00] Read AllTasksView.jsx (496 lines) and constants.js. Component has flat task rows, no inline editing.
- [09:01] Starting implementation: adding editing state, textarea component, edit API call, new task textarea.
- [09:05] Added AutoGrowTextarea component with auto-resize via useLayoutEffect.
- [09:06] Added editingTaskKey/editText state and startEditing/handleEditSave/handleEditKeyDown functions.
- [09:07] Updated task card rendering: items-start layout, inline textarea editing on click, whitespace-pre-wrap for full text display.
- [09:08] Converted new task input from single-line input to AutoGrowTextarea with Ctrl+Enter submit.
- [09:09] Added keyboard hints (Esc to cancel, Ctrl+Enter to save) shown during editing.
- [09:10] Cleaned up unused Pencil import.

## Results
All changes made to `dashboard/src/components/AllTasksView.jsx`:

1. **AutoGrowTextarea component** (lines 97-124): Reusable textarea that auto-resizes to fit content using useLayoutEffect. Supports autoFocus, placeholder, and all standard textarea props.

2. **Inline editing state** (lines 207-241): `editingTaskKey` tracks which task is being edited by unique key. `editText` holds the current edit value. Three handler functions: `startEditing`, `handleEditSave` (calls POST /api/tasks/edit), `handleEditKeyDown` (Escape cancels, Ctrl/Cmd+Enter saves).

3. **Task card changes**:
   - Layout changed from `items-center` to `items-start` so multi-line text renders naturally
   - Removed `truncate` class, added `whitespace-pre-wrap` for full text display
   - Open tasks show clickable text (cursor-text, hover highlight) that opens a textarea on click
   - Editing state shows textarea with auto-grow, ring highlight on the card, and keyboard shortcut hints
   - Done tasks are not editable (no openTaskNum)
   - Start/View buttons hidden during editing to avoid accidental clicks

4. **New task input**: Converted from `<input type="text">` to AutoGrowTextarea for multi-line task creation with Ctrl/Cmd+Enter to submit.

## Validation
- Only open tasks with `openTaskNum` are editable
- Save triggers on blur or Ctrl/Cmd+Enter
- Cancel on Escape reverts to original text
- `onOverviewRefresh()` called after successful edit
- All existing functionality preserved: checkbox, status/repo/timeframe chips, Start/View buttons
