import { cn } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'

function getRepoFlags(repoName, swarmAgents, activeWorkers) {
  let hasRunning = false
  let hasReview = false
  let failedCount = 0

  for (const agent of swarmAgents) {
    if (agent.repo !== repoName) continue
    if (agent.validation === 'needs_validation') hasReview = true
    if (agent.status === 'in_progress') hasRunning = true
    if (agent.status === 'failed' || agent.status === 'killed') failedCount += 1
  }

  if (activeWorkers) {
    for (const [, info] of activeWorkers) {
      if (info.repoName === repoName) hasRunning = true
    }
  }

  return { hasRunning, hasReview, failedCount }
}

function buildWorkerNavItems(swarmAgents, activeWorkers, swarmFileToSession) {
  const items = []
  const seen = new Set()

  if (activeWorkers) {
    for (const [sessionId, info] of activeWorkers) {
      const swarmId = info.swarmFile?.fileName?.replace(/\.md$/, '') || null
      items.push({
        key: `session:${sessionId}`,
        id: sessionId,
        isSession: true,
        repo: info.repoName,
        label: info.taskText || 'Manual worker',
        needsReview: false,
      })
      if (swarmId) seen.add(swarmId)
      seen.add(sessionId)
    }
  }

  for (const agent of swarmAgents || []) {
    if (!(agent.status === 'in_progress' || agent.validation === 'needs_validation')) continue
    if (seen.has(agent.id)) continue

    const sessionId = swarmFileToSession?.[agent.id]
    items.push({
      key: `agent:${agent.id}`,
      id: sessionId || agent.id,
      isSession: !!sessionId,
      repo: agent.repo,
      label: agent.taskName || agent.id,
      needsReview: agent.validation === 'needs_validation',
    })
  }

  return items.slice(0, 10)
}

export default function Sidebar({ overview, swarm, selection, onSelect, activeWorkers, swarmFileToSession, onOpenWorker }) {
  const repos = overview?.repos || []
  const agents = swarm?.agents || []
  const workerItems = buildWorkerNavItems(agents, activeWorkers, swarmFileToSession)

  return (
    <aside className="w-[260px] shrink-0 border-r border-border bg-background overflow-y-auto">
      <div className="px-3 pt-4 pb-4">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Repos
        </h3>
        <div className="space-y-1.5">
          {repos.map(repo => {
            const color = repoIdentityColors[repo.name] || 'var(--primary)'
            const isSelected = selection?.type === 'repo' && selection.id === repo.name
            const { hasRunning, hasReview, failedCount } = getRepoFlags(repo.name, agents, activeWorkers)

            return (
              <button
                key={repo.name}
                onClick={() => onSelect({ type: 'repo', id: repo.name })}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all duration-150 border',
                  isSelected
                    ? 'bg-card border-card-border-hover'
                    : 'border-transparent hover:bg-card/50'
                )}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="flex-1 min-w-0 text-[13px] font-medium capitalize text-foreground truncate">
                  {repo.name}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {hasReview && <span className="w-1.5 h-1.5 rounded-full bg-status-review" title="Needs review" />}
                  {!hasReview && hasRunning && <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse-soft" title="Running" />}
                  {failedCount > 0 && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-status-failed-bg text-status-failed"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      title="Failed workers"
                    >
                      !{failedCount}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: `${color}12`,
                      color,
                    }}
                  >
                    {repo.tasks.openCount}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Workers
          </h3>
          {workerItems.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted-foreground/60">
              No workers running.
            </p>
          ) : (
            <div className="space-y-1">
              {workerItems.map(worker => {
                const isSelected = selection?.type === 'swarm' && selection.id === worker.id
                const repoColor = repoIdentityColors[worker.repo] || 'var(--primary)'
                return (
                  <button
                    key={worker.key}
                    onClick={() => onOpenWorker?.(worker.id, worker.isSession ? 'terminal' : 'review')}
                    className={cn(
                      'w-full text-left px-2.5 py-2 rounded-md border transition-all',
                      isSelected
                        ? 'bg-card border-card-border-hover'
                        : 'border-transparent hover:bg-card/60'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          worker.needsReview ? 'bg-status-review' : 'bg-status-active'
                        )}
                      />
                      <span className="flex-1 min-w-0 truncate text-[11px] text-foreground/90">{worker.label}</span>
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: repoColor }}>
                      {worker.repo}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
