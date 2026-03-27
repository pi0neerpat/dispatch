import { cn } from '../lib/utils'

/**
 * Reusable toggle/switch.
 *
 * Props:
 *   checked   boolean
 *   onChange  (value: boolean) => void
 *   disabled  boolean (optional)
 *   size      'sm' | 'md' (optional, defaults to 'sm')
 *   className string (optional)
 */
export default function Toggle({ checked, onChange, disabled = false, size = 'sm', className }) {
  const isMd = size === 'md'
  const dotSize = isMd ? 12 : 10
  const translateX = isMd ? 14 : 12
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className={cn(
        'relative shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-none',
        isMd ? 'h-[18px] w-8' : 'h-[16px] w-7',
        checked ? 'border-primary/50 bg-primary/20' : 'border-border bg-card',
        disabled && 'cursor-not-allowed opacity-40',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute rounded-full transition-transform duration-200',
          checked ? 'bg-primary' : 'bg-muted-foreground/50',
        )}
        style={{
          width: dotSize,
          height: dotSize,
          top: 3,
          left: 3,
          transform: checked ? `translateX(${translateX}px)` : 'translateX(0)',
        }}
      />
    </button>
  )
}
