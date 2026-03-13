import { useState, useMemo } from 'react'
import { Play, Check } from 'lucide-react'
import { cn } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'

const TIMEFRAMES = ['past', 'present', 'future']
const STATUSES = ['open', 'in_progress', 'review', 'done']

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

const STATUS_COLORS = {
  open: { bg: 'bg-card', border: 'border-border', text: 'text-muted-foreground' },
  in_progress: { bg: 'bg-status-active-bg', border: 'border-status-active-border', text: 'text-status-active' },
  review: { bg: 'bg-status-review-bg', border: 'border-status-review-border', text: 'text-status-review' },
  done: { bg: 'bg-status-complete-bg', border: 'border-status-complete-border', text: 'text-status-complete' },
}

function deriveStatus(task, repoName, agentTerminals, swarmAgents) {
  if (task.done) return 'done'

  // Check for active worker
  if (agentTerminals) {
    for (const [, info] of agentTerminals) {
      if (info.repoName === repoName && info.taskText && task.text.toLowerCase().includes(info.taskText.toLowerCase().slice(0, 30))) {
        return 'in_progress'
      }
    }
  }

  // Check for swarm agent needing review
  if (swarmAgents) {
    for (const agent of swarmAgents) {
      if (agent.repo === repoName && agent.validation === 'needs_validation') {
        const match = agent.taskName?.toLowerCase().includes(task.text.toLowerCase().slice(0, 30)) ||
          task.text.toLowerCase().includes(agent.taskName?.toLowerCase()?.slice(0, 30) || '')
        if (match) return 'review'
      }
    }
  }

  return 'open'
}

function FilterChip({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all capitalize',
        active
          ? 'bg-primary/12 border-primary/35 text-foreground'
          : 'bg-card border-border text-muted-foreground/60 hover:text-muted-foreground hover:border-border'
      )}
      style={active && color ? { borderColor: `${color}50`, backgroundColor: `${color}12`, color } : undefined}
    >
      {label}
    </button>
  )
}

export default function AllTasksView({
  overview,
  onOverviewRefresh,
  onNavigateToDispatch,
  swarm,
  agentTerminals,
  swarmFileToSession,
}) {
  const repos = overview?.repos || []
  const repoNames = repos.map(r => r.name)

  const [selectedTimeframes, setSelectedTimeframes] = useState(new Set(['present']))
  const [selectedStatuses, setSelectedStatuses] = useState(new Set(['open', 'in_progress']))
  const [selectedRepos, setSelectedRepos] = useState(new Set(repoNames))

  // Sync repo filter when repos load
  useMemo(() => {
    if (repoNames.length > 0 && selectedRepos.size === 0) {
      setSelectedRepos(new Set(repoNames))
    }
  }, [repoNames.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const swarmAgents = swarm?.agents || []

  // Build flat task list from all repos
  const allTasks = useMemo(() => {
    const tasks = []
    for (const repo of repos) {
      const repoTasks = repo.tasks?.allTasks || []
      for (const task of repoTasks) {
        const status = deriveStatus(task, repo.name, agentTerminals, swarmAgents)
        tasks.push({ ...task, repoName: repo.name, status })
      }
    }
    // Sort: open/in_progress first, then review, then done
    const order = { in_progress: 0, open: 1, review: 2, done: 3 }
    tasks.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
    return tasks
  }, [repos, agentTerminals, swarmAgents])

  // Apply filters
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (selectedTimeframes.size > 0 && !selectedTimeframes.has(t.timeframe)) return false
      if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status)) return false
      if (selectedRepos.size > 0 && !selectedRepos.has(t.repoName)) return false
      return true
    })
  }, [allTasks, selectedTimeframes, selectedStatuses, selectedRepos])

  function toggleFilter(set, setter, value) {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  async function handleToggleDone(task) {
    try {
      if (task.done) return // Can't undo done for now
      await fetch('/api/tasks/done-by-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: task.repoName, text: task.text }),
      })
      onOverviewRefresh?.()
    } catch { /* ignore */ }
  }

  if (repos.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground/60 text-sm">
        No repos configured.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="space-y-2.5">
        {/* Timeframe */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 w-16 shrink-0">Time</span>
          {TIMEFRAMES.map(tf => (
            <FilterChip
              key={tf}
              label={tf}
              active={selectedTimeframes.has(tf)}
              onClick={() => toggleFilter(selectedTimeframes, setSelectedTimeframes, tf)}
            />
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 w-16 shrink-0">Status</span>
          {STATUSES.map(st => (
            <FilterChip
              key={st}
              label={STATUS_LABELS[st]}
              active={selectedStatuses.has(st)}
              onClick={() => toggleFilter(selectedStatuses, setSelectedStatuses, st)}
            />
          ))}
        </div>

        {/* Repo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 w-16 shrink-0">Repo</span>
          {repoNames.map(name => (
            <FilterChip
              key={name}
              label={name}
              active={selectedRepos.has(name)}
              onClick={() => toggleFilter(selectedRepos, setSelectedRepos, name)}
              color={repoIdentityColors[name]}
            />
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-[11px] text-muted-foreground/50">
        {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
      </p>

      {/* Task cards */}
      <div className="space-y-1.5">
        {filteredTasks.map((task, i) => {
          const repoColor = repoIdentityColors[task.repoName] || 'var(--primary)'
          const sc = STATUS_COLORS[task.status]
          return (
            <div
              key={`${task.repoName}-${task.section}-${i}`}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-border bg-card hover:bg-card-hover transition-colors group"
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleDone(task)}
                disabled={task.done}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  task.done
                    ? 'bg-status-complete/20 border-status-complete/40 text-status-complete'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {task.done && <Check size={10} />}
              </button>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-[13px] leading-snug truncate', task.done ? 'text-muted-foreground/50 line-through' : 'text-foreground')}>
                  {task.text}
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 truncate">
                  {task.section}{task.section ? ' \u00b7 ' : ''}{task.repoName}
                </p>
              </div>

              {/* Chips */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border bg-card text-muted-foreground/60 capitalize">
                  {task.timeframe}
                </span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', sc.bg, sc.border, sc.text)}>
                  {STATUS_LABELS[task.status]}
                </span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full border capitalize"
                  style={{ background: `${repoColor}10`, color: repoColor, borderColor: `${repoColor}30` }}
                >
                  {task.repoName}
                </span>
              </div>

              {/* Start button */}
              {task.status === 'open' && (
                <button
                  onClick={() => onNavigateToDispatch?.(task.repoName, task.text)}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all shrink-0"
                >
                  <Play size={10} />
                  Start
                </button>
              )}
            </div>
          )
        })}

        {filteredTasks.length === 0 && (
          <div className="py-12 text-center text-muted-foreground/50 text-sm">
            No tasks match the current filters.
          </div>
        )}
      </div>
    </div>
  )
}
