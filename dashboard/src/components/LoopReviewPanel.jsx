import { useMemo } from 'react'
import { Clock, Code2, ScanSearch, GitFork, RefreshCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, timeAgo } from '../lib/utils'
import { repoIdentityColors, normalizeAgentId, getAgentBrandColor } from '../lib/constants'
import { usePolling } from '../lib/usePolling'
import { mdComponents } from './mdComponents'
import AgentIcon, { getAgentLabel } from './AgentIcon'

const LOOP_TYPE_META = {
  'linear-implementation': { label: 'Linear Implementation', icon: Code2 },
  'linear-review':         { label: 'Linear Review',         icon: ScanSearch },
  'parallel-review':       { label: 'Parallel Review',       icon: GitFork },
}

const VERDICT_COLORS = {
  PASS: '#4ade80',
  FAIL: '#f87171',
}

export default function LoopReviewPanel({ loop }) {
  const meta = LOOP_TYPE_META[loop?.loopType] || { label: loop?.loopType || 'Unknown', icon: RefreshCcw }
  const TypeIcon = meta.icon
  const repoColor = repoIdentityColors[loop?.repo] || 'var(--primary)'
  const agentId = normalizeAgentId((loop?.agent || 'claude').split(':')[0])
  const agentLabel = getAgentLabel(agentId)
  const agentColor = getAgentBrandColor(agentId)
  const duration = loop?.durationMinutes != null ? timeAgo(null, loop.durationMinutes) : null
  const isActive = loop?.status === 'in_progress'

  // Build artifacts URL from loop ID (loopType/timestamp)
  const artifactsUrl = useMemo(() => {
    if (!loop?.id) return null
    const parts = loop.id.split('/')
    if (parts.length < 2) return null
    return `/api/loops/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts.slice(1).join('/'))}/artifacts`
  }, [loop?.id])

  const artifacts = usePolling(artifactsUrl, isActive ? 10000 : null)
  const data = artifacts.data
  const iterations = data?.iterations || []
  const artifactList = data?.artifacts || []

  // Group artifacts by iteration, most recent first
  const iterationGroups = useMemo(() => {
    if (iterations.length === 0 && artifactList.length === 0) return []
    // Collect iteration numbers from both sources
    const iterNums = new Set([
      ...iterations.map(i => i.number),
      ...artifactList.filter(a => a.iteration != null).map(a => a.iteration),
    ])
    const groups = [...iterNums].sort((a, b) => b - a).map(num => {
      const iterInfo = iterations.find(i => i.number === num)
      const arts = artifactList.filter(a => a.iteration === num)
      return { number: num, timestamp: iterInfo?.timestamp || null, verdict: iterInfo?.verdict || null, artifacts: arts }
    })
    return groups
  }, [iterations, artifactList])

  return (
    <div className="space-y-5">
      {/* Metadata card */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0"
            style={{ color: repoColor, background: `${repoColor}12`, borderColor: `${repoColor}30` }}
          >
            <TypeIcon size={13} />
          </span>
          <span className="text-[13px] font-semibold text-foreground">{meta.label}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium capitalize"
            style={{ background: `${repoColor}10`, color: repoColor, borderColor: `${repoColor}30` }}
          >
            {loop?.repo}
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: agentColor }}>
            <AgentIcon agent={agentId} size={10} />
            {loop?.agent || agentLabel}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
          {loop?.started && <span>Started: <strong className="text-foreground">{loop.started}</strong></span>}
          {duration && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {duration}
            </span>
          )}
          {loop?.loopState?.iteration > 0 && (
            <span>Iterations: <strong className="text-foreground">{loop.loopState.iteration}</strong></span>
          )}
          <span>Status: <strong className="text-foreground capitalize">{loop?.status === 'in_progress' ? 'running' : loop?.status}</strong></span>
          {loop?.loopState?.lastVerdict && (
            <span>Verdict: <strong className="text-foreground">{loop.loopState.lastVerdict}</strong></span>
          )}
        </div>
      </div>

      {/* Artifacts list grouped by iteration */}
      {iterationGroups.length === 0 ? (
        <div className="py-12 text-center">
          {isActive ? (
            <>
              <Loader2 size={24} className="mx-auto mb-2 text-muted-foreground/30 animate-spin" />
              <p className="text-[12px] text-muted-foreground/50">Awaiting review output…</p>
            </>
          ) : (
            <>
              <TypeIcon size={24} className="mx-auto mb-2 text-muted-foreground/20" />
              <p className="text-[12px] text-muted-foreground/50">No review artifacts found.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {iterationGroups.map(group => {
            const verdictColor = group.verdict ? (VERDICT_COLORS[group.verdict] || '#888') : null
            return (
              <div key={group.number}>
                {/* Iteration header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-semibold text-foreground">Iteration {group.number}</span>
                  {group.timestamp && (
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{group.timestamp}</span>
                  )}
                  {group.verdict && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                      style={{ color: verdictColor, borderColor: `${verdictColor}40`, background: `${verdictColor}10` }}
                    >
                      {group.verdict === 'PASS' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {group.verdict}
                    </span>
                  )}
                </div>

                {/* Artifact blocks */}
                {group.artifacts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/40 pl-2">No artifacts for this iteration.</p>
                ) : (
                  <div className="space-y-3">
                    {group.artifacts.map(art => (
                      <div key={art.name} className="border border-border rounded-lg overflow-hidden">
                        <div className="px-3 py-1.5 border-b border-border bg-card/50 flex items-center gap-2">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium capitalize',
                            art.type === 'review' && 'text-blue-400 bg-blue-400/10',
                            art.type === 'synthesis' && 'text-purple-400 bg-purple-400/10',
                            art.type === 'verification' && 'text-amber-400 bg-amber-400/10',
                            art.type === 'unknown' && 'text-muted-foreground bg-card',
                          )}>
                            {art.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40 font-mono">{art.name}</span>
                        </div>
                        <div className="px-4 py-3 text-[13px] leading-relaxed prose-sm max-w-none">
                          <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                            {art.content || '*Empty*'}
                          </Markdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
