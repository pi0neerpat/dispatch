import { useState, useMemo } from 'react'
import { ArrowLeft, TerminalSquare, ClipboardCheck } from 'lucide-react'
import { cn } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'
import TerminalPanel from './TerminalPanel'
import ResultsPanel from './ResultsPanel'

export default function JobDetailView({
  jobId,
  onBack,
  agentTerminals,
  swarmFileToSession,
  swarm,
  skipPermissions,
  onKillSession,
  onUpdateSessionId,
  onPromptSent,
  onContextUsage,
  onSwarmRefresh,
  onOverviewRefresh,
  onStartTask,
  showToast,
}) {
  const [view, setView] = useState('review')

  const hasTerminal = agentTerminals.has(jobId)
  const taskInfo = hasTerminal ? agentTerminals.get(jobId) : null
  const repoName = taskInfo?.repoName || ''
  const repoColor = repoIdentityColors[repoName] || 'var(--primary)'

  const swarmFileId = taskInfo?.swarmFile?.fileName?.replace(/\.md$/, '') || null
  const reviewAgentId = swarmFileId || (hasTerminal ? null : jobId)

  const jobLabel = taskInfo?.taskText || 'Worker session'

  const activeTerminalSessionId = hasTerminal ? jobId : (swarmFileToSession?.[jobId] || null)

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-border bg-background/60 shrink-0 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="h-4 w-px bg-border" />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-[13px] font-medium text-foreground truncate">{jobLabel}</p>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded capitalize shrink-0"
            style={{ background: `${repoColor}15`, color: repoColor, border: `1px solid ${repoColor}30` }}
          >
            {repoName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setView('terminal')}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5',
              view === 'terminal'
                ? 'bg-card border-card-border-hover text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <TerminalSquare size={12} /> Terminal
          </button>
          <button
            onClick={() => setView('review')}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded border flex items-center gap-1.5',
              view === 'review'
                ? 'bg-card border-card-border-hover text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <ClipboardCheck size={12} /> Review
          </button>
        </div>
      </div>

      {/* Content area — terminal always mounted (hidden/shown), review conditionally rendered */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0" style={{ display: view === 'terminal' ? 'block' : 'none' }}>
          <TerminalPanel
            sessions={agentTerminals}
            activeSessionId={activeTerminalSessionId}
            skipPermissions={skipPermissions}
            onKillSession={onKillSession}
            onUpdateSessionId={onUpdateSessionId}
            onPromptSent={onPromptSent}
            onContextUsage={onContextUsage}
          />
        </div>

        {view === 'review' && (
          <div className="absolute inset-0 overflow-y-auto px-6 py-5">
            <ResultsPanel
              agentId={reviewAgentId}
              onSwarmRefresh={onSwarmRefresh}
              onOverviewRefresh={onOverviewRefresh}
              onStartTask={onStartTask}
              onBack={onBack}
              showToast={showToast}
            />
          </div>
        )}
      </div>
    </div>
  )
}
