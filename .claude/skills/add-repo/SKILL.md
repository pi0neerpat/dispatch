---
name: add-repo
description: Add a new repository to the Work.Down hub. Updates config.json and scaffolds todo.md and activity-log.md in the target repo if they don't exist. Use when someone says "add a repo", "track a new repo", "connect a repo", or invokes /add-repo.
argument-hint: [repo-name or path]
allowed-tools: Read, Write, Edit, Bash(ls *), Bash(test *), Bash(node *)
---

# /add-repo — Add a Repository to the Hub

Add a new repo to `config.json` and scaffold its tracking files if they don't exist yet.

**Reference:** [references/formats.md](references/formats.md) — config.json schema, todo.md format, activity-log.md format. Read this before writing any files.

---

## Step 1: Read current config

```bash
node cli.js config
```

This shows all currently registered repos and their resolved paths. Keep this in mind for duplicate detection and for understanding the existing `path` convention (e.g. `../repo-name`).

---

## Step 2: Gather repo info

If `$ARGUMENTS` was provided, try to infer the repo name or path from it. Otherwise ask:

> **To add a repo I need a few details:**
>
> 1. **Repo name** — short identifier for the dashboard (e.g. `backend`, `mobile`, `docs`)
> 2. **Path** — relative path from the hub root (e.g. `../my-backend`). I'll check whether this directory exists.
> 3. **Start script** — command to run the dev server (e.g. `npm run dev`), or skip if not applicable
> 4. **Test script** — command to run tests, or skip
> 5. **Cleanup script** — command to remove build artifacts, or skip

Ask all at once. Wait for answers before proceeding.

---

## Step 3: Validate

Run both checks:

**Check 1 — Path exists:**
```bash
test -d <resolved-path> && echo "exists" || echo "not found"
```
Where `<resolved-path>` is the path resolved from the hub root (e.g. if hub is at `/projects/hub` and path is `../backend`, check `/projects/backend`).

If the directory doesn't exist, stop and tell the user:
> "The directory `<path>` doesn't exist. Create the repo first, then run `/add-repo` again."

**Check 2 — Not already registered:**
Compare the provided name and path against the repos from Step 1. If either matches an existing entry, stop:
> "`<name>` is already registered in config.json (path: `<existing-path>`). Nothing to do."

---

## Step 4: Preview and confirm

Show a preview before making any changes:

```
## About to add:

config.json entry:
  name: <name>
  path: <path>
  startScript: <value or null>
  testScript: <value or null>
  cleanupScript: <value or null>

Files to create (only if missing):
  <resolved-path>/todo.md       — <exists / will create>
  <resolved-path>/activity-log.md  — <exists / will create>

Proceed? (yes / adjust details)
```

Wait for confirmation.

---

## Step 5: Update config.json

Read `config.json`, then add the new repo entry to the `repos` array — insert it before the `hub` entry (which should always be last).

Use the schema from [references/formats.md](references/formats.md). Set any unspecified scripts to `null`.

---

## Step 6: Scaffold missing files

Check each file and only create if it doesn't already exist:

**todo.md** — only if missing:
```bash
test -f <resolved-path>/todo.md && echo "exists" || echo "missing"
```

**activity-log.md** — only if missing:
```bash
test -f <resolved-path>/activity-log.md && echo "exists" || echo "missing"
```

Use the exact formats from [references/formats.md](references/formats.md). Use today's date in the activity log entry.

---

## Step 7: Confirm

Run the CLI to verify the repo was registered correctly:
```bash
node cli.js repos
```

Then report what was done:
```
Done. Added `<name>` to the hub.

  config.json — updated
  <path>/todo.md — <created / already existed, left unchanged>
  <path>/activity-log.md — <created / already existed, left unchanged>

Run `node cli.js status` to see it in the overview.
```

---

## Rules

- **Always read formats.md before writing files** — the exact format matters; parsers will silently fail on malformed files.
- **Never overwrite existing todo.md or activity-log.md** — only create them if missing. The user may have content there already.
- **Never modify or remove the `hub` entry** — it must always remain in `config.json` and always point to `.`.
- **Always confirm before writing** — show the preview in Step 4 and wait. Don't apply changes speculatively.
- **Null beats omitting** — always include `startScript`, `testScript`, `cleanupScript` in the config entry, even as `null`. Omitting them causes CLI errors.
- **hub entry goes last** — when inserting, place the new entry before the `hub` entry to keep it at the bottom of the list.
- **Self-improvement**: If the user corrects a format detail or says "never do X again", update the Rules section and/or `references/formats.md` immediately. If a new validation case comes up (e.g. a monorepo layout), add it as a rule.
