import { useState, useCallback, useEffect, useMemo } from 'react'
import { usePolling } from './lib/usePolling'
import { useSearch } from './lib/useSearch'
import HeaderBar from './components/HeaderBar'
import ActivityBar from './components/ActivityBar'
import StatusView from './components/StatusView'
import JobsView from './components/JobsView'
import JobDetailView from './components/JobDetailView'
import AllTasksView from './components/AllTasksView'
import DispatchView from './components/DispatchView'
import SchedulesView from './components/SchedulesView'
import CommandPalette from './components/CommandPalette'
import Toast from './components/Toast'

export default function App() {
  const overview = usePolling('/api/overview', 10000)
  const swarm = usePolling('/api/swarm', 5000)

  // Navigation state
  const [activeNav, setActiveNav] = useState('tasks')
  const [drillDownJobId, setDrillDownJobId] = useState(null)

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [agentTerminals, setAgentTerminals] = useState(() => {
    try {
      const saved = localStorage.getItem('hub:agentTerminals')
      if (saved) {
        const entries = JSON.parse(saved)
        return new Map(entries)
      }
    } catch {}
    return new Map()
  })

  useEffect(() => {
    try {
      localStorage.setItem('hub:agentTerminals', JSON.stringify([...agentTerminals.entries()]))
    } catch {}
  }, [agentTerminals])

  useEffect(() => {
    if (agentTerminals.size === 0) return
    fetch('/api/sessions')
      .then(r => r.json())
      .then(({ sessions }) => {
        const liveIds = new Set(sessions.map(s => s.id))
        setAgentTerminals(prev => {
          let changed = false
          const next = new Map(prev)
          for (const [id, info] of next) {
            if (info.ptySessionId && !liveIds.has(info.ptySessionId)) {
              next.delete(id)
              changed = true
            }
          }
          return changed ? next : prev
        })
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateSessionId = useCallback((clientSessionId, ptySessionId) => {
    setAgentTerminals(prev => {
      const info = prev.get(clientSessionId)
      if (!info || info.ptySessionId === ptySessionId) return prev
      const next = new Map(prev)
      next.set(clientSessionId, { ...info, ptySessionId })
      return next
    })
  }, [])

  const handlePromptSent = useCallback((clientSessionId) => {
    setAgentTerminals(prev => {
      const info = prev.get(clientSessionId)
      if (!info || info.promptSent) return prev
      const next = new Map(prev)
      next.set(clientSessionId, { ...info, promptSent: true })
      return next
    })
  }, [])

  const [skipPermissions, setSkipPermissions] = useState(true)
  const [contextUsage, setContextUsage] = useState(null)
  const [contextResetInfo, setContextResetInfo] = useState(null)
  const [toast, setToast] = useState(null)
  const [dispatchPreFill, setDispatchPreFill] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  const handleContextUsage = useCallback((sessionId, pct, resetMinutes) => {
    setContextUsage(pct)
    if (resetMinutes != null) {
      setContextResetInfo({ resetsAt: Date.now() + resetMinutes * 60 * 1000 })
    }
  }, [])

  const lastRefresh = overview.lastRefresh || swarm.lastRefresh
  const error = overview.error || swarm.error

  const swarmFileToSession = useMemo(() => {
    const map = {}
    for (const [sessionId, info] of agentTerminals) {
      const slug = info.swarmFile?.fileName?.replace(/\.md$/, '')
      if (slug) map[slug] = sessionId
    }
    return map
  }, [agentTerminals])

  // Compute active terminal for context usage tracking
  const activeTerminalSessionId = drillDownJobId && agentTerminals.has(drillDownJobId)
    ? drillDownJobId
    : drillDownJobId ? (swarmFileToSession[drillDownJobId] || null) : null

  useEffect(() => {
    setContextUsage(null)
    setContextResetInfo(null)
  }, [activeTerminalSessionId])

  // Navigation handler — resets drill-down
  const handleNavChange = useCallback((nav) => {
    setActiveNav(nav)
    setDrillDownJobId(null)
  }, [])

  // Start task → create session and navigate to Jobs drill-down
  async function handleStartTask(taskText, repoName, dispatchOpts = {}) {
    const sessionId = 'session-' + Date.now()
    let swarmFile = null

    try {
      const res = await fetch('/api/swarm/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoName,
          taskText,
          sessionId,
          model: dispatchOpts.model || undefined,
          maxTurns: dispatchOpts.maxTurns || undefined,
          autoMerge: dispatchOpts.autoMerge || undefined,
          baseBranch: dispatchOpts.baseBranch || undefined,
        }),
      })
      if (res.ok) {
        swarmFile = await res.json()
      }
    } catch { /* proceed without swarm file */ }

    setAgentTerminals(prev => {
      const next = new Map(prev)
      next.set(sessionId, {
        taskText,
        repoName,
        swarmFile,
        created: Date.now(),
        model: dispatchOpts.model || null,
        maxTurns: dispatchOpts.maxTurns || null,
      })
      return next
    })
    setActiveNav('jobs')
    setDrillDownJobId(sessionId)
  }

  function handleStartWorker(repoName) {
    const sessionId = 'session-' + Date.now()
    setAgentTerminals(prev => {
      const next = new Map(prev)
      next.set(sessionId, { taskText: '', repoName, swarmFile: null, created: Date.now() })
      return next
    })
    setActiveNav('jobs')
    setDrillDownJobId(sessionId)
  }

  const handleKillSession = useCallback((id) => {
    const info = agentTerminals.get(id)
    if (info?.ptySessionId) {
      fetch(`/api/sessions/${encodeURIComponent(info.ptySessionId)}`, { method: 'DELETE' }).catch(() => {})
    }
    setAgentTerminals(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })

    if (drillDownJobId === id) {
      setDrillDownJobId(null)
    }
  }, [agentTerminals, drillDownJobId])

  // Navigate to dispatch with pre-filled values (from task "Start" button)
  const handleNavigateToDispatch = useCallback((repo, prompt) => {
    setDispatchPreFill({ repo, prompt })
    setActiveNav('dispatch')
  }, [])

  // Called after successful dispatch
  const handleDispatchComplete = useCallback(() => {
    setActiveNav('tasks')
    setDispatchPreFill(null)
    showToast('Worker dispatched', 'success')
  }, [showToast])

  // Dispatch handler
  async function handleDispatch({ repo, taskText, baseBranch, model, maxTurns, autoMerge }) {
    await handleStartTask(taskText, repo, { baseBranch, model, maxTurns, autoMerge })
  }

  // Search
  const searchResults = useSearch(searchQuery, overview.data, swarm.data, agentTerminals)

  const handleSearchSelect = useCallback((item) => {
    if (!item) return
    if (item.kind === 'repo' || item.kind === 'task') {
      setActiveNav('tasks')
      setDrillDownJobId(null)
    } else if (item.kind === 'agent') {
      setActiveNav('jobs')
      setDrillDownJobId(item.targetId)
    }
    setSearchQuery('')
    setCommandPaletteOpen(false)
  }, [])

  // Worker selection from task board — navigate to jobs drill-down
  const handleSelectWorker = useCallback(({ id, isSession }) => {
    setActiveNav('jobs')
    setDrillDownJobId(id)
  }, [])

  // Keyboard shortcut for command palette
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Job count for badge
  const jobCount = agentTerminals.size + (swarm.data?.summary?.active || 0)
  const reviewCount = swarm.data?.summary?.needsValidation || 0

  return (
    <div className="h-screen flex flex-col bg-background">
      <HeaderBar
        overview={overview.data}
        swarm={swarm.data}
        lastRefresh={lastRefresh}
        error={error}
        skipPermissions={skipPermissions}
        onToggleSkipPermissions={() => setSkipPermissions(v => !v)}
        contextUsage={contextUsage}
        contextResetInfo={contextResetInfo}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        onSelectSearchResult={handleSearchSelect}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      <div className="flex-1 min-h-0 flex">
        <ActivityBar
          activeNav={activeNav}
          onNavChange={handleNavChange}
          jobCount={jobCount}
          reviewCount={reviewCount}
        />

        <main className="flex-1 min-w-0 min-h-0 flex flex-col relative">
          {/* Always-mounted TerminalPanel for xterm.js state preservation */}
          <div
            className="absolute inset-0 z-10"
            style={{ display: drillDownJobId ? 'block' : 'none' }}
          >
            <JobDetailView
              jobId={drillDownJobId}
              onBack={() => setDrillDownJobId(null)}
              agentTerminals={agentTerminals}
              swarmFileToSession={swarmFileToSession}
              swarm={swarm.data}
              skipPermissions={skipPermissions}
              onKillSession={handleKillSession}
              onUpdateSessionId={handleUpdateSessionId}
              onPromptSent={handlePromptSent}
              onContextUsage={handleContextUsage}
              onSwarmRefresh={swarm.refresh}
              onOverviewRefresh={overview.refresh}
              onStartTask={handleStartTask}
              showToast={showToast}
            />
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto px-6 py-5"
            style={{ display: drillDownJobId ? 'none' : 'block' }}
          >
            {activeNav === 'status' && (
              <StatusView
                overview={overview.data}
                swarm={swarm.data}
                error={error}
                lastRefresh={lastRefresh}
              />
            )}
            {activeNav === 'jobs' && (
              <JobsView
                swarm={swarm.data}
                agentTerminals={agentTerminals}
                swarmFileToSession={swarmFileToSession}
                onSelectJob={(id) => setDrillDownJobId(id)}
              />
            )}
            {activeNav === 'tasks' && (
              <AllTasksView
                overview={overview.data}
                onOverviewRefresh={overview.refresh}
                onNavigateToDispatch={handleNavigateToDispatch}
                swarm={swarm.data}
                agentTerminals={agentTerminals}
                swarmFileToSession={swarmFileToSession}
              />
            )}
            {activeNav === 'dispatch' && (
              <DispatchView
                overview={overview.data}
                onDispatch={handleDispatch}
                initialRepo={dispatchPreFill?.repo || null}
                initialPrompt={dispatchPreFill?.prompt || null}
                onDispatchComplete={handleDispatchComplete}
              />
            )}
            {activeNav === 'schedules' && (
              <SchedulesView
                overview={overview.data}
              />
            )}
          </div>
        </main>
      </div>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        repos={overview.data?.repos || []}
        activeNav={activeNav}
        searchResults={searchResults}
        onSelectResult={handleSearchSelect}
        activeWorkers={agentTerminals}
        onStartWorker={handleStartWorker}
        onKillSession={handleKillSession}
        onNavChange={handleNavChange}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
