import { cn } from './utils'

export const BUG_COLOR = '#7ea89a'

export function FilterChip({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all capitalize',
        active
          ? ''
          : 'bg-card border-border text-muted-foreground/60 hover:text-muted-foreground hover:border-border'
      )}
      style={active ? (color
        ? { borderColor: `${color}60`, backgroundColor: `${color}18`, color }
        : { borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)', color: '#b0b1b8' }
      ) : undefined}
    >
      {label}
    </button>
  )
}

export function toggleFilter(set, setter, value) {
  setter(prev => {
    const next = new Set(prev)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  })
}

export function loadFilters(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const data = JSON.parse(raw)
    const result = {}
    for (const [key, val] of Object.entries(data)) {
      result[key] = Array.isArray(val) ? new Set(val) : val
    }
    return result
  } catch {
    return null
  }
}

export function saveFilters(storageKey, data) {
  const serialized = {}
  for (const [key, val] of Object.entries(data)) {
    serialized[key] = val instanceof Set ? [...val] : val
  }
  localStorage.setItem(storageKey, JSON.stringify(serialized))
}
