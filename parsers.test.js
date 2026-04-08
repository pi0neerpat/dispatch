/**
 * Unit tests for parsers.js
 * Run: node --test parsers.test.js
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  parseTaskFile,
  parseActivityLog,
  parseJobFile,
  parseJobDir,
  parsePlansDir,
  parseSkillsDir,
  loadConfig,
  writeTaskDone,
  writeTaskDoneByText,
  writeTaskReopenByText,
  writeTaskAdd,
  writeTaskEdit,
  writeTaskMove,
  writeActivityEntry,
  writeJobValidation,
  writeJobKill,
  writeJobStatus,
} = require('./parsers');

// ── Helpers ──────────────────────────────────────────────────

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parsers-test-'));
}

function teardown() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function tmp(name, content) {
  const p = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function createDirSymlink(targetPath, symlinkPath) {
  fs.mkdirSync(path.dirname(symlinkPath), { recursive: true });
  fs.symlinkSync(
    targetPath,
    symlinkPath,
    process.platform === 'win32' ? 'junction' : 'dir'
  );
}

// ── parseTaskFile ────────────────────────────────────────────

describe('parseTaskFile', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('parses sections with open and done tasks', () => {
    const f = tmp('todo.md', [
      '## Setup',
      '- [ ] Install dependencies',
      '- [x] Create repo',
      '## Features',
      '- [ ] Add login page',
    ].join('\n'));

    const result = parseTaskFile(f);
    assert.equal(result.openCount, 2);
    assert.equal(result.doneCount, 1);
    assert.equal(result.sections.length, 2);
    assert.equal(result.sections[0].name, 'Setup');
    assert.equal(result.sections[0].tasks.length, 2);
    assert.equal(result.sections[0].tasks[0].done, false);
    assert.equal(result.sections[0].tasks[1].done, true);
    assert.equal(result.sections[1].name, 'Features');
  });

  it('strips bold markers and trailing annotations from task text', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] **Important task** (priority: high)',
      '- [x] Done task — **DONE 2026-03-20**',
    ].join('\n'));

    const result = parseTaskFile(f);
    assert.equal(result.allTasks[0].text, 'Important task');
    assert.equal(result.allTasks[1].text, 'Done task');
  });

  it('handles numbered lists', () => {
    const f = tmp('todo.md', [
      '## Sprint',
      '1. [ ] First task',
      '2. [x] Second task',
      '3. [ ] Third task',
    ].join('\n'));

    const result = parseTaskFile(f);
    assert.equal(result.openCount, 2);
    assert.equal(result.doneCount, 1);
  });

  it('tracks timeframe headers', () => {
    const f = tmp('todo.md', [
      '# Past',
      '## Done',
      '- [x] Old task',
      '# Present',
      '## Current',
      '- [ ] Current task',
      '# Future',
      '## Planned',
      '- [ ] Future task',
    ].join('\n'));

    const result = parseTaskFile(f);
    const past = result.allTasks.find(t => t.text === 'Old task');
    const present = result.allTasks.find(t => t.text === 'Current task');
    const future = result.allTasks.find(t => t.text === 'Future task');
    assert.equal(past.timeframe, 'past');
    assert.equal(present.timeframe, 'present');
    assert.equal(future.timeframe, 'future');
  });

  it('assigns openTaskNum only to open tasks', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] First open',
      '- [x] Done one',
      '- [ ] Second open',
    ].join('\n'));

    const result = parseTaskFile(f);
    assert.equal(result.allTasks[0].openTaskNum, 1);
    assert.equal(result.allTasks[1].openTaskNum, null);
    assert.equal(result.allTasks[2].openTaskNum, 2);
  });

  it('returns empty result for missing file', () => {
    const result = parseTaskFile('/nonexistent/todo.md');
    assert.equal(result.openCount, 0);
    assert.equal(result.doneCount, 0);
    assert.deepEqual(result.sections, []);
    assert.deepEqual(result.allTasks, []);
  });

  it('filters out empty sections', () => {
    const f = tmp('todo.md', [
      '## Empty Section',
      '## Tasks',
      '- [ ] Only task',
    ].join('\n'));

    const result = parseTaskFile(f);
    assert.equal(result.sections.length, 1);
    assert.equal(result.sections[0].name, 'Tasks');
  });

  it('strips section name annotations', () => {
    const f = tmp('todo.md', [
      '## Sprint 1 (2/5 done)',
      '- [ ] A task',
    ].join('\n'));

    const result = parseTaskFile(f);
    assert.equal(result.sections[0].name, 'Sprint 1');
  });
});

// ── parseActivityLog ─────────────────────────────────────────

describe('parseActivityLog', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('parses dated sections with bullet entries', () => {
    const f = tmp('activity.md', [
      '**Current stage:** Building',
      '## 2026-03-25',
      '- Added login page',
      '- Fixed bug in parser',
      '## 2026-03-24',
      '- Initial commit',
    ].join('\n'));

    const result = parseActivityLog(f);
    assert.equal(result.stage, 'Building');
    assert.equal(result.entries.length, 3);
    assert.equal(result.entries[0].date, '2026-03-25');
    assert.equal(result.entries[0].bullet, 'Added login page');
    assert.equal(result.entries[2].date, '2026-03-24');
  });

  it('respects limit option', () => {
    const f = tmp('activity.md', [
      '## 2026-03-25',
      '- Entry 1',
      '- Entry 2',
      '- Entry 3',
    ].join('\n'));

    const result = parseActivityLog(f, { limit: 2 });
    assert.equal(result.entries.length, 2);
  });

  it('formats dates compactly when dateFormat is compact', () => {
    const f = tmp('activity.md', [
      '## 2026-01-15',
      '- Something happened',
    ].join('\n'));

    const result = parseActivityLog(f, { dateFormat: 'compact' });
    assert.equal(result.entries[0].date, 'Jan 15');
  });

  it('strips bold and parenthetical annotations from bullets', () => {
    const f = tmp('activity.md', [
      '## 2026-03-25',
      '- **Important** update (by bot)',
    ].join('\n'));

    const result = parseActivityLog(f);
    assert.equal(result.entries[0].bullet, 'Important update');
  });

  it('returns empty result for missing file', () => {
    const result = parseActivityLog('/nonexistent/activity.md');
    assert.equal(result.stage, '');
    assert.deepEqual(result.entries, []);
  });
});

// ── parseJobFile ─────────────────────────────────────────────

describe('parseJobFile', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('parses all metadata fields', () => {
    const f = tmp('2026-03-25-test-job.md', [
      '# Job Task: Build login page',
      'Started: 2026-03-25 10:00:00',
      'Status: In progress',
      'Validation: Needs validation',
      'Repo: app',
      'OriginalPrompt: Build login page\\nwith tests',
      'Session: sess-123',
      'PreviousJob: 2026-03-24-discovery',
      'NextJob: 2026-03-26-polish',
      'SkipPermissions: true',
      'ResumeId: resume-456',
      'ResumeCommand: claude --resume',
      'Branch: job/2026-03-25-test-job',
      'WorktreePath: /tmp/worktrees/2026-03-25-test-job',
      '',
      '## Progress',
      '- Started coding',
      '- Added tests',
      '',
      '## Results',
      'Login page is ready',
      '',
      '## Validation',
      'Looks good',
    ].join('\n'));

    const result = parseJobFile(f);
    assert.equal(result.id, '2026-03-25-test-job');
    assert.equal(result.taskName, 'Build login page');
    assert.equal(result.started, '2026-03-25 10:00:00');
    assert.equal(result.status, 'in_progress');
    assert.equal(result.validation, 'needs_validation');
    assert.equal(result.repo, 'app');
    assert.equal(result.originalPrompt, 'Build login page\\nwith tests');
    assert.equal(result.session, 'sess-123');
    assert.equal(result.previousJobId, '2026-03-24-discovery');
    assert.equal(result.nextJobId, '2026-03-26-polish');
    assert.equal(result.skipPermissions, true);
    assert.equal(result.resumeId, 'resume-456');
    assert.equal(result.resumeCommand, 'claude --resume');
    assert.equal(result.branch, 'job/2026-03-25-test-job');
    assert.equal(result.worktreePath, '/tmp/worktrees/2026-03-25-test-job');
    assert.equal(result.progressCount, 2);
    assert.equal(result.lastProgress, 'Added tests');
    assert.ok(result.results.includes('Login page is ready'));
    assert.ok(result.validationNotes.includes('Looks good'));
  });

  it('returns null branch and worktreePath for legacy jobs', () => {
    const f = tmp('2026-03-25-legacy-job.md', [
      '# Job Task: Old job without worktree',
      'Started: 2026-03-25 10:00:00',
      'Status: Completed',
      'Repo: app',
    ].join('\n'));

    const result = parseJobFile(f);
    assert.equal(result.branch, null);
    assert.equal(result.worktreePath, null);
  });

  it('normalizes status values', () => {
    const cases = [
      ['Complete', 'completed'],
      ['Completed', 'completed'],
      ['In progress', 'in_progress'],
      ['In_progress', 'in_progress'],
      ['Failed', 'failed'],
      ['Killed', 'stopped'],
      ['Stopped', 'stopped'],
    ];
    for (const [raw, expected] of cases) {
      const f = tmp(`job-${raw.replace(/\s/g, '')}.md`, [
        '# Job Task: Test',
        `Status: ${raw}`,
      ].join('\n'));
      assert.equal(parseJobFile(f).status, expected, `"${raw}" should normalize to "${expected}"`);
    }
  });

  it('returns defaults for missing file', () => {
    const result = parseJobFile('/nonexistent/job.md');
    assert.equal(result.status, 'unknown');
    assert.equal(result.taskName, '');
    assert.equal(result.progressCount, 0);
  });

  it('parses legacy Swarm Task header', () => {
    const f = tmp('2026-03-25-legacy.md', [
      '# Swarm Task: Legacy task',
      'Status: Completed',
    ].join('\n'));

    const result = parseJobFile(f);
    assert.equal(result.taskName, 'Legacy task');
  });

  it('parses SkipPermissions variations', () => {
    for (const val of ['true', 'yes', '1']) {
      const f = tmp(`skip-${val}.md`, [
        '# Job Task: Test',
        'Status: In progress',
        `SkipPermissions: ${val}`,
      ].join('\n'));
      assert.equal(parseJobFile(f).skipPermissions, true);
    }

    const f = tmp('skip-false.md', [
      '# Job Task: Test',
      'Status: In progress',
      'SkipPermissions: false',
    ].join('\n'));
    assert.equal(parseJobFile(f).skipPermissions, false);
  });

  it('parses Read variations', () => {
    for (const val of ['true', 'yes', '1']) {
      const f = tmp(`read-${val}.md`, [
        '# Job Task: Test',
        'Status: Completed',
        `Read: ${val}`,
      ].join('\n'));
      assert.equal(parseJobFile(f).read, true);
    }

    const f = tmp('read-false.md', [
      '# Job Task: Test',
      'Status: Completed',
      'Read: false',
    ].join('\n'));
    assert.equal(parseJobFile(f).read, false);
  });
});

// ── parseJobDir ──────────────────────────────────────────────

describe('parseJobDir', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('parses all .md files in a directory', () => {
    const dir = path.join(tmpDir, 'jobs');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, '2026-03-25-a.md'), '# Job Task: A\nStatus: Completed\n');
    fs.writeFileSync(path.join(dir, '2026-03-25-b.md'), '# Job Task: B\nStatus: In progress\n');
    fs.writeFileSync(path.join(dir, 'readme.txt'), 'not a job');

    const results = parseJobDir(dir);
    assert.equal(results.length, 2);
    const names = results.map(r => r.taskName).sort();
    assert.deepEqual(names, ['A', 'B']);
  });

  it('returns empty array for missing directory', () => {
    assert.deepEqual(parseJobDir('/nonexistent/dir'), []);
  });
});

// ── parsePlansDir ────────────────────────────────────────────

describe('parsePlansDir', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('parses plan metadata with full content by default', () => {
    const dir = path.join(tmpDir, 'plans');
    fs.mkdirSync(dir);
    const file = path.join(dir, '2026-03-30-example-plan.md');
    fs.writeFileSync(file, [
      'Dispatched: 2026-03-30',
      'Job: 2026-03-30-address-findings',
      'Status: ready',
      '',
      '# Example Plan',
      '',
      'Body content',
    ].join('\n'), 'utf8');

    const result = parsePlansDir(dir);
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, '2026-03-30-example-plan');
    assert.equal(result[0].title, 'Example Plan');
    assert.equal(result[0].jobSlug, '2026-03-30-address-findings');
    assert.equal(result[0].planStatus, 'ready');
    assert.equal(result[0].dispatched, '2026-03-30');
    assert.ok(result[0].content.includes('Body content'));
  });

  it('supports includeContent=false for lightweight lookups', () => {
    const dir = path.join(tmpDir, 'plans');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, '2026-03-30-lookup-plan.md'), [
      'Dispatched: 2026-03-30',
      'Job: 2026-03-30-lightweight',
      'Status: in_progress',
      '',
      '# Lightweight Plan',
      '',
      'Long body line '.repeat(2000),
    ].join('\n'), 'utf8');

    const result = parsePlansDir(dir, { includeContent: false });
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'Lightweight Plan');
    assert.equal(result[0].jobSlug, '2026-03-30-lightweight');
    assert.equal(result[0].planStatus, 'in_progress');
    assert.equal('content' in result[0], false);
  });

  it('parses metadata from frontmatter blocks', () => {
    const dir = path.join(tmpDir, 'plans');
    fs.mkdirSync(dir);
    const file = path.join(dir, '2026-03-30-frontmatter-plan.md');
    fs.writeFileSync(file, [
      '---',
      'title: Frontmatter Plan',
      'planStatus: ready',
      'dispatched: 2026-03-30',
      'jobSlug: plan-job',
      'dependsOn:',
      '  - phase-1-branded-types.md',
      '---',
      '',
      '# Frontmatter Plan',
      '',
      'Body content',
    ].join('\n'), 'utf8');

    const result = parsePlansDir(dir);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, 'Frontmatter Plan');
    assert.equal(result[0].planStatus, 'ready');
    assert.equal(result[0].dispatched, '2026-03-30');
    assert.equal(result[0].jobSlug, 'plan-job');
  });
});

// ── parseSkillsDir ───────────────────────────────────────────

describe('parseSkillsDir', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('returns skills with id and display name from frontmatter', () => {
    tmp('.claude/skills/alpha/SKILL.md', [
      '---',
      'name: Alpha Skill',
      '---',
      '',
      '# Alpha',
    ].join('\n'));
    tmp('.claude/skills/beta/SKILL.md', '# Beta');
    tmp('.claude/skills/gamma/SKILL.md', [
      '---',
      'name: "Gamma Skill"',
      '---',
      '',
      '# Gamma',
    ].join('\n'));
    fs.mkdirSync(path.join(tmpDir, '.claude', 'skills', 'missing-skill-file'), { recursive: true });

    const result = parseSkillsDir(tmpDir);
    assert.deepEqual(result, [
      { id: 'alpha', name: 'Alpha Skill' },
      { id: 'beta', name: 'beta' },
      { id: 'gamma', name: 'Gamma Skill' },
    ]);
  });

  it('returns empty array when no global skills directory exists', () => {
    assert.deepEqual(parseSkillsDir(tmpDir), []);
  });

  it('supports recursive skill discovery for nested global skills', () => {
    tmp('.codex/skills/.system/openai-docs/SKILL.md', [
      '---',
      'name: OpenAI Docs',
      '---',
      '',
      '# OpenAI Docs',
    ].join('\n'));
    tmp('.codex/skills/team-workflow/SKILL.md', '# Team Workflow');

    const result = parseSkillsDir(tmpDir, {
      skillsSubdir: path.join('.codex', 'skills'),
      source: 'global',
      includeSource: true,
      idPrefix: 'global:',
      recursive: true,
    });

    assert.deepEqual(result, [
      { id: 'global:.system/openai-docs', name: 'OpenAI Docs', source: 'global' },
      { id: 'global:team-workflow', name: 'team-workflow', source: 'global' },
    ]);
  });

  it('includes symlinked skill directories for local and global scans', () => {
    const localTarget = path.join(tmpDir, 'linked-local-source');
    fs.mkdirSync(localTarget, { recursive: true });
    fs.writeFileSync(path.join(localTarget, 'SKILL.md'), '# Linked local', 'utf8');
    createDirSymlink(localTarget, path.join(tmpDir, '.claude', 'skills', 'linked-local'));

    const globalTarget = path.join(tmpDir, 'linked-global-source');
    fs.mkdirSync(globalTarget, { recursive: true });
    fs.writeFileSync(path.join(globalTarget, 'SKILL.md'), [
      '---',
      'name: Linked Global',
      '---',
      '',
      '# Linked Global',
    ].join('\n'), 'utf8');
    createDirSymlink(globalTarget, path.join(tmpDir, '.codex', 'skills', '.system', 'linked-global'));

    const local = parseSkillsDir(tmpDir);
    const global = parseSkillsDir(tmpDir, {
      skillsSubdir: path.join('.codex', 'skills'),
      source: 'global',
      includeSource: true,
      idPrefix: 'global:',
      recursive: true,
    });

    assert.deepEqual(local, [
      { id: 'linked-local', name: 'linked-local' },
    ]);
    assert.deepEqual(global, [
      { id: 'global:.system/linked-global', name: 'Linked Global', source: 'global' },
    ]);
  });

  it('avoids recursive loops through symlinked directories', () => {
    tmp('.claude/skills/alpha/SKILL.md', '# Alpha');
    createDirSymlink(
      path.join(tmpDir, '.claude', 'skills'),
      path.join(tmpDir, '.claude', 'skills', 'alpha', 'loop')
    );

    const result = parseSkillsDir(tmpDir, { recursive: true });
    assert.deepEqual(result, [
      { id: 'alpha', name: 'alpha' },
    ]);
  });
});

// ── loadConfig ───────────────────────────────────────────────

describe('loadConfig', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('loads config.json and resolves repo paths', () => {
    tmp('config.json', JSON.stringify({
      dispatchRoot: '.',
      repos: [
        { name: 'app', path: '../app', taskFile: 'todo.md' },
        { name: 'api', path: '../api' },
      ],
    }));

    const config = loadConfig(tmpDir);
    assert.equal(config.repos.length, 2);
    assert.equal(config.repos[0].name, 'app');
    assert.ok(path.isAbsolute(config.repos[0].resolvedPath));
    assert.equal(config.dispatchRoot, '.');
  });

  it('prefers config.local.json over config.json', () => {
    tmp('config.json', JSON.stringify({ dispatchRoot: '.', repos: [{ name: 'a', path: './a' }] }));
    tmp('config.local.json', JSON.stringify({ dispatchRoot: '.', repos: [{ name: 'local', path: './local' }] }));

    const config = loadConfig(tmpDir);
    assert.equal(config.repos[0].name, 'local');
  });

  it('maps legacy hubRoot to dispatchRoot when dispatchRoot is absent', () => {
    tmp('config.json', JSON.stringify({
      hubRoot: '../hub',
      repos: [{ name: 'a', path: './a' }],
    }));
    const config = loadConfig(tmpDir);
    assert.equal(config.dispatchRoot, '../hub');
    assert.equal(config.hubRoot, undefined);
  });
});

// ── writeTaskDone ────────────────────────────────────────────

describe('writeTaskDone', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('marks the Nth open task as done', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] First',
      '- [x] Already done',
      '- [ ] Second',
      '- [ ] Third',
    ].join('\n'));

    const result = writeTaskDone(f, 2);
    assert.equal(result.success, true);
    assert.equal(result.text, 'Second');
    const content = read(f);
    assert.ok(content.includes('- [x] Second'));
    // First should still be open
    assert.ok(content.includes('- [ ] First'));
  });

  it('throws for out-of-range task number', () => {
    const f = tmp('todo.md', '## Tasks\n- [ ] Only task\n');

    assert.throws(() => writeTaskDone(f, 5), /open task #5 not found/);
  });
});

// ── writeTaskDoneByText ──────────────────────────────────────

describe('writeTaskDoneByText', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('matches by exact substring', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] Install dependencies',
      '- [ ] Add login page',
    ].join('\n'));

    const result = writeTaskDoneByText(f, 'login page');
    assert.equal(result.success, true);
    assert.ok(result.text.includes('login page'));
    assert.ok(read(f).includes('- [x] Add login page'));
  });

  it('matches by reverse substring (verbose needle)', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] Fix bug',
    ].join('\n'));

    const result = writeTaskDoneByText(f, 'fix bug in the parser module');
    assert.equal(result.success, true);
  });

  it('matches by word overlap', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] Add unit tests for the parser module',
    ].join('\n'));

    const result = writeTaskDoneByText(f, 'parser unit tests');
    assert.equal(result.success, true);
  });

  it('throws when no match found', () => {
    const f = tmp('todo.md', '## Tasks\n- [ ] Unrelated task\n');
    assert.throws(() => writeTaskDoneByText(f, 'xyzzy nonexistent'), /no open task matching/);
  });
});

// ── writeTaskReopenByText ────────────────────────────────────

describe('writeTaskReopenByText', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('reopens a done task matched by text', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [x] Completed task',
      '- [ ] Open task',
    ].join('\n'));

    const result = writeTaskReopenByText(f, 'completed task');
    assert.equal(result.success, true);
    assert.ok(read(f).includes('- [ ] Completed task'));
  });

  it('throws when no done task matches', () => {
    const f = tmp('todo.md', '## Tasks\n- [ ] Open only\n');
    assert.throws(() => writeTaskReopenByText(f, 'open only'), /no done task matching/);
  });
});

// ── writeTaskAdd ─────────────────────────────────────────────

describe('writeTaskAdd', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('adds a task to a named section', () => {
    const f = tmp('todo.md', [
      '## Setup',
      '- [ ] Existing task',
      '## Features',
      '- [ ] Feature one',
    ].join('\n'));

    const result = writeTaskAdd(f, 'New setup task', 'setup');
    assert.equal(result.success, true);
    assert.equal(result.section, 'Setup');
    const content = read(f);
    assert.ok(content.includes('- [ ] New setup task'));
  });

  it('adds to first section with tasks when no section specified', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] Only task',
    ].join('\n'));

    writeTaskAdd(f, 'Another task', null);
    const lines = read(f).split('\n');
    const newTaskIdx = lines.findIndex(l => l.includes('Another task'));
    assert.ok(newTaskIdx > 0);
  });

  it('uses numbered format when previous task is numbered', () => {
    const f = tmp('todo.md', [
      '## Sprint',
      '1. [ ] First',
      '2. [ ] Second',
    ].join('\n'));

    writeTaskAdd(f, 'Third', 'sprint');
    assert.ok(read(f).includes('3. [ ] Third'));
  });

  it('collapses multi-line text into single line', () => {
    const f = tmp('todo.md', '## Tasks\n- [ ] Existing\n');
    writeTaskAdd(f, 'Line one\nLine two\n  extra spaces', 'tasks');
    const content = read(f);
    assert.ok(content.includes('- [ ] Line one Line two extra spaces'));
  });

  it('throws when no task section exists', () => {
    const f = tmp('todo.md', '# Title\nNo tasks here\n');
    assert.throws(() => writeTaskAdd(f, 'New task', null), /no task section found/);
  });
});

// ── writeTaskEdit ────────────────────────────────────────────

describe('writeTaskEdit', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('replaces task text by number', () => {
    const f = tmp('todo.md', [
      '## Tasks',
      '- [ ] Old text',
      '- [ ] Keep this',
    ].join('\n'));

    const result = writeTaskEdit(f, 1, 'New text');
    assert.equal(result.oldText, 'Old text');
    assert.equal(result.newText, 'New text');
    const content = read(f);
    assert.ok(content.includes('- [ ] New text'));
    assert.ok(content.includes('- [ ] Keep this'));
  });

  it('throws for out-of-range task number', () => {
    const f = tmp('todo.md', '## Tasks\n- [ ] Only\n');
    assert.throws(() => writeTaskEdit(f, 3, 'New'), /open task #3 not found/);
  });
});

// ── writeTaskMove ────────────────────────────────────────────

describe('writeTaskMove', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('moves a task from one file to another', () => {
    const src = tmp('src-todo.md', [
      '## Tasks',
      '- [ ] Stay here',
      '- [ ] Move me',
    ].join('\n'));
    const dest = tmp('dest-todo.md', [
      '## Inbox',
      '- [ ] Existing',
    ].join('\n'));

    const result = writeTaskMove(src, 2, dest, 'inbox');
    assert.equal(result.moved, true);
    assert.equal(result.text, 'Move me');

    const srcContent = read(src);
    assert.ok(!srcContent.includes('Move me'));
    assert.ok(srcContent.includes('Stay here'));

    const destContent = read(dest);
    assert.ok(destContent.includes('Move me'));
  });
});

// ── writeActivityEntry ───────────────────────────────────────

describe('writeActivityEntry', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('appends to existing date section', () => {
    const today = new Date().toISOString().slice(0, 10);
    const f = tmp('activity.md', [
      '# Activity Log',
      '',
      `## ${today}`,
      '',
      '- First entry',
    ].join('\n'));

    const result = writeActivityEntry(f, 'Second', 'details here');
    assert.equal(result.success, true);
    const content = read(f);
    assert.ok(content.includes('- **Second** — details here'));
  });

  it('creates new date section when none exists for today', () => {
    const f = tmp('activity.md', [
      '# Activity Log',
      '',
      '## 2026-01-01',
      '',
      '- Old entry',
    ].join('\n'));

    writeActivityEntry(f, 'New entry', null);
    const content = read(f);
    const today = new Date().toISOString().slice(0, 10);
    assert.ok(content.includes(`## ${today}`));
    assert.ok(content.includes('- **New entry**'));
  });

  it('creates file when it does not exist', () => {
    const f = path.join(tmpDir, 'new-activity.md');
    writeActivityEntry(f, 'First ever', 'bootstrapped');
    const content = read(f);
    assert.ok(content.includes('# Activity Log'));
    assert.ok(content.includes('- **First ever** — bootstrapped'));
  });

  it('formats entry without body when body is falsy', () => {
    const today = new Date().toISOString().slice(0, 10);
    const f = tmp('activity.md', `# Activity Log\n\n## ${today}\n\n- Old\n`);
    writeActivityEntry(f, 'Title only', null);
    assert.ok(read(f).includes('- **Title only**'));
    assert.ok(!read(f).includes('— null'));
  });
});

// ── writeJobValidation ───────────────────────────────────────

describe('writeJobValidation', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('updates existing Validation line', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: Completed',
      'Validation: Needs validation',
      '',
      '## Progress',
    ].join('\n'));

    const result = writeJobValidation(f, 'validated', null);
    assert.equal(result.success, true);
    assert.equal(result.validation, 'validated');
    assert.ok(read(f).includes('Validation: Validated'));
  });

  it('inserts Validation line when missing', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: Completed',
      '',
      '## Progress',
    ].join('\n'));

    writeJobValidation(f, 'rejected', 'code is broken');
    const content = read(f);
    assert.ok(content.includes('Validation: Rejected'));
    assert.ok(content.includes('code is broken'));
  });

  it('throws when no Status line exists', () => {
    const f = tmp('job.md', '# Job Task: Test\n');
    assert.throws(() => writeJobValidation(f, 'validated', null), /no Status: line/);
  });

  it('appends notes to existing Validation section', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: Completed',
      'Validation: Needs validation',
      '',
      '## Validation',
      '- Old note',
      '',
      '## Results',
    ].join('\n'));

    writeJobValidation(f, 'rejected', 'new rejection note');
    const content = read(f);
    assert.ok(content.includes('new rejection note'));
    assert.ok(content.includes('Old note'));
  });
});

// ── writeJobKill ─────────────────────────────────────────────

describe('writeJobKill', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('sets status to Stopped, marks it for review, and creates .kill marker', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: In progress',
      '',
      '## Progress',
      '- Working on it',
    ].join('\n'));

    const result = writeJobKill(f);
    assert.equal(result.success, true);

    const content = read(f);
    assert.ok(content.includes('Status: Stopped'));
    assert.ok(content.includes('Validation: Needs validation'));
    assert.ok(content.includes('## Stopped'));

    // Kill marker file should exist
    assert.ok(fs.existsSync(f + '.kill'));
  });

  it('throws when no Status line exists', () => {
    const f = tmp('job.md', '# Job Task: Test\n');
    assert.throws(() => writeJobKill(f), /no Status: line/);
  });
});

// ── writeJobStatus ───────────────────────────────────────────

describe('writeJobStatus', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('updates status line', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: In progress',
    ].join('\n'));

    const result = writeJobStatus(f, 'completed');
    assert.equal(result.success, true);
    assert.ok(read(f).includes('Status: Completed'));
  });

  it('forces validation to Needs validation on completion', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: In progress',
      'Validation: Validated',
    ].join('\n'));

    writeJobStatus(f, 'completed');
    const content = read(f);
    assert.ok(content.includes('Validation: Needs validation'));
  });

  it('inserts Validation line when completing and none exists', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: In progress',
    ].join('\n'));

    writeJobStatus(f, 'completed');
    assert.ok(read(f).includes('Validation: Needs validation'));
  });

  it('throws for invalid status', () => {
    const f = tmp('job.md', '# Job Task: Test\nStatus: In progress\n');
    assert.throws(() => writeJobStatus(f, 'banana'), /Invalid status/);
  });

  it('throws when no Status line exists', () => {
    const f = tmp('job.md', '# Job Task: Test\n');
    assert.throws(() => writeJobStatus(f), /no Status: line/);
  });

  it('does not touch validation when status is not completed', () => {
    const f = tmp('job.md', [
      '# Job Task: Test',
      'Status: In progress',
      'Validation: Validated',
    ].join('\n'));

    writeJobStatus(f, 'failed');
    assert.ok(read(f).includes('Validation: Validated'));
  });
});
