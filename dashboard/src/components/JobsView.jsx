import { useMemo } from 'react'
import { Bot, Sparkles, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn, timeAgo } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'
import { buildWorkerNavItems } from '../lib/workerUtils'

export default function JobsView({
  swarm,
  agentTerminals,
  swarmFileToSession,
  onSelectJob,
}) {
  const agents = swarm?.agents || []

  const allItems = useMemo(() => {
    return buildWorkerNavItems(agents, agentTerminals, swarmFileToSession)
  }, [agents, agentTerminals, swarmFileToSession])

  const active = allItems.filter(w => w.status === 'in_progress' && !w.needsReview)
  const needsReview = allItems.filter(w => w.needsReview || w.validation === 'needs_validation')
  const completed = allItems.filter(w => w.status === 'completed' && !w.needsReview)
  const failed = allItems.filter(w => (w.status === 'failed' || w.status === 'killed') && !w.needsReview)

  const groups = [
    { label: 'Active', items: active, dotClass: 'bg-status-active', icon: Sparkles },
    { label: 'Needs Review', items: needsReview, dotClass: 'bg-status-review', icon: AlertCircle },
    { label: 'Completed', items: completed, dotClass: 'bg-status-complete', icon: CheckCircle2 },
    { label: 'Failed', items: failed, dotClass: 'bg-status-failed', icon: XCircle },
  ].filter(g => g.items.length > 0)

  if (allItems.length === 0) {
    return (
      <div className="py-16 text-center">
        <Bot size={28} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground/60">No workers or agents.</p>
        <p className="text-[11px] text-muted-foreground/40 mt-1">Start a worker from the Tasks tab or use Dispatch.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map(group => {
        const GroupIcon = group.icon
        return (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('w-1.5 h-1.5 rounded-full', group.dotClass)} />
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground/40" style={{ fontFamily: 'var(--font-mono)' }}>
                {group.items.length}
              </span>
            </div>

            <div className="space-y-2">
              {group.items.map(worker => {
                const repoColor = repoIdentityColors[worker.repo] || 'var(--primary)'
                const duration = worker.durationMinutes != null
                  ? timeAgo(null, worker.durationMinutes)
                  : worker.created
                    ? timeAgo(new Date(worker.created).toISOString())
                    : null

                return (
                  <button
                    key={worker.key}
                    onClick={() => onSelectJob?.(worker.id)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-card-border bg-card hover:bg-card-hover/40 hover:border-card-border-hover transition-all group animate-fade-up"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', group.dotClass, worker.status === 'in_progress' && 'animate-pulse-soft')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{worker.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10px] font-medium capitalize"
                            style={{ color: repoColor }}
                          >
                            {worker.repo}
                          </span>
                          {duration && (
                            <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                              <Clock size={9} />
                              {duration}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground/40 group-hover:text-primary transition-colors">
                        View
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
