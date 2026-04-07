import { useMemo } from 'react'
import { Clock, Loader, CheckCircle2, PlayCircle, XCircle, ListChecks } from 'lucide-react'
import { cn } from '../lib/utils'
import { DEFAULT_REPO_MUTED_COLOR } from '../lib/constants'
import { usePolling } from '../lib/usePolling'
import { POLL_INTERVALS } from '../lib/pollingIntervals'

function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((today - date) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${day}`
}

function inferActivityType(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('failed') || t.includes('error') || t.includes('killed')) return 'failed'
  if (t.includes('started') || t.includes('running') || t.includes('in progress')) return 'started'
  if (t.includes('completed') || t.includes('done') || t.includes('validated')) return 'completed'
  if (t.includes('stopped')) return 'updated'
  return 'updated'
}

function typeMeta(type) {
  if (type === 'completed') return { icon: CheckCircle2, label: 'Task Completed', className: 'text-status-complete' }
  if (type === 'started') return { icon: PlayCircle, label: 'Worker Started', className: 'text-status-active' }
  if (type === 'failed') return { icon: XCircle, label: 'Worker Failed', className: 'text-status-failed' }
  return { icon: ListChecks, label: 'Updates', className: 'text-muted-foreground' }
}

export default function ActivityFeed() {
  const { data, loading } = usePolling('/api/activity?limit=20', POLL_INTERVALS.activity)
  const entries = data?.entries || []

  const grouped = useMemo(() => {
    const byDate = new Map()
    for (const entry of entries) {
      const dateGroup = byDate.get(entry.date) || {}
      const type = inferActivityType(entry.bullet)
      dateGroup[type] = dateGroup[type] || []
      dateGroup[type].push(entry)
      byDate.set(entry.date, dateGroup)
    }

    return [...byDate.entries()].map(([date, byType]) => ({ date, byType }))
  }, [entries])

  if (loading) {
    return (
      <div className="py-6 text-center">
        <Loader size={16} className="mx-auto text-muted-foreground/20 animate-spin-slow" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="py-6 text-center">
        <Clock size={16} className="mx-auto mb-1 text-muted-foreground/40" />
        <p className="text-[11px] text-muted-foreground/60">No activity yet. Complete a task to see it here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {grouped.map((group, gi) => (
        <div key={group.date} className="animate-slide-in" style={{ animationDelay: `${gi * 30}ms` }}>
          <p className="text-[9px] font-mono text-muted-foreground/40 mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
            {formatRelativeDate(group.date)}
          </p>

          <div className="space-y-2">
            {Object.entries(group.byType).map(([type, items]) => {
              const meta = typeMeta(type)
              const TypeIcon = meta.icon

              return (
                <div key={`${group.date}-${type}`} className="rounded-md border border-border/70 bg-card/50 px-2.5 py-2">
                  <div className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-1.5', meta.className)}>
                    <TypeIcon size={11} />
                    {meta.label}
                  </div>

                  <div className="space-y-1">
                    {items.map((item, ii) => {
                      const dotColor = item.color || DEFAULT_REPO_MUTED_COLOR
                      return (
                        <div key={`${item.repo}-${ii}`} className="flex items-start gap-1.5 text-[11px] leading-snug">
                          <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: dotColor }} />
                          <span className="font-medium capitalize" style={{ color: dotColor }}>{item.repo}</span>
                          <span className="text-foreground/55 line-clamp-2">{item.bullet}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
