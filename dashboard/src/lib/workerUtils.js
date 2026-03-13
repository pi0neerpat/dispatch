/**
 * Shared worker/agent list building utilities.
 * Used by JobsView, TaskBoard/RepoTaskSection, and other components.
 */

export function getRepoFlags(repoName, swarmAgents, activeWorkers) {
  let hasRunning = false
  let hasReview = false
  let failedCount = 0

  for (const agent of swarmAgents) {
    if (agent.repo !== repoName) continue
    if (agent.validation === 'needs_validation') hasReview = true
    if (agent.status === 'in_progress') hasRunning = true
    if (agent.status === 'failed' || agent.status === 'killed') failedCount += 1
  }

  if (activeWorkers) {
    for (const [, info] of activeWorkers) {
      if (info.repoName === repoName) hasRunning = true
    }
  }

  return { hasRunning, hasReview, failedCount }
}

export function buildWorkerNavItems(swarmAgents, activeWorkers, swarmFileToSession) {
  const items = []
  const seen = new Set()

  if (activeWorkers) {
    for (const [sessionId, info] of activeWorkers) {
      const swarmId = info.swarmFile?.fileName?.replace(/\.md$/, '') || null
      items.push({
        key: `session:${sessionId}`,
        id: sessionId,
        isSession: true,
        repo: info.repoName,
        label: info.taskText || 'Manual worker',
        needsReview: false,
        status: 'in_progress',
        created: info.created,
        swarmId,
      })
      if (swarmId) seen.add(swarmId)
      seen.add(sessionId)
    }
  }

  for (const agent of swarmAgents || []) {
    if (seen.has(agent.id)) continue

    const isActive = agent.status === 'in_progress' || agent.validation === 'needs_validation'
    const sessionId = swarmFileToSession?.[agent.id]

    items.push({
      key: `agent:${agent.id}`,
      id: sessionId || agent.id,
      isSession: !!sessionId,
      repo: agent.repo,
      label: agent.taskName || agent.id,
      needsReview: agent.validation === 'needs_validation',
      status: agent.status,
      validation: agent.validation,
      created: agent.started,
      durationMinutes: agent.durationMinutes,
      swarmId: agent.id,
      isActive,
    })
  }

  return items
}

/**
 * Extract active workers for a specific repo — used by RepoTaskSection.
 */
export function extractActiveWorkers(repoName, activeWorkers, swarmAgents, swarmFileToSession) {
  const workers = []
  const seen = new Set()

  if (activeWorkers) {
    for (const [sessionId, info] of activeWorkers) {
      if (info.repoName !== repoName) continue
      const swarmId = info.swarmFile?.fileName?.replace(/\.md$/, '') || null
      workers.push({
        id: sessionId,
        label: info.taskText || 'Manual worker',
        status: 'in_progress',
        isSession: true,
        swarmId,
      })
      if (swarmId) seen.add(swarmId)
      seen.add(sessionId)
    }
  }

  for (const agent of swarmAgents || []) {
    if (agent.repo !== repoName) continue
    if (!(agent.status === 'in_progress' || agent.validation === 'needs_validation')) continue
    if (seen.has(agent.id)) continue
    const sessionId = swarmFileToSession?.[agent.id]
    workers.push({
      id: sessionId || agent.id,
      label: agent.taskName || agent.id,
      status: agent.validation === 'needs_validation' ? 'needs_validation' : agent.status,
      isSession: !!sessionId,
      swarmId: agent.id,
    })
  }

  return workers
}
