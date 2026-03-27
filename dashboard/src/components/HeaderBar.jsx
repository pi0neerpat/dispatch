import { useEffect, useRef } from 'react'
import { Activity, AlertCircle, Search, Command } from 'lucide-react'

function ConnectionDot({ connected }) {
  return (
    <span className="relative flex h-1.5 w-1.5" title={connected ? 'Connected' : 'Offline'}>
      {connected && (
        <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full" style={{ background: 'var(--status-active)' }} />
      )}
      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: connected ? 'var(--status-active)' : 'var(--status-failed)' }} />
    </span>
  )
}

export default function HeaderBar({
  overview,
  activeJobCount = 0,
  reviewCount = 0,
  error,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onSelectSearchResult,
  onOpenCommandPalette,
}) {

  const searchContainerRef = useRef(null)

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        onSearchQueryChange?.('')
      }
    }
    if (searchQuery) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [searchQuery, onSearchQueryChange])

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="px-6 py-2 flex items-center gap-4">
        <h1 className="text-sm font-medium leading-none tracking-wider shrink-0" style={{ fontFamily: 'var(--font-display)', color: '#8bab8f' }}>
          Work↓Down
        </h1>
        <div className="relative flex-1 max-w-lg" ref={searchContainerRef}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card">
            <Search size={13} className="text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange?.(e.target.value)}
              placeholder="Search repos, tasks, workers"
              className="w-full bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <button
              onClick={() => onOpenCommandPalette?.()}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
              title="Open command palette"
            >
              <Command size={11} />
              K
            </button>
          </div>

          {searchQuery && searchResults?.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-lg border shadow-xl max-h-64 overflow-y-auto p-1.5" style={{ background: '#242329', borderColor: 'rgba(255,255,255,0.06)' }}>
              {searchResults.slice(0, 8).map(item => (
                <button
                  key={item.key}
                  onClick={() => onSelectSearchResult?.(item)}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-card transition-colors"
                >
                  <p className="text-[12px] text-foreground truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">{item.subtitle}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeJobCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded bg-status-active-bg text-status-active">
              <Activity size={10} strokeWidth={2.5} />
              <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{activeJobCount}</span>
              <span className="opacity-60 hidden sm:inline">active</span>
            </span>
          )}
          {reviewCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded bg-status-review-bg text-status-review">
              <AlertCircle size={10} strokeWidth={2.5} />
              <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{reviewCount}</span>
              <span className="opacity-60 hidden sm:inline">review</span>
            </span>
          )}
          <ConnectionDot connected={!error} />
        </div>
      </div>
    </header>
  )
}
