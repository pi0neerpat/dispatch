/**
 * Shared parsing module for the Scribular coordination hub.
 * Used by cli.js (JSON output) and terminal.js (ANSI output).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseTaskFile(filePath) {
  const sections = [];
  let currentSection = null;
  let openCount = 0, doneCount = 0;
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const sectionMatch = line.match(/^##\s+(.+)/);
      if (sectionMatch) {
        currentSection = { name: sectionMatch[1].replace(/\s*\(.*\)$/, ''), tasks: [] };
        sections.push(currentSection);
        continue;
      }
      const taskMatch = line.match(/^- \[([ x])\]\s+(.+)/);
      if (taskMatch) {
        const done = taskMatch[1] === 'x';
        const text = taskMatch[2]
          .replace(/\s*—\s*\*\*DONE.*\*\*/, '')
          .replace(/\s*\(.*?\)\s*$/, '')
          .replace(/\*\*/g, '');
        if (done) { doneCount++; }
        else {
          openCount++;
          if (currentSection) currentSection.tasks.push({ text, done });
        }
      }
    }
  } catch { /* file missing */ }
  return { sections: sections.filter(s => s.tasks.length > 0), openCount, doneCount };
}

function parseActivityLog(filePath) {
  let stage = '';
  const entries = [];
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const stageMatch = line.match(/\*\*Current stage:\*\*\s*(.+)/);
      if (stageMatch) { stage = stageMatch[1]; continue; }
      const dateMatch = line.match(/^## (\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        entries.push({ date: dateMatch[1], bullet: '' });
        continue;
      }
      if (entries.length > 0 && !entries[entries.length - 1].bullet) {
        const bulletMatch = line.match(/^- (.+)/);
        if (bulletMatch) {
          entries[entries.length - 1].bullet = bulletMatch[1]
            .replace(/\*\*/g, '')
            .replace(/\s*\(.*?\)/, '');
        }
      }
    }
  } catch { /* file missing */ }
  return { stage, entries };
}

function getGitInfo(repoPath) {
  try {
    const branch = execSync(`git -C "${repoPath}" branch --show-current`, { encoding: 'utf8' }).trim();
    const porcelain = execSync(`git -C "${repoPath}" status --porcelain`, { encoding: 'utf8' }).trim();
    const dirtyCount = porcelain ? porcelain.split('\n').length : 0;
    return { branch, dirtyCount };
  } catch {
    return { branch: '?', dirtyCount: 0 };
  }
}

function normalizeStatus(raw) {
  if (!raw) return 'unknown';
  const lower = raw.trim().toLowerCase();
  if (lower === 'complete' || lower === 'completed') return 'completed';
  if (lower === 'in progress' || lower === 'in_progress') return 'in_progress';
  if (lower === 'failed') return 'failed';
  return lower;
}

function parseSwarmFile(filePath) {
  const id = path.basename(filePath, '.md');
  let taskName = '', started = '', status = 'unknown', validation = 'none';
  const progressEntries = [];
  let results = null;
  let validationNotes = null;

  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    let currentSection = null;
    let resultLines = [];
    let validationLines = [];

    for (const line of lines) {
      // Header metadata
      const taskMatch = line.match(/^#\s+Swarm Task:\s*(.+)/);
      if (taskMatch) { taskName = taskMatch[1].trim(); continue; }

      const startedMatch = line.match(/^Started:\s*(.+)/);
      if (startedMatch) { started = startedMatch[1].trim(); continue; }

      const statusMatch = line.match(/^Status:\s*(.+)/);
      if (statusMatch) { status = normalizeStatus(statusMatch[1]); continue; }

      const validationMatch = line.match(/^Validation:\s*(.+)/);
      if (validationMatch) { validation = validationMatch[1].trim().toLowerCase().replace(/\s+/g, '_'); continue; }

      // Section detection
      const sectionMatch = line.match(/^##\s+(.+)/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim().toLowerCase();
        continue;
      }

      // Collect content per section
      if (currentSection === 'progress') {
        const bullet = line.match(/^[-*]\s+(.+)/);
        if (bullet) progressEntries.push(bullet[1]);
      } else if (currentSection === 'results' || currentSection === 'results summary') {
        if (line.trim()) resultLines.push(line);
      } else if (currentSection === 'validation') {
        if (line.trim()) validationLines.push(line);
      }
    }

    if (resultLines.length > 0) results = resultLines.join('\n');
    if (validationLines.length > 0) validationNotes = validationLines.join('\n');
  } catch { /* file missing or unreadable */ }

  const lastProgress = progressEntries.length > 0 ? progressEntries[progressEntries.length - 1] : null;
  const progressCount = progressEntries.length;

  let durationMinutes = null;
  if (started) {
    const startDate = new Date(started);
    if (!isNaN(startDate.getTime())) {
      durationMinutes = Math.round((Date.now() - startDate.getTime()) / 60000);
    }
  }

  const resultsSummary = results ? results.split('\n')[0] : null;

  return {
    id, taskName, started, status, validation,
    lastProgress, progressCount, durationMinutes, resultsSummary,
    progressEntries, results, validationNotes,
  };
}

function parseSwarmDir(dirPath) {
  try {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    return files.map(f => parseSwarmFile(path.join(dirPath, f)));
  } catch {
    return [];
  }
}

function loadConfig(hubDir) {
  const configPath = path.join(hubDir, 'config.json');
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    ...raw,
    repos: raw.repos.map(repo => ({
      ...repo,
      resolvedPath: path.resolve(hubDir, repo.path),
    })),
  };
}

module.exports = {
  parseTaskFile,
  parseActivityLog,
  getGitInfo,
  parseSwarmFile,
  parseSwarmDir,
  loadConfig,
};
