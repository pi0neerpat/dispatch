import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, TerminalSquare, ClipboardCheck, Clock, Code2, ScanSearch, GitFork, RefreshCcw } from 'lucide-react'
import { cn, timeAgo } from '../lib/utils'
import { repoIdentityColors, normalizeAgentId, getAgentBrandColor } from '../lib/constants'
import AgentIcon, { getAgentLabel } from './AgentIcon'
import TerminalPanel from './TerminalPanel'
import LoopReviewPanel from './LoopReviewPanel'

const LOOP_TYPE_META = {
  'linear-implementation': { label: 'Linear Implementation', icon: Code2 },
  'linear-review':         { label: 'Linear Review',         icon: ScanSearch },
  'parallel-review':       { label: 'Parallel Review',       icon: GitFork },
}

const STATUS_COLORS = {
  in_progress: '#4ade80',
  completed:   '#8bab8f',
  failed:      '#f87171',
  unknown:     '#888',
}

export default function LoopDetailView({
  loopId,
  loops,
  onBack,
  agentTerminals,
  onKillSession,
  onUpdateSessionId,
  onPromptSent,
  onContextUsage,
  onJobsChanged,
}) {
  const [view, setView] = useState('review')

  const loop = useMemo(() => {
    const all = loops?.jobs || []
    // Support lookup by session ID (from freshly launched loops)
    if (loopId && loopId.startsWith('session:')) {
      const sessionId = loopId.slice('session:'.length)
      return all.find(j => j.session === sessionId) || null
    }
    return all.find(j => j.id === loopId) || null
  }, [loops, loopId])

  const isSessionLookup = loopId && loopId.startsWith('session:')
  const hasTerminal = loop?.session && agentTerminals.has(loop.session)

  // Default to terminal tab when there's a live terminal for new launches
  useEffect(() => {
    if (isSessionLookup && !loop) {
      setView('terminal')
    } else if (loop) {
      setView('review')
    }
  }, [isSessionLookup, loop])

  if (!loop) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={14} />
            Back
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-[13px] text-muted-foreground">
            {isSessionLookup ? 'Starting loop…' : 'Loop not found'}
          </span>
        </div>
        {isSessionLookup && (
          <div className="flex-1 min-h-0">
            {agentTerminals.has(loopId.slice('session:'.length)) ? (
              <TerminalPanel
                sessions={agentTerminals}
                activeSessionId={loopId.slice('session:'.length)}
                isVisible={true}
                skipPermissions={true}
                onKillSession={onKillSession}
                onUpdateSessionId={onUpdateSessionId}
                onPromptSent={onPromptSent}
                onContextUsage={onContextUsage}
                onJobsChanged={onJobsChanged}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <RefreshCcw size={28} className="mx-auto text-muted-foreground/20 animate-spin" style={{ animationDuration: '3s' }} />
                  <p className="text-[12px] text-muted-foreground/50">Waiting for loop to initialize…</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const meta = LOOP_TYPE_META[loop.loopType] || { label: loop.loopType, icon: RefreshCcw }
  const TypeIcon = meta.icon
  const repoColor = repoIdentityColors[loop.repo] || 'var(--primary)'
  const statusColor = STATUS_COLORS[loop.status] || STATUS_COLORS.unknown
  const agentId = normalizeAgentId((loop.agent || 'claude').split(':')[0])
  const agentLabel = getAgentLabel(agentId)
  const agentColor = getAgentBrandColor(agentId)

  return (
    <div className="h-full flex flex-col">
      {/* Top bar — mirrors JobDetailView layout */}
      <div className="px-6 py-2.5 border-b border-border bg-background/60 shrink-0 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="h-4 w-px bg-border" />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground truncate">{meta.label}</p>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
            style={{ background: `${agentColor}10`, color: agentColor, border: `1px solid ${agentColor}30` }}
            title={agentLabel}
          >
            <AgentIcon agent={agentId} size={10} title={agentLabel} />
            {agentLabel}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded capitalize shrink-0"
            style={{ background: `${repoColor}15`, color: repoColor, border: `1px solid ${repoColor}30` }}
          >
            {loop.repo}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setView('terminal')}
            style={view === 'terminal' ? { color: '#8bab8f' } : undefined}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5',
              view === 'terminal'
                ? 'bg-primary/[0.14] border-primary/20'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <TerminalSquare size={12} strokeWidth={view === 'terminal' ? 2.2 : 1.8} /> Terminal
          </button>
          <button
            onClick={() => setView('review')}
            style={view === 'review' ? { color: '#8bab8f' } : undefined}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5',
              view === 'review'
                ? 'bg-primary/[0.14] border-primary/20'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <ClipboardCheck size={12} strokeWidth={view === 'review' ? 2.2 : 1.8} /> Review
          </button>
        </div>
      </div>

      {/* Content area — terminal always mounted (hidden/shown), review conditionally rendered */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0" style={{ display: view === 'terminal' ? 'block' : 'none' }}>
          {hasTerminal ? (
            <TerminalPanel
              sessions={agentTerminals}
              activeSessionId={loop.session}
              isVisible={view === 'terminal'}
              skipPermissions={true}
              onKillSession={onKillSession}
              onUpdateSessionId={onUpdateSessionId}
              onPromptSent={onPromptSent}
              onContextUsage={onContextUsage}
              onJobsChanged={onJobsChanged}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <TypeIcon size={28} className="mx-auto text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground/50">
                  {loop.status === 'in_progress'
                    ? 'Terminal session not found — it may still be initializing.'
                    : 'This loop has ended. No live terminal available.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0 overflow-y-auto px-6 py-5" style={{ display: view === 'review' ? 'block' : 'none' }}>
          <div className="max-w-[50rem] mx-auto w-full">
            <LoopReviewPanel loop={loop} />
          </div>
        </div>
      </div>
    </div>
  )
}
