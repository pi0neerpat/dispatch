import { useMemo } from 'react'
import { Activity, Bot, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'
import ActivityFeed from './ActivityFeed'

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="rounded-lg border border-card-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={11} className={cn('shrink-0', colorClass)} />
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={cn('text-xl font-semibold font-mono', colorClass)} style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
    </div>
  )
}

export default function StatusView({ overview, swarm }) {
  const summary = swarm?.summary || {}
  const repos = overview?.repos || []
  const agents = swarm?.agents || []

  const repoStats = useMemo(() => {
    return repos.map(repo => {
      const repoAgents = agents.filter(a => a.repo === repo.name)
      return {
        name: repo.name,
        color: repoIdentityColors[repo.name] || 'var(--primary)',
        active: repoAgents.filter(a => a.status === 'in_progress').length,
        completed: repoAgents.filter(a => a.status === 'completed').length,
        failed: repoAgents.filter(a => a.status === 'failed' || a.status === 'killed').length,
        review: repoAgents.filter(a => a.validation === 'needs_validation').length,
        openTasks: repo.tasks?.openCount || 0,
        branch: repo.git?.branch || '-',
        dirty: repo.git?.isDirty || false,
      }
    })
  }, [repos, agents])

  return (
    <div className="space-y-6">
      {/* Agent stats */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active" value={summary.active || 0} icon={Activity} colorClass="text-status-active" />
          <StatCard label="Needs Review" value={summary.needsValidation || 0} icon={AlertCircle} colorClass="text-status-review" />
          <StatCard label="Completed" value={summary.completed || 0} icon={CheckCircle2} colorClass="text-status-complete" />
          <StatCard label="Failed" value={summary.failed || 0} icon={XCircle} colorClass="text-status-failed" />
        </div>
      </div>

      {/* Per-repo table */}
      {repoStats.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Per-Repo Overview</h3>
          <div className="rounded-lg border border-card-border bg-card overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Repo</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Branch</th>
                  <th className="text-center px-3 py-2.5 font-medium text-status-active">Active</th>
                  <th className="text-center px-3 py-2.5 font-medium text-status-complete">Done</th>
                  <th className="text-center px-3 py-2.5 font-medium text-status-failed">Failed</th>
                  <th className="text-center px-3 py-2.5 font-medium text-status-review">Review</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Open Tasks</th>
                </tr>
              </thead>
              <tbody>
                {repoStats.map(repo => (
                  <tr key={repo.name} className="border-b border-border/50 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: repo.color }} />
                        <span className="font-medium capitalize text-foreground">{repo.name}</span>
                        {repo.dirty && (
                          <span className="text-[9px] text-status-dirty font-medium">dirty</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className="font-mono text-muted-foreground/70" style={{ fontFamily: 'var(--font-mono)' }}>{repo.branch}</span>
                    </td>
                    <td className="text-center px-3 py-2.5 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.active > 0 ? <span className="text-status-active font-medium">{repo.active}</span> : <span className="text-muted-foreground/30">0</span>}
                    </td>
                    <td className="text-center px-3 py-2.5 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.completed > 0 ? <span className="text-status-complete">{repo.completed}</span> : <span className="text-muted-foreground/30">0</span>}
                    </td>
                    <td className="text-center px-3 py-2.5 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.failed > 0 ? <span className="text-status-failed">{repo.failed}</span> : <span className="text-muted-foreground/30">0</span>}
                    </td>
                    <td className="text-center px-3 py-2.5 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.review > 0 ? <span className="text-status-review font-medium">{repo.review}</span> : <span className="text-muted-foreground/30">0</span>}
                    </td>
                    <td className="text-center px-3 py-2.5 font-mono text-foreground/80" style={{ fontFamily: 'var(--font-mono)' }}>
                      {repo.openTasks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div>
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Recent Activity</h3>
        <ActivityFeed />
      </div>
    </div>
  )
}
