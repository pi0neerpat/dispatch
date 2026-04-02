import { useEffect } from 'react'
import { Code2, ScanSearch, GitFork } from 'lucide-react'
import { cn } from '../lib/utils'
import { AGENT_OPTIONS, getAgentBrandColor } from '../lib/constants'
import { useAgentModels } from '../lib/useAgentModels'
import AgentIcon from './AgentIcon'

export const LOOP_TYPES = [
  { id: 'linear-implementation', label: 'Linear Impl',     icon: Code2 },
  { id: 'linear-review',         label: 'Linear Review',   icon: ScanSearch },
  { id: 'parallel-review',       label: 'Parallel Review', icon: GitFork },
]

/** Compact agent + model picker — mirrors DispatchSettingsRow's Agent+Model section */
export function AgentModelPicker({ label, value, onChange }) {
  const models = useAgentModels(value.agent)

  // Snap model to first option when agent changes and current model isn't valid
  useEffect(() => {
    if (models.length > 0 && !models.find(m => m.value === value.model)) {
      onChange({ ...value, model: models[0].value })
    }
  }, [models, onChange, value])

  return (
    <div>
      {label && <label className="block text-[11px] font-medium text-muted-foreground mb-1">{label}</label>}
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1">
          {AGENT_OPTIONS.map(opt => {
            const isSelected = value.agent === opt.id
            const brandColor = getAgentBrandColor(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ agent: opt.id, model: '' })}
                style={isSelected ? { color: brandColor, borderColor: `${brandColor}40`, backgroundColor: `${brandColor}18` } : undefined}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium border transition-colors',
                  isSelected
                    ? 'border-transparent'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
                )}
              >
                <AgentIcon agent={opt.id} size={12} />
                {opt.label}
              </button>
            )
          })}
        </div>
        <select
          value={value.model}
          onChange={e => onChange({ ...value, model: e.target.value })}
          className="h-8 px-2.5 rounded-md border border-border bg-card text-[12px] text-foreground focus:outline-none focus:border-primary/30 w-44"
        >
          {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
    </div>
  )
}

export function defaultAgentModel() {
  return { agent: 'claude', model: '' }
}

export function fmtAgent({ agent, model }) {
  return model ? `${agent}:${model}` : agent
}
