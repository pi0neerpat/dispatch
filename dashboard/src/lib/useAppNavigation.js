import { useState, useCallback, useEffect } from 'react'

const NAV_ITEMS = ['status', 'jobs', 'tasks', 'dispatch', 'schedules']

export function useAppNavigation() {
  const [activeNav, setActiveNav] = useState(() => {
    try {
      const saved = localStorage.getItem('hub:activeNav')
      if (saved && NAV_ITEMS.includes(saved)) return saved
    } catch {}
    return 'tasks'
  })
  const [drillDownJobId, setDrillDownJobId] = useState(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('hub:activeNav', activeNav) } catch {}
  }, [activeNav])

  const handleNavChange = useCallback((nav) => {
    setActiveNav(nav)
    setDrillDownJobId(null)
  }, [])

  const openJobDetail = useCallback((id) => {
    setActiveNav('jobs')
    setDrillDownJobId(id)
  }, [])

  const openDispatch = useCallback(() => {
    setActiveNav('dispatch')
    setDrillDownJobId(null)
  }, [])

  const closeJobDetail = useCallback(() => {
    setDrillDownJobId(null)
  }, [])

  return {
    activeNav,
    setActiveNav,
    drillDownJobId,
    setDrillDownJobId,
    commandPaletteOpen,
    setCommandPaletteOpen,
    handleNavChange,
    openJobDetail,
    openDispatch,
    closeJobDetail,
  }
}
