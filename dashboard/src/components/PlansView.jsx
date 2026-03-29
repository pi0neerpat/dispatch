import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Pencil, Check, Play } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'
import { mdComponents } from './mdComponents'

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const JOB_STATUS_CHIP = {
  in_progress: { label: 'running', color: 'var(--status-active)' },
  needs_validation: { label: 'review', color: 'var(--status-review)' },
  completed: { label: 'done', color: 'var(--status-complete)' },
  failed: { label: 'failed', color: 'var(--status-failed)' },
}

function resolveJobStatus(plan, swarm) {
  if (!plan.jobSlug) return plan.dispatched ? 'dispatched' : null
  const agent = swarm?.agents?.find(a => a.id === plan.jobSlug)
  return agent?.status || 'dispatched'
}

function PlanCard({ plan, onSelect, swarm }) {
  const color = repoIdentityColors[plan.repo] || 'var(--primary)'
  const jobStatus = resolveJobStatus(plan, swarm)
  const chip = jobStatus ? JOB_STATUS_CHIP[jobStatus] : null

  return (
    <button
      onClick={() => onSelect(plan)}
      className="w-full text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-card-hover transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-1 min-w-0 text-[13px] font-medium text-foreground truncate">
          {plan.title}
        </span>
        {chip ? (
          <span
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ color: chip.color, background: `${chip.color}18` }}
          >
            {chip.label}
          </span>
        ) : jobStatus === 'dispatched' ? (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground border border-border">
            dispatched
          </span>
        ) : null}
        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ color, background: `${color}18` }}
        >
          {plan.repo}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground/60 w-16 text-right">
          {timeAgo(plan.lastModified)}
        </span>
      </div>
    </button>
  )
}

function PlanDetail({ plan: initialPlan, onBack, onNavigateToDispatch }) {
  const [plan, setPlan] = useState(initialPlan)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(initialPlan.content)
  const [saving, setSaving] = useState(false)

  const color = repoIdentityColors[plan.repo] || 'var(--primary)'

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/plans/${plan.repo}/${plan.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      setPlan(p => ({ ...p, content: editContent }))
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleStart() {
    onNavigateToDispatch(plan.repo, `plans/${plan.slug}.md`, plan.slug)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          Plans
        </button>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-[13px] font-medium text-foreground flex-1 min-w-0 truncate">{plan.title}</span>
        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{ color, background: `${color}18` }}
        >
          {plan.repo}
        </span>
        {isEditing ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-[12px] font-medium text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
            style={{ color: '#8bab8f', borderColor: '#8bab8f40', backgroundColor: '#8bab8f18' }}
          >
            <Check size={12} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : (
          <button
            onClick={() => { setEditContent(plan.content); setIsEditing(true) }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card text-[12px] text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          className={cn(
            'w-full min-h-[400px] px-4 py-3 rounded-lg border border-border bg-card',
            'text-[13px] text-foreground font-mono leading-relaxed',
            'focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10',
            'resize-y'
          )}
          style={{ fontFamily: 'var(--font-mono)' }}
          autoFocus
        />
      ) : (
        <div className="px-4 py-3 rounded-lg border border-border bg-card text-[13px] text-foreground/90 leading-relaxed">
          <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{plan.content}</Markdown>
        </div>
      )}

      {/* Start button */}
      {!isEditing && (
        <div className="flex justify-end pt-1">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute pointer-events-none animate-loading-halo" style={{ width: '180px', height: '60px', background: '#8bab8f', borderRadius: '50%', filter: 'blur(30px)', top: 'calc(50% - 30px)', left: 'calc(50% - 90px)', opacity: 0.6 }} />
            </div>
            <button
              onClick={handleStart}
              style={{
                background: 'linear-gradient(135deg, #8bab8f 0%, #6d9472 100%)',
                color: '#1a1b1e',
                boxShadow: '0 0 8px 2px rgba(139,171,143,0.25)',
              }}
              className="relative z-10 inline-flex items-center gap-2 pl-5 pr-6 h-10 rounded-full text-[13px] font-semibold transition-transform duration-150 hover:scale-105 active:scale-[0.97]"
            >
              <Play size={14} fill="currentColor" />
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const FILTER_KEY = 'plansView:repoFilter'

function readSavedFilter() {
  try { return localStorage.getItem(FILTER_KEY) || null } catch { return null }
}

export default function PlansView({ overview, swarm, onNavigateToDispatch }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [repoFilter, setRepoFilter] = useState(readSavedFilter)

  const repos = overview?.repos || []

  function setRepoFilterPersisted(val) {
    try {
      if (val) localStorage.setItem(FILTER_KEY, val)
      else localStorage.removeItem(FILTER_KEY)
    } catch {}
    setRepoFilter(val)
  }

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans')
      if (res.ok) setPlans(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleBack = useCallback(() => {
    setSelectedPlan(null)
    fetchPlans() // refresh in case edits were made
  }, [fetchPlans])

  if (selectedPlan) {
    return (
      <PlanDetail
        plan={selectedPlan}
        onBack={handleBack}
        onNavigateToDispatch={onNavigateToDispatch}
      />
    )
  }

  const visiblePlans = repoFilter ? plans.filter(p => p.repo === repoFilter) : plans

  return (
    <div className="flex flex-col gap-4">
      {/* Repo filter */}
      {repos.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setRepoFilterPersisted(null)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[12px] font-medium border transition-all',
              repoFilter === null
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
            )}
            style={repoFilter === null ? { borderColor: '#8bab8f40', backgroundColor: '#8bab8f10' } : undefined}
          >
            All
          </button>
          {repos.map(r => {
            const color = repoIdentityColors[r.name] || 'var(--primary)'
            const isActive = repoFilter === r.name
            return (
              <button
                key={r.name}
                onClick={() => setRepoFilterPersisted(isActive ? null : r.name)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[12px] font-medium capitalize border transition-all',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
                )}
                style={isActive ? { borderColor: `${color}40`, backgroundColor: `${color}10` } : undefined}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: color }} />
                {r.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Plan list */}
      {loading ? (
        <p className="text-[12px] text-muted-foreground/60 py-4">Loading plans…</p>
      ) : visiblePlans.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[13px] text-muted-foreground/60">No plans found.</p>
          <p className="text-[11px] text-muted-foreground/40 mt-1">
            Add <code className="font-mono">plans/*.md</code> files to a repo to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visiblePlans.map(plan => (
            <PlanCard
              key={`${plan.repo}/${plan.slug}`}
              plan={plan}
              onSelect={setSelectedPlan}
              swarm={swarm}
            />
          ))}
        </div>
      )}
    </div>
  )
}
