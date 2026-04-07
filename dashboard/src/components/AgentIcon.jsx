import { Sparkles, MousePointer2 } from 'lucide-react'
import clawdIcon from '../clawd.png'
import { getAgentBrandColor, normalizeAgentId } from '../lib/constants'
import { cn } from '../lib/utils'

function labelForAgent(agentId) {
  const normalized = normalizeAgentId(agentId)
  if (normalized === 'codex') return 'Codex'
  if (normalized === 'cursor') return 'Cursor'
  if (normalized === 'pi') return 'Pi'
  return 'Claude'
}

export function getAgentLabel(agentId) {
  return labelForAgent(agentId)
}

export default function AgentIcon({ agent = 'claude', size = 14, className, color, title, style }) {
  const normalizedAgent = normalizeAgentId(agent)
  const label = labelForAgent(normalizedAgent)

  if (normalizedAgent === 'claude') {
    return (
      <img
        src={clawdIcon}
        alt={`${label} icon`}
        width={size}
        height={size}
        title={title || `${label} icon`}
        className={cn('shrink-0 object-contain', className)}
        style={style}
      />
    )
  }

  if (normalizedAgent === 'cursor') {
    return (
      <MousePointer2
        size={size}
        title={title || `${label} icon`}
        className={className}
        style={{ color: color || getAgentBrandColor(normalizedAgent), ...style }}
      />
    )
  }

  if (normalizedAgent === 'pi') {
    return (
      <svg
        viewBox="0 0 800 800"
        width={size}
        height={size}
        title={title || `${label} icon`}
        className={cn('shrink-0', className)}
        style={{ color: color || getAgentBrandColor(normalizedAgent), ...style }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z"
          clipRule="evenodd"
        />
        <path
          fill="currentColor"
          d="M517.36 400H634.72V634.72H517.36Z"
        />
      </svg>
    )
  }

  return (
    <Sparkles
      size={size}
      title={title || `${label} icon`}
      className={className}
      style={{ color: color || getAgentBrandColor(normalizedAgent), ...style }}
    />
  )
}
