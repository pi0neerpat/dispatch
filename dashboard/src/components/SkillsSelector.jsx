import { useId, useMemo } from 'react'

function normalizeSource(value) {
  return String(value || '').trim().toLowerCase() === 'global' ? 'global' : 'local'
}

export default function SkillsSelector({ skills, selectedSkillIds, onChange }) {
  const selectId = useId()
  const skillList = Array.isArray(skills) ? skills : []
  const currentSelected = Array.isArray(selectedSkillIds)
    ? [...new Set(selectedSkillIds.map(skillId => String(skillId || '').trim()).filter(Boolean))]
    : []

  const groupedSkills = useMemo(() => {
    const groups = { local: [], global: [] }
    for (const skill of skillList) {
      const id = String(skill?.id || '').trim()
      const name = String(skill?.name || skill?.id || '').trim()
      if (!id || !name) continue
      const source = normalizeSource(skill?.source)
      groups[source].push({ id, name, source })
    }
    groups.local.sort((a, b) => a.name.localeCompare(b.name))
    groups.global.sort((a, b) => a.name.localeCompare(b.name))
    return groups
  }, [skillList])

  const hasSkills = groupedSkills.local.length > 0 || groupedSkills.global.length > 0

  const skillsById = useMemo(() => {
    const map = new Map()
    for (const skill of [...groupedSkills.local, ...groupedSkills.global]) {
      map.set(skill.id, skill)
    }
    return map
  }, [groupedSkills])

  function addSkill(skillId) {
    const normalizedId = String(skillId || '').trim()
    if (!normalizedId) return
    if (!skillsById.has(normalizedId)) return
    if (currentSelected.includes(normalizedId)) return
    onChange?.([...currentSelected, normalizedId])
  }

  function removeSkill(skillId) {
    onChange?.(currentSelected.filter(id => id !== skillId))
  }

  function handleSelectChange(e) {
    addSkill(e.target.value)
    e.target.value = ''
  }

  if (!hasSkills) return null

  return (
    <div>
      <label htmlFor={selectId} className="block text-[11px] font-medium text-muted-foreground mb-1">
        Skills
      </label>
      <select
        id={selectId}
        defaultValue=""
        onChange={handleSelectChange}
        className="w-full h-8 px-2.5 rounded-md border border-border bg-card text-[12px] text-foreground focus:outline-none focus:border-primary/30"
      >
        <option value="">Select skill...</option>
        {groupedSkills.local.length > 0 && (
          <optgroup label="Local">
            {groupedSkills.local.map(skill => (
              <option key={skill.id} value={skill.id}>/{skill.name}</option>
            ))}
          </optgroup>
        )}
        {groupedSkills.global.length > 0 && (
          <optgroup label="Global">
            {groupedSkills.global.map(skill => (
              <option key={skill.id} value={skill.id}>/{skill.name}</option>
            ))}
          </optgroup>
        )}
      </select>
      {currentSelected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {currentSelected.map(skillId => {
            const skill = skillsById.get(skillId)
            const displayName = skill?.name || skillId
            return (
              <button
                key={skillId}
                type="button"
                onClick={() => removeSkill(skillId)}
                className="px-2 py-0.5 rounded-full border border-border bg-card text-[11px] text-foreground/85 hover:bg-card-hover transition-colors"
                title="Remove skill"
              >
                /{displayName} ×
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => onChange?.([])}
            className="px-2 py-0.5 rounded-full text-[11px] text-muted-foreground/75 hover:text-muted-foreground transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
