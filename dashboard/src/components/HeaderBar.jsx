import { useState, useEffect } from 'react'
import { Activity, AlertCircle, ShieldOff, Shield } from 'lucide-react'
import { cn } from '../lib/utils'

function ConnectionDot({ connected, lastRefresh }) {
  const [ago, setAgo] = useState('...')

  useEffect(() => {
    if (!lastRefresh) return
    const tick = () => setAgo(`${Math.round((Date.now() - lastRefresh.getTime()) / 1000)}s`)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastRefresh])

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        {connected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-30"
            style={{ background: connected ? 'var(--status-active)' : 'var(--status-failed)' }}
          />
        )}
        <span className="relative inline-flex rounded-full h-1.5 w-1.5"
          style={{ background: connected ? 'var(--status-active)' : 'var(--status-failed)' }}
        />
      </span>
      <span className="text-[10px] text-muted-foreground/70 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
        {connected ? ago : 'offline'}
      </span>
    </div>
  )
}

export default function HeaderBar({ overview, swarm, lastRefresh, error, skipPermissions, onToggleSkipPermissions }) {
  const activeAgents = swarm?.summary?.active || 0
  const needsReview = swarm?.summary?.needsValidation || 0

  const title = overview?.hubRoot
    ?.replace(/\/hub\/?$/, '')
    .split('/')
    .pop()
    ?.toUpperCase() || 'HUB'

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="px-5 py-3 flex items-center justify-between">
        {/* Left: brand */}
        <div className="flex items-center gap-2.5">
          <h1 className="text-sm font-semibold tracking-wide text-foreground/90 leading-none">
            {title}
          </h1>
        </div>

        {/* Right: badges + connection */}
        <div className="flex items-center gap-2.5">
          {activeAgents > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md bg-status-active-bg text-status-active/80">
              <Activity size={10} strokeWidth={2.5} />
              <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{activeAgents}</span>
              <span className="opacity-60 hidden sm:inline">active</span>
            </span>
          )}
          {needsReview > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md bg-status-review-bg text-status-review/80">
              <AlertCircle size={10} strokeWidth={2.5} />
              <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{needsReview}</span>
              <span className="opacity-60 hidden sm:inline">review</span>
            </span>
          )}
          <button
            onClick={onToggleSkipPermissions}
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-all',
              skipPermissions
                ? 'bg-status-review-bg text-status-review/70'
                : 'bg-status-active-bg text-status-active/70'
            )}
            title={skipPermissions
              ? 'Permissions are skipped (--dangerously-skip-permissions). Click to require permissions.'
              : 'Permissions required. Click to skip permissions.'
            }
          >
            {skipPermissions
              ? <><ShieldOff size={10} strokeWidth={2.5} /><span className="hidden sm:inline">YOLO</span></>
              : <><Shield size={10} strokeWidth={2.5} /><span className="hidden sm:inline">Safe</span></>
            }
          </button>
          <ConnectionDot connected={!error} lastRefresh={lastRefresh} />
        </div>
      </div>
    </header>
  )
}
