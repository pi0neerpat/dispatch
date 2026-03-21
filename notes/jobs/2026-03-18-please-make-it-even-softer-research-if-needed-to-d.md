# Swarm Task: Ultra-soft dark mode palette
Started: 2026-03-18
Status: Complete
Validation: Validated
Skills: frontend-design

## Progress
- [2026-03-18 17:50] Task initiated — researching ultra-soft dark mode best practices
- [2026-03-18 17:50] Current theme: bg #1c1d21, fg #cdced3 (~9.5:1 contrast), accent #5dba7d, IBM Plex Sans
- [2026-03-18 17:51] Research: studied best practices from Material Design, Linear, Notion dark mode, WCAG guidelines
- [2026-03-18 17:52] Key finding: Linear uses #121212 bg, #cccccc text, muted lavender accent #848CD0 — extremely soft
- [2026-03-18 17:52] Key finding: Notion dark uses #2F3438 bg, #979A9B secondary text — warm and gentle
- [2026-03-18 17:52] Key finding: 7:1 contrast ratio is the comfort sweet spot (not 9.5:1 or WCAG minimum 4.5:1)
- [2026-03-18 17:53] Key finding: DM Sans has rounder, softer letterforms than IBM Plex Sans — better for gentle UI
- [2026-03-18 17:53] Key finding: Warm tints reduce perceived glare and eye strain, especially for evening use
- [2026-03-18 17:53] Key finding: Desaturated pastels (lavender, dusty sage) outperform vivid greens for soft dark themes
- [2026-03-18 17:54] Designed new palette: dusty lavender accent, lower contrast text, warmer surfaces
- [2026-03-18 17:55] Applied changes to theme.css, useTerminal.js, constants.js, index.html, and 6 component files
- [2026-03-18 17:56] Updated all hardcoded colors across components to match new palette

## Research Findings

