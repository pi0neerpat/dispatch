import { useRef, useCallback, useEffect, useState } from 'react'
import { TerminalSquare, RefreshCw, RotateCcw, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTerminal } from '../lib/useTerminal'

function TerminalInstance({ sessionId, taskInfo, visible, skipPermissions, onKill, confirmKill, onUpdateSessionId }) {
  const sendCommandRef = useRef(null)
  const sendRawRef = useRef(null)
  const promptSentRef = useRef(false)

  const onConnected = useCallback(() => {
    // Launch claude interactively after shell is ready
    setTimeout(() => {
      const flags = skipPermissions ? ' --dangerously-skip-permissions' : ''
      sendCommandRef.current?.('claude' + flags)
    }, 500)
  }, [skipPermissions])

  // Watch for terminal output to detect when claude is ready, then send /swarm prompt
  const onTerminalData = useCallback((data) => {
    if (promptSentRef.current || !taskInfo?.taskText) return
    // Claude Code uses ❯ (U+276F) as its interactive prompt character
    // Also check for "bypass permissions" which appears in the status bar when ready
    if (data.includes('\u276F') || data.includes('bypass permissions')) {
      promptSentRef.current = true
      // Build the /swarm prompt with progress file path if available
      let prompt = '/swarm ' + taskInfo.taskText
      if (taskInfo.swarmFile?.relativePath) {
        prompt += `\n\nWrite progress to: ${taskInfo.swarmFile.relativePath}`
      }
      // Send text first, then Enter separately so Claude Code's TUI processes them in order
      setTimeout(() => {
        sendRawRef.current?.(prompt)
        // Send Enter after a brief delay to let the TUI render the typed text
        setTimeout(() => {
          sendRawRef.current?.('\r')
        }, 200)
      }, 1000)
    }
  }, [taskInfo])

  // When server assigns a session ID, store it so we can reconnect later
  const handleSessionId = useCallback((id) => {
    onUpdateSessionId?.(sessionId, id)
  }, [sessionId, onUpdateSessionId])

  const { termRef, isConnected, sendCommand, sendRaw, reconnect } = useTerminal({
    onConnected,
    onIncomingData: onTerminalData,
    repo: taskInfo?.repoName,
    sessionId: taskInfo?.ptySessionId || null,
    onSessionId: handleSessionId,
  })

  useEffect(() => {
    sendCommandRef.current = sendCommand
    sendRawRef.current = sendRaw
  }, [sendCommand, sendRaw])

  const handleRestart = useCallback(() => {
    promptSentRef.current = false
    reconnect()
  }, [reconnect])

  const handleReconnect = useCallback(() => {
    reconnect({ reattach: true })
  }, [reconnect])

  return (
    <div
      className="flex flex-col h-full"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      {/* Status bar — kill button lives here to avoid overlap */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-background/60 shrink-0">
        <TerminalSquare size={12} className="text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Terminal</span>
        <div className="flex-1" />
        <button
          onClick={handleRestart}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground/40 hover:text-primary hover:bg-primary-glow border border-transparent hover:border-primary/10 transition-all"
          title="Restart session"
        >
          <RotateCcw size={10} />
          Restart
        </button>
        {onKill && (
          <button
            onClick={onKill}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all',
              confirmKill
                ? 'bg-status-failed-bg text-status-failed border border-status-failed-border'
                : 'text-muted-foreground/40 hover:text-status-failed hover:bg-status-failed-bg border border-transparent hover:border-status-failed-border'
            )}
            title="Kill this worker bee"
          >
            <X size={10} />
            {confirmKill ? 'Confirm?' : 'Kill'}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            isConnected ? 'bg-status-active' : 'bg-status-failed'
          )} />
          <span className="text-[10px] text-muted-foreground">
            {isConnected ? 'connected' : 'disconnected'}
          </span>
        </div>
        {!isConnected && (
          <button
            onClick={handleReconnect}
            className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            <RefreshCw size={10} />
            reconnect
          </button>
        )}
      </div>

      {/* Terminal container */}
      <div
        ref={termRef}
        className="flex-1 min-h-0"
        style={{ padding: '4px', isolation: 'isolate' }}
      />
    </div>
  )
}

export default function TerminalPanel({ sessions, activeSessionId, skipPermissions, onKillSession, onUpdateSessionId }) {
  const hasTerminal = activeSessionId && sessions.has(activeSessionId)
  const [confirmKill, setConfirmKill] = useState(null)

  useEffect(() => {
    setConfirmKill(null)
  }, [activeSessionId])

  function handleKill(id) {
    if (confirmKill === id) {
      onKillSession?.(id)
      setConfirmKill(null)
    } else {
      setConfirmKill(id)
      setTimeout(() => setConfirmKill(prev => prev === id ? null : prev), 3000)
    }
  }

  return (
    <div className="h-full relative">
      {/* Render a TerminalInstance for each session */}
      {[...sessions.entries()].map(([id, info]) => (
        <div key={id} className="absolute inset-0" style={{ display: hasTerminal && id === activeSessionId ? 'block' : 'none' }}>
          <TerminalInstance
            sessionId={id}
            taskInfo={info}
            visible={hasTerminal && id === activeSessionId}
            skipPermissions={skipPermissions}
            onKill={() => handleKill(id)}
            confirmKill={confirmKill === id}
            onUpdateSessionId={onUpdateSessionId}
          />
        </div>
      ))}

      {/* Placeholder when no terminal for this worker */}
      {!hasTerminal && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <TerminalSquare size={24} className="mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/50">No terminal for this worker.</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Use Start on a task to create one.</p>
          </div>
        </div>
      )}
    </div>
  )
}
