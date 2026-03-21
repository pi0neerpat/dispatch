# Swarm Task: Create Coding Standards
Started: 2026-03-11
Status: Complete
Validation: Validated

## Progress
- [2026-03-11] Starting task — reading codebase to extract real patterns
- [2026-03-11] Read all 10 specified source files (parsers.js, cli.js, terminal.js, config.json, server.js, App.jsx, SwarmPanel.jsx, usePolling.js, vite.config.js, dashboard/package.json)
- [2026-03-11] Read supplementary files (utils.js, theme.css, tailwind.css, .gitignore, swarm example files)
- [2026-03-11] Extracted patterns: CommonJS for hub core, ESM for dashboard, zero deps in core, Tailwind v4 with CSS custom properties, functional React components, usePolling hook pattern, cn() utility, error handling via empty catch blocks returning defaults
- [2026-03-11] Created docs/ directory and wrote docs/coding-standards.md (10 sections, ~350 lines)
- [2026-03-11] Task complete

## Results
Created `/Volumes/My Shared Files/scribular/hub/docs/coding-standards.md` — a comprehensive coding standards document with 10 sections covering:

1. General Principles (simplicity, zero deps, graceful failure, agent-first design)
2. JavaScript Standards (CommonJS vs ESM, const/let, destructuring, semicolon conventions)
3. File Organization (hub core structure, parsers as single source of truth)
4. Dashboard Standards (functional components, usePolling, Tailwind v4, cn(), lucide-react)
5. API Design (CLI JSON output, Express endpoints, polling intervals)
6. Data Contracts (config.json, task files, activity logs, swarm files — with format specs)
7. Git Conventions (commit messages, branch naming, gitignore rules)
8. Naming Conventions (files, functions, components, CSS vars, config keys)
9. CSS and Theming (Tailwind v4 architecture, color system, fonts)
10. Testing and Validation (manual verification approach)

All standards were extracted from actual code patterns in the repository, not invented.


## Validation Notes
- [2026-03-11] Standards look comprehensive and match codebase patterns