# Skill: `/jobs` — Launch Parallel Sub-Agents

Launch multiple sub-agents from an explicit task list. Each agent runs in parallel with full tool access.

---

## Input Format

Accept a numbered or bulleted list of tasks. Each task is one line describing the work.

```
/jobs
1. Audit the API error handling in the backend
2. Write tests for the auth module
3. Update the README with new setup instructions
```

If fewer than 2 tasks are provided, do the task directly — no point spawning one agent.

---

## Execution Steps

### A. Parse Tasks

Extract each line as a separate task. Strip numbering/bullets. If fewer than 2, continue with:
"Only 1 task — I will just do it directly, no need for sub-agents."

### B. Pre-Flight Summary (MANDATORY)

**Always** present a pre-flight summary before launching. Never skip this.

```
## Job Pre-Flight

### Task 1: Audit API error handling
  Tools: Read, Grep, Bash
  Flags: None — ready to run

### Task 2: Write tests for auth module
  Tools: Read, Write, Bash
  Flags: None — ready to run

### Task 3: Update README
  Tools: Read, Write
  Flags: None — ready to run

Ready to launch: 3 of 3 tasks. Proceed?
```

Wait for user confirmation before launching.

### C. Context Gathering

For approved tasks, gather relevant context:

```bash
node cli.js tasks
```

Also read any files specifically referenced in the task descriptions.

### D. Construct Prompts

For each task, build a **self-contained** prompt that includes:
- The task description
- Working directory (which repo)
- Key context the sub-agent needs
- Clear deliverable: what the agent should produce or do
- **Progress file** (CRITICAL — see below)

Sub-agents don't see conversation history — every prompt must be fully self-contained.

#### Progress File (MANDATORY)

Every sub-agent prompt MUST include a progress file instruction. Sub-agent work is ephemeral —
if the process dies, all work in memory is lost. The progress file is the only durable record.

Assign each task a progress file path: `notes/jobs/<date>-<task-slug>.md`
(e.g. `notes/jobs/2026-03-10-audit-api-errors.md`).

Include this in every sub-agent prompt:

```
## CRITICAL: Progress File

You MUST write your progress to `<path>` as you work. This is non-negotiable.

- Write the file IMMEDIATELY when you start, with a header and "Status: In progress"
- UPDATE the file after each meaningful step
- Write findings AS YOU DISCOVER THEM — do not accumulate results in memory to write later
- The file is your only durable output. If your process dies, anything not written is LOST.
- At the end, update status to "Status: Complete" and add a summary section.

Format:
# Job Task: <task name>
Started: <timestamp>
Status: In progress | Complete | Failed

## Progress
- [timestamp] Step description and findings...

## Results
<final output when done>
```

Before launching, create the `notes/jobs/` directory if it doesn't exist.

### E. Select Agent Type

| Task type | Agent type |
|-----------|-----------|
| Most tasks (research, drafting, coding) | `general-purpose` |
| Pure research, no writes needed | `Explore` |

### F. Launch in Parallel

All `Task` tool calls go in a **single message**. Each with:
- `subagent_type`: selected per task (step E)
- `prompt`: the self-contained prompt from step D
- `description`: 3-5 word summary
- `run_in_background: true` for tasks expected to take >2 minutes

### G. Collect and Present Results

After all agents return, check their status:

```bash
node cli.js swarm
```

Present a unified summary:

```
## Job Results

### Task 1: Audit API error handling
[Summary of findings from the agent]

### Task 2: Write tests for auth module
[Summary — what was written, where it was saved]

---
3 tasks completed. [Note any that failed or need follow-up.]
```

---

## Key Rules

1. **Progress files are mandatory** — every sub-agent MUST write incrementally to its progress file. Work that only exists in agent memory is work that can be lost.
2. **Write early, write often** — sub-agents must write the progress file at the START (not the end), and update after each meaningful step.
3. **Maximum 5 parallel agents** — more risks overwhelming the system
4. **Each prompt must be self-contained** — sub-agents don't see conversation history
5. **Pre-flight is mandatory** — always show the task breakdown before launching
6. **Never launch tasks that publish/send** — tasks that post externally, send messages, or make purchases must be flagged. The sub-agent should draft but not publish.
7. **Don't duplicate work** — if a task overlaps with what the main conversation already did, skip it
8. **Run in background for long tasks** — use `run_in_background: true` for tasks expected to take >2 minutes
