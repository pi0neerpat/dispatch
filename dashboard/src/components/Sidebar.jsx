import { useState } from 'react'
import { GitBranch, Bug, Loader, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { statusConfig } from './SwarmDetail'

const repoIdentityColors = {
  marketing: '#e0b44a',
  website: '#818cf8',
  electron: '#34d399',
  hub: '#7dd3fc',
}

const groupOrder = [
  { key: 'needs_validation', label: 'REVIEW', colorVar: '--status-review' },
  { key: 'in_progress', label: 'RUNNING', colorVar: '--status-active' },
  { key: 'completed', label: 'DONE', colorVar: '--status-complete' },
  { key: 'failed', label: 'FAILED', colorVar: '--status-failed' },
]

function groupAgents(agents, activeWorkers) {
  const groups = {}
  for (const g of groupOrder) groups[g.key] = []

  // Collect swarm file names from active workers so we can skip duplicates from the API
  const activeSwarmFiles = new Set()
  if (activeWorkers) {
    for (const [, info] of activeWorkers) {
      if (info.swarmFile?.fileName) {
        // fileName is like "2026-03-11-slug.md", agent id is like "2026-03-11-slug"
        activeSwarmFiles.add(info.swarmFile.fileName.replace(/\.md$/, ''))
      }
    }
  }

  for (const agent of agents) {
    // Skip if this swarm agent has a matching active terminal session
    if (activeSwarmFiles.has(agent.id)) continue

    if (agent.validation === 'needs_validation') {
      groups['needs_validation'].push(agent)
    } else if (agent.status === 'killed') {
      groups['failed'].push(agent)
    } else if (groups[agent.status]) {
      groups[agent.status].push(agent)
    } else {
      groups['failed'].push(agent)
    }
  }

  if (activeWorkers) {
    for (const [sessionId, info] of activeWorkers) {
      groups['in_progress'].push({
        id: sessionId,
        taskName: info.taskText,
        repo: info.repoName,
        status: 'in_progress',
        _isActiveWorker: true,
        started: new Date(info.created).toISOString(),
      })
    }
  }

  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      if (!a.started && !b.started) return 0
      if (!a.started) return 1
      if (!b.started) return -1
      return b.started.localeCompare(a.started)
    })
  }

  return groups
}

export default function Sidebar({ overview, swarm, selection, onSelect, onOverviewRefresh, onSwarmRefresh, activeWorkers }) {
  const repos = overview?.repos || []
  const agents = swarm?.agents || []
  const activeWorkerCount = activeWorkers?.size || 0
  const hasActive = (swarm?.summary?.active || 0) + activeWorkerCount > 0
  const [doneCollapsed, setDoneCollapsed] = useState(true)

  const grouped = groupAgents(agents, activeWorkers)
  const totalItems = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)

  return (
    <aside className="w-[256px] shrink-0 border-r border-border bg-background overflow-y-auto">
      {/* Repos section */}
      <div className="px-4 pt-5 pb-3">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-3 px-1">
          Repos
        </h3>
        <div className="space-y-0.5">
          {repos.map(repo => {
            const color = repoIdentityColors[repo.name] || 'var(--primary)'
            const isSelected = selection?.type === 'repo' && selection.id === repo.name
            const isDirty = repo.git.dirtyCount > 0
            return (
              <button
                key={repo.name}
                onClick={() => onSelect({ type: 'repo', id: repo.name })}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                  isSelected
                    ? 'bg-card'
                    : 'hover:bg-card/50'
                )}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium capitalize text-foreground">{repo.name}</span>
                  {/* Branch info — visible on hover or when selected */}
                  <div className={cn(
                    'flex items-center gap-1.5 mt-0.5 transition-all',
                    isSelected ? 'opacity-70' : 'opacity-0 group-hover:opacity-50'
                  )}>
                    <GitBranch size={9} className="text-muted-foreground" />
                    <span className="text-[10px] font-mono text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.git.branch}
                    </span>
                    {isDirty && (
                      <span className="text-[10px] font-medium text-status-dirty">
                        {repo.git.dirtyCount}~
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: `${color}12`,
                    color: color,
                  }}
                >
                  {repo.tasks.openCount}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-border" />

      {/* Worker Bees section */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Bug size={11} className="text-muted-foreground/60" />
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Worker Bees
          </h3>
          {hasActive && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ background: 'var(--status-active)' }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--status-active)' }} />
            </span>
          )}
        </div>

        {/* Grouped agents */}
        {totalItems === 0 ? (
          <div className="py-6 text-center">
            <Bug size={18} className="mx-auto mb-1.5 text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground/40">No worker bees</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupOrder.map(group => {
              const items = grouped[group.key]
              if (!items || items.length === 0) return null

              const isDoneGroup = group.key === 'completed'
              const isCollapsed = isDoneGroup && doneCollapsed

              return (
                <div key={group.key}>
                  {/* Group header */}
                  <button
                    className={cn(
                      'flex items-center gap-1.5 mb-1.5 px-1 w-full text-left',
                      isDoneGroup && 'cursor-pointer hover:opacity-80'
                    )}
                    onClick={isDoneGroup ? () => setDoneCollapsed(p => !p) : undefined}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: `var(${group.colorVar})` }}
                    />
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider"
                      style={{ color: `var(${group.colorVar})` }}
                    >
                      {group.label}
                    </span>
                    <span
                      className="text-[9px] font-mono px-1 rounded"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: `var(${group.colorVar})`,
                        background: `var(${group.colorVar})10`,
                      }}
                    >
                      {items.length}
                    </span>
                    {isDoneGroup && (
                      <span className="ml-auto text-muted-foreground/40">
                        {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                    )}
                  </button>

                  {/* Agent rows — collapsed for DONE group */}
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {items.map(agent => {
                        const isActiveWorker = agent._isActiveWorker
                        const agentSt = isActiveWorker
                          ? { icon: Loader, color: 'text-status-active' }
                          : (statusConfig[agent.status] || statusConfig.unknown)
                        const AgentIcon = agentSt.icon
                        const isSelected = selection?.type === 'swarm' && selection.id === agent.id
                        const repoColor = repoIdentityColors[agent.repo] || 'var(--primary)'

                        return (
                          <button
                            key={agent.id}
                            onClick={() => onSelect({ type: 'swarm', id: agent.id })}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all',
                              isSelected
                                ? 'bg-card'
                                : 'hover:bg-card/50'
                            )}
                          >
                            <AgentIcon
                              size={12}
                              className={cn(
                                agentSt.color,
                                (agent.status === 'in_progress' || isActiveWorker) && 'animate-spin',
                                'shrink-0'
                              )}
                            />
                            <span className="flex-1 min-w-0 text-[11px] text-foreground/70 truncate">
                              {agent.taskName || agent.id}
                            </span>
                            <span
                              className="shrink-0 text-[8px] font-medium px-1 py-px rounded capitalize"
                              style={{
                                color: repoColor,
                                background: `${repoColor}10`,
                              }}
                            >
                              {agent.repo}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
