import { useState, useEffect, useMemo } from 'react'
import { MODEL_OPTIONS, CODEX_MODEL_OPTIONS, CURSOR_MODEL_OPTIONS, PI_MODEL_OPTIONS } from './constants'

function getFallback(agent) {
  if (agent === 'codex') return CODEX_MODEL_OPTIONS
  if (agent === 'cursor') return CURSOR_MODEL_OPTIONS
  if (agent === 'pi') return PI_MODEL_OPTIONS
  return MODEL_OPTIONS
}

/**
 * Fetches available models for the given agent from the server (Anthropic API,
 * Codex cache file, Cursor `api2` AvailableModels + keychain token, or Pi RPC).
 * Falls back to hardcoded constants when credentials or upstream calls fail.
 */
export function useAgentModels(agent) {
  const fallback = useMemo(() => getFallback(agent), [agent])
  const [models, setModels] = useState(fallback)

  useEffect(() => {
    let cancelled = false
    setModels(fallback)
    fetch(`/api/agents/models?agent=${encodeURIComponent(agent)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.models?.length > 0) {
          setModels(data.models)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [agent, fallback])

  return models
}
