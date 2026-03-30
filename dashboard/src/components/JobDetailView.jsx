import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, TerminalSquare, ClipboardCheck } from 'lucide-react'
import { cn } from '../lib/utils'
import { repoIdentityColors, normalizeAgentId, getAgentBrandColor } from '../lib/constants'
import AgentIcon, { getAgentLabel } from './AgentIcon'
import TerminalPanel from './TerminalPanel'
import ResultsPanel from './ResultsPanel'

export default function JobDetailView({
  jobId,
  onBack,
  agentTerminals,
  jobFileToSession,
  swarm,
  skipPermissions,
  onKillSession,
  onUpdateSessionId,
  onPromptSent,
  onContextUsage,
  onJobsChanged,
  onJobsRefresh,
  onOverviewRefresh,
  onStartTask,
  onResumeJob,
  onRemoveSession,
  showToast,
  settings,
}) {
  const [view, setView] = useState('review')
  const [runDevSession, setRunDevSession] = useState(null)

  const hasTerminal = agentTerminals.has(jobId)
  const taskInfo = hasTerminal ? agentTerminals.get(jobId) : null
  const activePlainOutput = taskInfo?.plainOutput ?? false

  // Auto-select the appropriate tab when the job changes or when a terminal
  // first becomes available (handles page-refresh reconstruction delay)
  useEffect(() => {
    if (!jobId) return
    if (taskInfo && taskInfo.ptySessionId) {
      setView(activePlainOutput ? 'review' : 'terminal')
    } else if (!hasTerminal) {
      setView('review')
    }
  }, [jobId, hasTerminal, activePlainOutput]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRunDevSession(null)
  }, [jobId])

  const linkedJob = useMemo(() => {
    const jobs = swarm?.agents || []
    if (jobs.length === 0) return null

    const candidateIds = [
      taskInfo?.jobFile?.fileName?.replace(/\.md$/, '') || null,
      jobId,
    ].filter(Boolean)

    for (const candidateId of candidateIds) {
      const matched = jobs.find(agent => agent.id === candidateId)
      if (matched) return matched
    }

    return jobs.find(agent => agent.session === jobId) || null
  }, [swarm, taskInfo?.jobFile?.fileName, jobId])

  const repoName = taskInfo?.repoName || runDevSession?.repoName || linkedJob?.repo || ''
  const repoColor = repoIdentityColors[repoName] || 'var(--primary)'

  const swarmFileId = taskInfo?.jobFile?.fileName?.replace(/\.md$/, '') || null
  const reviewAgentId = swarmFileId || (hasTerminal ? null : jobId)

  const jobLabel = taskInfo?.taskText || runDevSession?.taskText || linkedJob?.taskName || 'Worker session'
  const normalizedAgent = normalizeAgentId(taskInfo?.agent || linkedJob?.agent || 'claude')
  const agentLabel = getAgentLabel(normalizedAgent)
  const agentColor = getAgentBrandColor(normalizedAgent)

  const sessionsForTerminal = useMemo(() => {
    if (!runDevSession) return agentTerminals
    const merged = new Map(agentTerminals)
    const existing = agentTerminals.get(runDevSession.sessionId) || {}
    merged.set(runDevSession.sessionId, {
      ...existing,
      ...runDevSession,
      alive: existing.alive ?? runDevSession.alive,
      serverStarted: true,
    })
    return merged
  }, [agentTerminals, runDevSession])

  const activeTerminalSessionId = runDevSession?.sessionId || (hasTerminal ? jobId : (jobFileToSession?.[jobId] || null))
  const activeTerminalInfo = activeTerminalSessionId ? sessionsForTerminal.get(activeTerminalSessionId) : null
  const hasLiveTerminal = Boolean(activeTerminalInfo && activeTerminalInfo.alive !== false)

  const handleRunDev = async () => {
    if (!reviewAgentId) return
    try {
      const res = await fetch(`/api/jobs/${reviewAgentId}/run-dev`, { method: 'POST' })
      if (!res.ok) {
        showToast?.('No startScript configured')
        return
      }
      const { sessionId, shellCommand, repoName: responseRepoName } = await res.json()
      setRunDevSession({
        sessionId,
        repoName: responseRepoName || repoName,
        taskText: 'Run dev server',
        shellCommand,
        ptySessionId: sessionId,
        alive: true,
      })
      setView('terminal')
    } catch {
      showToast?.('Failed to start run session')
    }
  }

  const handleKillTerminalSession = (sessionId) => {
    if (runDevSession?.sessionId && sessionId === runDevSession.sessionId) {
      fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {})
      setRunDevSession(prev => (
        prev?.sessionId === sessionId ? { ...prev, alive: false } : prev
      ))
      return
    }
    onKillSession?.(sessionId)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
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
          <p className="text-[13px] font-medium text-foreground truncate">{jobLabel}</p>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
            style={{ background: `${agentColor}10`, color: agentColor, border: `1px solid ${agentColor}30` }}
            title={agentLabel}
          >
            <AgentIcon agent={normalizedAgent} size={10} title={agentLabel} />
            {agentLabel}
          </span>
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
          <TerminalPanel
            sessions={sessionsForTerminal}
            activeSessionId={activeTerminalSessionId}
            isVisible={view === 'terminal'}
            skipPermissions={skipPermissions}
            onKillSession={handleKillTerminalSession}
            onUpdateSessionId={onUpdateSessionId}
            onPromptSent={onPromptSent}
            onContextUsage={onContextUsage}
            onJobsChanged={onJobsChanged}
          />
        </div>

        <div className="absolute inset-0 overflow-y-auto px-6 py-5" style={{ display: view === 'review' ? 'block' : 'none' }}>
          <div className="max-w-[50rem] mx-auto w-full">
            <ResultsPanel
              agentId={reviewAgentId}
              hasLiveTerminal={hasLiveTerminal}
              onJobsRefresh={onJobsRefresh}
              onOverviewRefresh={onOverviewRefresh}
              onStartTask={onStartTask}
              onResumeJob={onResumeJob}
              onBack={onBack}
              onRemoveSession={() => onRemoveSession?.(jobId)}
              onRunDev={handleRunDev}
              showToast={showToast}
              settings={settings}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
