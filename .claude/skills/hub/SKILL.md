# /hub — Cross-Repo Task View & Work Prioritization

## Purpose

Provides a unified view of tasks, activity, and status across all configured repos.
Helps you decide what to work on next.

## When to Use

- User asks "what should I work on?"
- User asks for task status, priorities, or cross-repo view
- User invokes `/hub`

## Instructions

### Step 1: Get hub data

Run the hub CLI for structured JSON data:

```bash
node cli.js status
```

This returns JSON with: stage, all repos (git status, task counts, last activity), job summary, and totals.

For deeper task detail, also run:

```bash
node cli.js tasks
```

If there are active jobs, get their status:

```bash
node cli.js swarm
```

### Step 2: Present unified view

Format the output as:

```
## Cross-Repo Hub

### <repo-name> (<branch>, <clean/dirty>)
**Open tasks:** <count>
<list each open task with checkbox>

**Recent activity:**
- <date> — <summary>

---
(repeat for each repo)
```

If there are active job agents, add a section:

```
### Active Jobs
- <job-name>: <status> — <last progress>
```

### Step 3: Recommend next actions

Based on the data gathered, suggest what to work on next:

- Prioritize tasks that are explicitly marked high-priority
- Consider recency — repos that haven't been touched recently may need attention
- Consider dependencies — if a task in one repo depends on another, flag it

Present recommendations as a short bulleted list under a "**Suggested next:**" heading.

## Notes

- If a repo path doesn't exist or files are missing, skip it with a note ("repo not found — skipping")
- Keep the output scannable — use headers and bullets, not paragraphs
