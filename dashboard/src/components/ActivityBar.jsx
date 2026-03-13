import { Activity, Bot, ListTodo, Send, CalendarClock } from 'lucide-react'
import { cn } from '../lib/utils'

const NAV_ITEMS = [
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'jobs', label: 'Jobs', icon: Bot },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'dispatch', label: 'Dispatch', icon: Send },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
]

export default function ActivityBar({ activeNav, onNavChange, jobCount = 0, reviewCount = 0 }) {
  return (
    <aside className="w-[60px] shrink-0 border-r border-border bg-background flex flex-col items-center pt-2 gap-1">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon
        const isActive = activeNav === item.id
        const badge = item.id === 'jobs' ? jobCount : item.id === 'status' && reviewCount > 0 ? reviewCount : 0

        return (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className={cn(
              'relative w-[52px] flex flex-col items-center gap-0.5 py-2 rounded-md transition-all',
              isActive
                ? 'text-primary bg-primary/8 border-l-2 border-l-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50 border-l-2 border-l-transparent'
            )}
            title={item.label}
          >
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>

            {badge > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-status-active text-[8px] font-bold text-primary-foreground px-0.5">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        )
      })}
    </aside>
  )
}
