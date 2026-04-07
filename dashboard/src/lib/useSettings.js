import { useState, useCallback } from 'react'

const STORAGE_KEY = 'hub-settings'

const DEFAULT_SETTINGS = {
  agents: {
    claude: { defaultModel: 'claude-opus-4-6', defaultMaxTurns: 10, skipPermissions: false, tuiMode: true, extraFlags: '' },
    codex: { defaultModel: 'gpt-5.4', defaultMaxTurns: null, skipPermissions: false, tuiMode: false, extraFlags: '' },
    cursor: { defaultModel: 'claude-4.6-opus-high-thinking', defaultMaxTurns: null, skipPermissions: false, tuiMode: true, extraFlags: '' },
    pi: { defaultModel: 'google/gemini-2.5-pro', defaultMaxTurns: null, skipPermissions: false, tuiMode: true, extraFlags: '' },
  },
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    // Merge with defaults so new keys are populated
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      agents: {
        ...DEFAULT_SETTINGS.agents,
        ...(parsed.agents || {}),
        claude: { ...DEFAULT_SETTINGS.agents.claude, ...(parsed.agents?.claude || {}) },
        codex: { ...DEFAULT_SETTINGS.agents.codex, ...(parsed.agents?.codex || {}) },
        cursor: { ...DEFAULT_SETTINGS.agents.cursor, ...(parsed.agents?.cursor || {}) },
        pi: { ...DEFAULT_SETTINGS.agents.pi, ...(parsed.agents?.pi || {}) },
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { }
}

export function useSettings() {
  const [settings, setSettings] = useState(() => loadSettings())

  const updateAgent = useCallback((agentId, patch) => {
    setSettings(prev => {
      const next = {
        ...prev,
        agents: {
          ...prev.agents,
          [agentId]: { ...prev.agents[agentId], ...patch },
        },
      }
      saveSettings(next)
      return next
    })
  }, [])

  return { settings, updateAgent }
}
