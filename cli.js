#!/usr/bin/env node
/**
 * hub CLI — Agent-friendly data access for the Scribular coordination hub.
 * All output is JSON to stdout. Errors go to stderr as JSON.
 *
 * Usage:
 *   node hub/cli.js status              Full overview
 *   node hub/cli.js tasks [--repo=name] Open tasks across repos
 *   node hub/cli.js swarm [id]          Swarm agent status
 *   node hub/cli.js repos               Git status for all repos
 *   node hub/cli.js activity [--limit=N] Recent activity entries
 *   node hub/cli.js config              Raw hub config
 */

const path = require('path');
const { parseTaskFile, parseActivityLog, getGitInfo, parseSwarmFile, parseSwarmDir, loadConfig } = require('./parsers');

const HUB_DIR = path.dirname(__filename);

function fail(msg) {
  process.stderr.write(JSON.stringify({ error: msg }) + '\n');
  process.exit(1);
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

// Parse args
const args = process.argv.slice(2);
const command = args[0];
const flags = {};
for (const arg of args.slice(1)) {
  const m = arg.match(/^--([^=]+)=(.+)/);
  if (m) flags[m[1]] = m[2];
  else if (!arg.startsWith('--')) flags._positional = arg;
}

// Load config
let config;
try {
  config = loadConfig(HUB_DIR);
} catch {
  fail('hub/config.json not found or invalid');
}

// Gather repo data (lazy — only computed when needed)
function gatherRepos() {
  return config.repos.map(repo => {
    const rp = repo.resolvedPath;
    const tasks = parseTaskFile(path.join(rp, repo.taskFile));
    const activity = parseActivityLog(path.join(rp, repo.activityFile));
    const git = getGitInfo(rp);
    return { name: repo.name, resolvedPath: rp, tasks, activity, git };
  });
}

// Gather swarm data across all repos
function gatherSwarm() {
  const allAgents = [];
  for (const repo of config.repos) {
    const swarmDir = path.join(repo.resolvedPath, 'notes', 'swarm');
    const agents = parseSwarmDir(swarmDir);
    for (const agent of agents) {
      agent.repo = repo.name;
    }
    allAgents.push(...agents);
  }
  return allAgents;
}

function swarmSummary(agents) {
  let active = 0, completed = 0, failed = 0, needsValidation = 0;
  for (const a of agents) {
    if (a.status === 'in_progress') active++;
    else if (a.status === 'completed') completed++;
    else if (a.status === 'failed') failed++;
    if (a.validation === 'needs_validation') needsValidation++;
  }
  return { active, completed, failed, needsValidation };
}

// ── Commands ────────────────────────────────────────────────

function cmdStatus() {
  const repos = gatherRepos();
  const agents = gatherSwarm();
  const stage = repos.find(r => r.activity.stage)?.activity.stage || '';
  const totalOpen = repos.reduce((s, r) => s + r.tasks.openCount, 0);
  const totalDone = repos.reduce((s, r) => s + r.tasks.doneCount, 0);

  out({
    stage,
    repos: repos.map(r => ({
      name: r.name,
      git: r.git,
      tasks: { openCount: r.tasks.openCount, doneCount: r.tasks.doneCount },
      lastActivity: r.activity.entries[0] || null,
    })),
    swarm: swarmSummary(agents),
    totals: { openTasks: totalOpen, doneTasks: totalDone },
  });
}

function cmdTasks() {
  const repos = gatherRepos();
  const repoFilter = flags.repo;

  const filtered = repoFilter
    ? repos.filter(r => r.name === repoFilter)
    : repos;

  if (repoFilter && filtered.length === 0) {
    fail(`repo "${repoFilter}" not found in config`);
  }

  out({
    repos: filtered.map(r => ({
      name: r.name,
      sections: r.tasks.sections,
      openCount: r.tasks.openCount,
      doneCount: r.tasks.doneCount,
    })),
  });
}

function cmdSwarm() {
  const agents = gatherSwarm();
  const id = flags._positional;

  if (id) {
    const agent = agents.find(a => a.id === id);
    if (!agent) fail(`swarm agent "${id}" not found`);
    out({
      id: agent.id,
      repo: agent.repo,
      taskName: agent.taskName,
      started: agent.started,
      status: agent.status,
      validation: agent.validation,
      progressEntries: agent.progressEntries,
      results: agent.results,
      validationNotes: agent.validationNotes,
    });
  } else {
    out({
      agents: agents.map(a => ({
        id: a.id,
        repo: a.repo,
        taskName: a.taskName,
        started: a.started,
        status: a.status,
        validation: a.validation,
        lastProgress: a.lastProgress,
        progressCount: a.progressCount,
        durationMinutes: a.durationMinutes,
      })),
      summary: swarmSummary(agents),
    });
  }
}

function cmdRepos() {
  const repos = gatherRepos();
  out({
    repos: repos.map(r => ({
      name: r.name,
      branch: r.git.branch,
      dirtyCount: r.git.dirtyCount,
    })),
  });
}

function cmdActivity() {
  const repos = gatherRepos();
  const limit = parseInt(flags.limit, 10) || 3;
  const stage = repos.find(r => r.activity.stage)?.activity.stage || '';

  out({
    stage,
    repos: repos.map(r => ({
      name: r.name,
      entries: r.activity.entries.slice(0, limit),
    })),
  });
}

function cmdConfig() {
  out(config);
}

// ── Router ──────────────────────────────────────────────────

const USAGE = `Usage: hub <command>

Commands:
  status              Full overview (stage, repos, tasks, git, swarm)
  tasks [--repo=name] Open tasks across repos
  swarm [id]          Swarm agent status
  repos               Git status for all repos
  activity [--limit=N] Recent activity entries
  config              Raw hub config`;

const commands = { status: cmdStatus, tasks: cmdTasks, swarm: cmdSwarm, repos: cmdRepos, activity: cmdActivity, config: cmdConfig };

if (!command || !commands[command]) {
  process.stderr.write(USAGE + '\n');
  process.exit(command ? 1 : 0);
}

commands[command]();
