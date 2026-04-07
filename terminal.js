#!/usr/bin/env node
// Human-friendly ANSI terminal dashboard.
// For agent/JSON output, use cli.js instead.
//
// alias hub-term='node "/Volumes/My Shared Files/scribular/hub/terminal.js"'

const path = require('path');
const { parseTaskFile, parseActivityLog, getGitInfo, loadConfig } = require('./parsers');

const DISPATCH_ROOT = path.dirname(__filename);
const config = loadConfig(DISPATCH_ROOT);
const COLS = Math.min(Math.max(process.stdout.columns || 70, 50), 72);

// ── ANSI helpers ──────────────────────────────────────────────
const c = {
  bold:    s => `\x1b[1m${s}\x1b[22m`,
  dim:     s => `\x1b[2m${s}\x1b[22m`,
  italic:  s => `\x1b[3m${s}\x1b[23m`,
  cyan:    s => `\x1b[36m${s}\x1b[39m`,
  yellow:  s => `\x1b[33m${s}\x1b[39m`,
  green:   s => `\x1b[32m${s}\x1b[39m`,
  reset:   '\x1b[0m',
};

// ── Layout helpers ────────────────────────────────────────────
const innerW = COLS - 4;

function pad(text, width) {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  const need = width - stripped.length;
  return need > 0 ? text + ' '.repeat(need) : text;
}

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

function boxLine(content) {
  return `\x1b[2m\u2502\x1b[22m  ${pad(content, innerW)}  \x1b[2m\u2502\x1b[22m`;
}

function boxTop() {
  return c.dim(`\u250C${'─'.repeat(COLS - 2)}\u2510`);
}

function boxBottom() {
  return c.dim(`\u2514${'─'.repeat(COLS - 2)}\u2518`);
}

function boxDivider() {
  return c.dim(`\u251C${'─'.repeat(COLS - 2)}\u2524`);
}

function boxSeparator() {
  const dashes = '\u2500 '.repeat(Math.floor((innerW) / 2));
  return boxLine(c.dim(dashes.slice(0, innerW)));
}

// ── Main ──────────────────────────────────────────────────────
const repos = config.repos.map(repo => {
  const rp = repo.resolvedPath;
  const tasks = parseTaskFile(path.join(rp, repo.taskFile));
  const activity = parseActivityLog(path.join(rp, repo.activityFile), { dateFormat: 'compact', limit: 2 });
  const git = getGitInfo(rp);
  return { ...repo, repoPath: rp, tasks, activity, git };
});

const totalOpen = repos.reduce((s, r) => s + r.tasks.openCount, 0);
const totalDone = repos.reduce((s, r) => s + r.tasks.doneCount, 0);
const stage = repos.find(r => r.activity.stage)?.activity.stage || '';

const out = [];
out.push(boxTop());
out.push(boxLine(c.bold('SCRIBULAR DISPATCH')));
if (stage) out.push(boxLine(c.cyan(`Stage: ${stage}`)));
out.push(boxDivider());
out.push(boxLine(''));

const taskMaxW = innerW - 7;

repos.forEach((repo, i) => {
  const name = c.bold(repo.name.toUpperCase());
  const dirtyLabel = repo.git.dirtyCount > 0
    ? c.yellow(`${repo.git.dirtyCount} dirty`)
    : c.green('clean');
  const gitPart = `${repo.git.branch} \u00B7 ${dirtyLabel}`;
  const taskPart = `${repo.tasks.openCount} open \u00B7 ${repo.tasks.doneCount} done`;

  const nameStripped = repo.name.toUpperCase();
  const gitStripped = `${repo.git.branch} \u00B7 ${repo.git.dirtyCount > 0 ? `${repo.git.dirtyCount} dirty` : 'clean'}`;
  const taskStripped = `${repo.tasks.openCount} open \u00B7 ${repo.tasks.doneCount} done`;
  const usedLen = nameStripped.length + 2 + gitStripped.length + taskStripped.length;
  const gap = Math.max(innerW - usedLen, 4);

  out.push(boxLine(`${name}  ${gitPart}${' '.repeat(gap)}${taskPart}`));

  const sections = repo.tasks.sections;
  if (sections.length > 0) {
    out.push(boxLine(c.dim(`\u250C${'─'.repeat(innerW - 2)}`)));
    for (const section of sections) {
      if (sections.length > 1 || section.name) {
        out.push(boxLine(`\u2502 ${c.dim(c.italic(section.name))}`));
      }
      for (const task of section.tasks) {
        const taskText = truncate(task.text, taskMaxW);
        out.push(boxLine(`\u2502  \u25A1 ${taskText}`));
      }
    }
    out.push(boxLine(c.dim(`\u2514${'─'.repeat(innerW - 2)}`)));
  }

  for (const entry of repo.activity.entries) {
    if (entry.bullet) {
      const entryText = truncate(`${entry.date} \u2014 ${entry.bullet}`, innerW);
      out.push(boxLine(entryText));
    }
  }

  out.push(boxLine(''));

  if (i < repos.length - 1) {
    out.push(boxSeparator());
    out.push(boxLine(''));
  }
});

out.push(boxDivider());
const today = new Date();
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dateStr = `${months[today.getMonth()]} ${today.getDate()} ${today.getFullYear()}`;
out.push(boxLine(c.bold(`${totalOpen} open \u00B7 ${totalDone} done \u00B7 ${repos.length} repos \u00B7 ${dateStr}`)));
out.push(boxBottom());

console.log(out.join('\n'));
