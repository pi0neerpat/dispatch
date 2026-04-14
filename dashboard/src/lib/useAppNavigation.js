import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NAV_ITEMS = ['status', 'jobs', 'loops', 'tasks', 'plans', 'dispatch', 'schedules']

/** Derive the activeNav tab from the current URL pathname. */
export function navFromPath(pathname) {
  const seg = pathname.split('/').filter(Boolean)[0] || ''
  if (NAV_ITEMS.includes(seg)) return seg
  return 'tasks' // fallback
}

export function useAppNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeNav = navFromPath(location.pathname)

  // drillDownJobId is derived from URL: /jobs/:jobId
  const segments = location.pathname.split('/').filter(Boolean)
  const drillDownJobId = segments[0] === 'jobs' && segments[1]
    ? decodeURIComponent(segments[1])
    : null

  // drillDownLoopId is derived from URL: /loops/:repo/:loopType/:timestamp or /loops/session/:sessionId
  const drillDownLoopId = segments[0] === 'loops' && segments[1] === 'session' && segments[2]
    ? `session:${decodeURIComponent(segments[2])}`
    : segments[0] === 'loops' && segments[1] && segments[2] && segments[3]
      ? `${decodeURIComponent(segments[1])}/${decodeURIComponent(segments[2])}/${decodeURIComponent(segments[3])}`
      : null

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const setActiveNav = useCallback((nav) => {
    if (NAV_ITEMS.includes(nav)) {
      navigate(`/${nav}`)
    }
  }, [navigate])

  const handleNavChange = useCallback((nav) => {
    if (NAV_ITEMS.includes(nav)) {
      navigate(`/${nav}`)
    }
  }, [navigate])

  const openJobDetail = useCallback((id) => {
    navigate(`/jobs/${encodeURIComponent(id)}`)
  }, [navigate])

  const openLoopDetail = useCallback((loopId) => {
    // loopId is "repo/loopType/timestamp" e.g. "prompt-guard/linear-review/2026-04-14T15-30-00"
    const parts = loopId.split('/')
    if (parts.length >= 3) {
      navigate(`/loops/${parts[0]}/${parts[1]}/${parts.slice(2).join('/')}`)
    } else {
      navigate(`/loops/${parts.join('/')}`)
    }
  }, [navigate])

  const openLoopBySession = useCallback((sessionId) => {
    navigate(`/loops/session/${encodeURIComponent(sessionId)}`)
  }, [navigate])

  const openDispatch = useCallback(() => {
    navigate('/dispatch')
  }, [navigate])

  const closeJobDetail = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const setDrillDownJobId = useCallback((id) => {
    if (id) {
      navigate(`/jobs/${encodeURIComponent(id)}`)
    } else {
      navigate('/jobs')
    }
  }, [navigate])

  return {
    activeNav,
    setActiveNav,
    drillDownJobId,
    drillDownLoopId,
    setDrillDownJobId,
    commandPaletteOpen,
    setCommandPaletteOpen,
    handleNavChange,
    openJobDetail,
    openLoopDetail,
    openLoopBySession,
    openDispatch,
    closeJobDetail,
  }
}
