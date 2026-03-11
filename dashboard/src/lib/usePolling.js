import { useState, useEffect, useRef, useCallback } from 'react'

export function usePolling(url, intervalMs) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const controllerRef = useRef(null)

  const fetchData = useCallback(async () => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      setData(json)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, intervalMs)
    return () => {
      clearInterval(id)
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [fetchData, intervalMs])

  return { data, loading, error, lastRefresh, refresh: fetchData }
}
