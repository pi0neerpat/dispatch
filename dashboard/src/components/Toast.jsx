import { useEffect } from 'react'
import { X, CheckCircle, Info } from 'lucide-react'
import { cn } from '../lib/utils'

export default function Toast({ message, type = 'info', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss?.(), 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const isSuccess = type === 'success'

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-in">
      <div
        className={cn(
          'flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-lg border bg-card shadow-lg min-w-[200px] max-w-[360px]',
          isSuccess ? 'border-l-4 border-l-status-active border-y-border border-r-border' : 'border-l-4 border-l-primary border-y-border border-r-border'
        )}
      >
        {isSuccess ? (
          <CheckCircle size={14} className="text-status-active shrink-0" />
        ) : (
          <Info size={14} className="text-primary shrink-0" />
        )}
        <span className="text-[12px] text-foreground flex-1">{message}</span>
        <button
          onClick={onDismiss}
          className="text-muted-foreground/50 hover:text-foreground p-0.5 transition-colors shrink-0"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
