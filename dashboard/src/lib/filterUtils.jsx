import { cn } from './utils'

export const BUG_COLOR = '#7ea89a'

export function getFilterChipClassName(active, className = '') {
  return cn(
    'border font-medium transition-colors',
    active
      ? 'hover:brightness-105'
      : 'hover:brightness-110',
    className
  )
}

export function getFilterChipStyle(active, color) {
  return {
    backgroundColor: active
      ? (color ? `${color}16` : 'var(--secondary)')
      : 'var(--tertiary)',
    color: active ? 'var(--secondary-foreground)' : 'var(--tertiary-foreground)',
    borderColor: color
      ? (active ? `${color}4a` : `${color}22`)
      : (active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'),
    boxShadow: active
      ? (color ? `inset 0 0 0 1px ${color}10` : 'inset 0 0 0 1px rgba(255,255,255,0.03)')
      : 'none',
  }
}

export function FilterChip({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={getFilterChipClassName(active, 'text-[11px] px-2.5 py-1 rounded-full capitalize')}
      style={getFilterChipStyle(active, color)}
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
  try {
    const serialized = {}
    for (const [key, val] of Object.entries(data)) {
      serialized[key] = val instanceof Set ? [...val] : val
    }
    localStorage.setItem(storageKey, JSON.stringify(serialized))
  } catch { /* QuotaExceededError in private mode — non-fatal */ }
}
