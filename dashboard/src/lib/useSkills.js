import { useEffect, useState } from 'react'

export function useSkills() {
  const [skills, setSkills] = useState([])

  function normalizeSkill(skill, defaultSource = 'local') {
    const id = String(skill?.id || '').trim()
    const name = String(skill?.name || skill?.id || '').trim()
    const sourceRaw = String(skill?.source || defaultSource || 'local').trim().toLowerCase()
    const source = sourceRaw === 'global' ? 'global' : 'local'
    if (!id || !name) return null
    return { id, name, source }
  }

  function normalizeResponse(data) {
    if (Array.isArray(data)) {
      return data
        .map(skill => normalizeSkill(skill))
        .filter(Boolean)
    }

    if (data && typeof data === 'object') {
      const localSkills = Array.isArray(data.local)
        ? data.local.map(skill => normalizeSkill(skill, 'local')).filter(Boolean)
        : []
      const globalSkills = Array.isArray(data.global)
        ? data.global.map(skill => normalizeSkill(skill, 'global')).filter(Boolean)
        : []

      const seenIds = new Set()
      const merged = []
      for (const skill of [...localSkills, ...globalSkills]) {
        if (seenIds.has(skill.id)) continue
        seenIds.add(skill.id)
        merged.push(skill)
      }
      return merged
    }

    return []
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/skills')
      .then(res => (res.ok ? res.json() : []))
      .then(data => {
        if (cancelled) return
        setSkills(normalizeResponse(data))
      })
      .catch(() => {
        if (!cancelled) setSkills([])
      })
    return () => { cancelled = true }
  }, [])

  return skills
}