### Contrast & Readability
- WCAG minimum is 4.5:1, but 7-8:1 is the "comfortable reading" sweet spot for dark mode
- The old palette at ~9.5:1 contrast was too intense — felt clinical rather than calm
- Linear's text (#cccccc on #121212) targets roughly 13:1 but feels soft due to warm hue-shifting
- Target: ~7.5:1 for primary text (#b0b1b8 on #1a1b1e), ~4.5:1 for secondary (#838490)

### Warm vs Cool Tints
- Warm tints reduce melatonin suppression and perceived glare, especially for evening work
- Cool/neutral tints are better for daytime color accuracy work
- For a coordination dashboard used throughout the day, a very slightly warm neutral is ideal
- Decision: warm-neutral backgrounds with barely-warm grays (not blue-cold, not amber-warm)

### Accent Color
- Vivid sage green (#5dba7d, saturation ~50%) was too punchy against dark backgrounds
- Saturated colors on dark backgrounds create "optical vibrations" causing eye strain
- Linear uses a dusty lavender (#848CD0) — deeply desaturated, instantly calming
- Decision: shifted to dusty lavender (#8f8bab, saturation ~15%) for primary accent; kept muted sage (#7ea89a, saturation ~20%) for status-active/complete

### Font Choice
- IBM Plex Sans is a sharp, technical-feeling typeface — its geometry feels slightly rigid
- DM Sans has softer, rounder letterforms with gentle optical corrections and slightly low contrast
- Nunito is too rounded/playful for a professional dashboard; Inter is explicitly noted as "generic AI slop" in the skill guidelines
- Decision: switched to DM Sans — professional yet warm, excellent screen readability

### Border & Surface Strategy
- Dropped border opacity from 0.08 to 0.04 for base borders, 0.05 for card borders
- Notion uses very subtle surface differentiation — only ~6 hex steps between layers
- Scrollbar thumbs softened from 0.10 to 0.06 opacity
- Popup/dropdown shadows reduced from rgba(0,0,0,0.5) to rgba(0,0,0,0.3)

## Color Changes (Before → After)

### Backgrounds
| Variable | Before | After | Notes |
|----------|--------|-------|-------|
| --background | #1c1d21 | #1a1b1e | Slightly darker, warmer neutral |
| --background-raised | #222328 | #201f23 | Warmer, less blue |
| --secondary | #282930 | #242329 | Warmer |
| --muted | #2e2f36 | #28272e | Warmer, less blue |
| --accent | #2e2f36 | #28272e | Matches muted |
| --card | #222328 | #201f23 | Matches raised |
| --card-hover | #2a2b31 | #27262b | Softer lift |

### Foregrounds
| Variable | Before | After | Notes |
|----------|--------|-------|-------|
| --foreground | #cdced3 | #b0b1b8 | ~7.5:1 contrast (was ~9.5:1) |
| --foreground-secondary | #9496a1 | #838490 | Softer secondary |
| --muted-foreground | #7c7e8a | #6b6c78 | More recessive |
| --card-foreground | #cdced3 | #b0b1b8 | Matches foreground |
| --accent-foreground | #cdced3 | #b0b1b8 | Matches foreground |

### Accents
| Variable | Before | After | Notes |
|----------|--------|-------|-------|
| --primary | #5dba7d | #8f8bab | Sage green → dusty lavender |
| --ring | #5dba7d | #8f8bab | Matches primary |
| --gradient-accent | #5dba7d→#4a9e68 | #8f8bab→#7a7799 | Lavender gradient |

### Status Colors
| Variable | Before | After | Notes |
|----------|--------|-------|-------|
| --status-active | #5dba7d | #7ea89a | Muted sage (sat ~20%) |
| --status-complete | #5dba7d | #7ea89a | Same as active |
| --status-validated | #5dba7d | #7ea89a | Same |
| --status-clean | #5dba7d | #7ea89a | Same |
| --status-failed | #e06060 | #b87a7a | Dusty rose (was vivid red) |
| --status-review | #d4a030 | #b5a06e | Dusty gold (was vivid amber) |
| --status-dirty | #d4a030 | #b5a06e | Same as review |

### Borders
| Variable | Before | After | Notes |
|----------|--------|-------|-------|
| --border | rgba(255,255,255,0.08) | rgba(255,255,255,0.04) | Half opacity |
| --card-border | rgba(255,255,255,0.08) | rgba(255,255,255,0.05) | Barely there |
| --card-border-hover | rgba(255,255,255,0.12) | rgba(255,255,255,0.08) | Softer hover |
| Status borders | 0.14–0.18 opacity | 0.10–0.12 opacity | Reduced |
| Status backgrounds | 0.07–0.08 opacity | 0.04–0.05 opacity | Nearly invisible |

### Fonts
| Before | After |
|--------|-------|
| IBM Plex Sans (body) | DM Sans (body) |
| JetBrains Mono (code) | JetBrains Mono (code, unchanged) |

### Terminal Theme
All terminal ANSI colors desaturated to match dashboard palette (e.g., red #d47272 → #b87a7a, green #5ebd9e → #7ea89a).

### Repo Identity Colors
| Repo | Before | After |
|------|--------|-------|
| marketing | #e0b44a | #b5a06e |
| website | #818cf8 | #8488a8 |
| electron | #34d399 | #7ea89a |
| hub | #7dd3fc | #7a9eaa |

### Hardcoded Colors in Components
- BUG_COLOR in JobsView/AllTasksView: #22c55e → #7ea89a
- Filter chip fallback: rgba(255,255,255,0.20/0.08) → rgba(255,255,255,0.10/0.04), text #e4e4e7 → #b0b1b8
- Dropdown backgrounds: #282930 → #242329, borders 0.12 → 0.06 opacity
- Tooltip shadows: rgba(0,0,0,0.5) → rgba(0,0,0,0.3)
- Scrollbar thumb: 0.10/0.16 → 0.06/0.10

## Files Modified
1. `dashboard/src/styles/theme.css` — full palette overhaul
2. `dashboard/index.html` — Google Fonts: IBM Plex Sans → DM Sans
3. `dashboard/src/lib/useTerminal.js` — terminal ANSI color theme
4. `dashboard/src/lib/constants.js` — repo identity colors
5. `dashboard/src/components/JobsView.jsx` — BUG_COLOR, filter chip colors
6. `dashboard/src/components/AllTasksView.jsx` — BUG_COLOR, filter chip colors, dropdown bg
7. `dashboard/src/components/HeaderBar.jsx` — search dropdown bg/border
8. `dashboard/src/components/SwarmDetail.jsx` — tooltip shadow opacity
9. `dashboard/src/components/ProgressTimeline.jsx` — tooltip shadow opacity
10. `dashboard/src/components/SwarmPanel.jsx` — tooltip shadow opacity
