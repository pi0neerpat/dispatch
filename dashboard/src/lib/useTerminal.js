import { useRef, useState, useEffect, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

const THEME = {
  background: '#19191d',
  foreground: '#bababf',
  cursor: '#8b95f7',
  selectionBackground: '#2a2a2f',
  black: '#19191d',
  red: '#d47272',
  green: '#5ebd9e',
  yellow: '#c9a644',
  blue: '#8b95f7',
  magenta: '#a07bf5',
  cyan: '#7aadcc',
  white: '#bababf',
}

export function useTerminal({ onConnected, onIncomingData, repo, sessionId, onSessionId } = {}) {
  const termRef = useRef(null)
  const terminalRef = useRef(null)
  const fitAddonRef = useRef(null)
  const wsRef = useRef(null)
  const onConnectedRef = useRef(onConnected)
  const onIncomingDataRef = useRef(onIncomingData)
  const onSessionIdRef = useRef(onSessionId)
  const isReattachRef = useRef(false)
  const [isConnected, setIsConnected] = useState(false)

  // Keep callback refs fresh without re-triggering effect
  onConnectedRef.current = onConnected
  onIncomingDataRef.current = onIncomingData
  onSessionIdRef.current = onSessionId

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const params = new URLSearchParams()
    if (repo) params.set('repo', repo)
    if (sessionId) params.set('session', sessionId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const ws = new WebSocket(`${protocol}//${location.host}/ws/terminal${qs}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      // Send initial resize
      if (terminalRef.current) {
        const { cols, rows } = terminalRef.current
        ws.send(`\x01RESIZE:${cols},${rows}`)
      }
      // Only fire onConnected for new sessions, not reattachments
      // (reattach replays scrollback, so we don't want to re-launch claude)
      if (!isReattachRef.current) {
        onConnectedRef.current?.()
      }
      isReattachRef.current = false
    }

    ws.onmessage = (evt) => {
      const data = evt.data
      // Handle session ID assignment from server
      if (data.startsWith('\x01SESSION:')) {
        const assignedId = data.slice(9)
        onSessionIdRef.current?.(assignedId)
        return
      }
      terminalRef.current?.write(data)
      onIncomingDataRef.current?.(data)
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onerror = () => {
      setIsConnected(false)
    }
  }, [])

  const sendRaw = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const sendCommand = useCallback((text) => {
    sendRaw(text + '\r')
  }, [sendRaw])

  const reconnect = useCallback(({ reattach = false } = {}) => {
    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
      wsRef.current = null
    }
    // Clear terminal before reconnecting
    terminalRef.current?.clear()
    isReattachRef.current = reattach
    connect()
  }, [connect])

  useEffect(() => {
    if (!termRef.current) return

    const terminal = new Terminal({
      theme: THEME,
      fontFamily: "'Geist Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: true,
    })
    terminalRef.current = terminal

    const fitAddon = new FitAddon()
    fitAddonRef.current = fitAddon
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    terminal.open(termRef.current)

    // Fit after a short delay to ensure container is sized
    requestAnimationFrame(() => {
      try { fitAddon.fit() } catch {}
    })

    // Send keystrokes to WebSocket
    terminal.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(data)
      }
    })

    // Observe container resize
    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && terminal.cols && terminal.rows) {
          wsRef.current.send(`\x01RESIZE:${terminal.cols},${terminal.rows}`)
        }
      } catch {}
    })
    observer.observe(termRef.current)

    connect()

    return () => {
      observer.disconnect()
      terminal.dispose()
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
      }
    }
  }, [connect])

  return { termRef, isConnected, sendCommand, sendRaw, reconnect }
}
