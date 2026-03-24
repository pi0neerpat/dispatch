---
name: done
description: Mark a task done and log activity after completing work. Updates todo.md and activity-log.md for the relevant repo. Use when work is complete, user says "we're done", "log this", "mark that done", or invokes /done.
argument-hint: [what was completed]
allowed-tools: Read, Edit, Bash(node *)
---

# /done — Mark Work Done and Log Activity

After completing a task or session, update the repo's tracking files: mark the task done in `todo.md` and append an entry to `activity-log.md`.

---

## Step 1: Identify what was done

If `$ARGUMENTS` describes the completed work, use it. Otherwise scan the conversation for:
- What was built, fixed, or changed
- Which repo it was in

If it's still unclear, ask:
> "What did we just finish, and which repo?"

---

## Step 2: Identify the repo

Run:
```bash
node cli.js config
```

Match the work to the right repo. If it's obvious from context, skip asking. If ambiguous, ask the user which repo.

---

## Step 3: Find the matching task

Run:
```bash
node cli.js tasks --repo=<name>
```

Look for an open task that matches what was done. If found, note its text exactly.

If no matching task exists, skip the todo update — just log the activity.

---

## Step 4: Apply updates

**4a — Mark task done** (only if a match was found in Step 3):
```bash
node cli.js tasks done <repo> "<exact task text>"
```

**4b — Log to activity:**

Read the repo's `activity-log.md` to check if today's section exists, then use the Edit tool to:
- If today's `## YYYY-MM-DD` section exists: append a new `- **title** — description` bullet to it
- If not: insert a new section at the top (before the previous most-recent entry)

Format:
```markdown
## YYYY-MM-DD

- **Short title** — one sentence describing what was done
```

Keep the title to 4–6 words. Keep the description factual, not promotional.

---

## Step 5: Confirm

Report what was updated:
```
Done.
  todo.md       — marked "<task text>" complete  (or: no matching task found, skipped)
  activity-log.md — logged "<title>"
```

---

## Rules

- **Never overwrite or delete existing entries** — only append
- **Factual, not promotional** — "Fixed Safari login bug" not "Successfully resolved a critical cross-browser authentication issue"
- **Skip the todo update gracefully** if no matching open task is found — don't error, just log the activity
- **Today's date only** — always use today's date for the activity entry, never backdate
- **Self-improvement**: If the user corrects a format or says "never do X", update the Rules section immediately
