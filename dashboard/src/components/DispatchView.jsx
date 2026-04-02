import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, FileText, X, RefreshCcw } from 'lucide-react'
import { cn } from '../lib/utils'
import { repoIdentityColors } from '../lib/constants'
import { useAgentModels } from '../lib/useAgentModels'
import { useSkills } from '../lib/useSkills'
import DispatchSettingsRow from './DispatchSettingsRow'
import SkillsSelector from './SkillsSelector'
import { AgentModelPicker, LOOP_TYPES, defaultAgentModel, fmtAgent } from './AgentModelPicker'

function readSaved() {
  try { return JSON.parse(localStorage.getItem('dispatch-settings')) || {} }
  catch { return {} }
}

function writeSaved(patch) {
  try {
    const prev = readSaved()
    localStorage.setItem('dispatch-settings', JSON.stringify({ ...prev, ...patch }))
  } catch {}
}

export default function DispatchView({ overview, onDispatch, onLoopDispatch, initialRepo, initialPrompt, initialPlanSlug, initialSkills, onDispatchComplete, settings }) {
  const repos = overview?.repos || []

  // Read from localStorage once on mount (sync, before useState defaults)
  const saved = useRef(null)
  if (saved.current === null) saved.current = readSaved()
  const s = saved.current

  const agentSettings = settings?.agents || {}

  const [mode, setMode] = useState(() => s.dispatchMode || 'task')
  const [agent, setAgent] = useState(s.agent || 'claude')
  const [repo, setRepo] = useState(initialRepo || s.repo || repos[0]?.name || '')
  const [baseBranch, setBaseBranch] = useState('')
  const [prompt, setPrompt] = useState(initialPrompt ?? s.prompt ?? '')
  const [autoMerge, setAutoMerge] = useState(s.autoMerge ?? false)
  const [useWorktree, setUseWorktree] = useState(s.useWorktree ?? false)
  const [plainOutput, setPlainOutput] = useState(s.plainOutput ?? !(agentSettings[s.agent || 'claude']?.tuiMode ?? true))
  const [planSlug, setPlanSlug] = useState(initialPlanSlug || null)
  const [selectedSkills, setSelectedSkills] = useState(() => Array.isArray(initialSkills) ? initialSkills : [])
  const [dispatching, setDispatching] = useState(false)
  const [btnPhase, setBtnPhase] = useState('idle') // idle | shaking | sliding | hidden | returning
  const [dispatchError, setDispatchError] = useState(null)

  // Loop mode state
  const [loopType, setLoopType] = useState(s.loopType || 'linear-implementation')
  const [loopPrompt, setLoopPrompt] = useState('')
  const [loopAgentSpec, setLoopAgentSpec] = useState(defaultAgentModel())
  const [reviewers, setReviewers] = useState([defaultAgentModel()])
  const [synthesizer, setSynthesizer] = useState(defaultAgentModel())
  const [implementor, setImplementor] = useState(defaultAgentModel())
  const [loopBtnPhase, setLoopBtnPhase] = useState('idle')

  const isCodex = agent === 'codex'
  const models = useAgentModels(agent)
  const availableSkills = useSkills()

  // Model: restore saved model, else use settings default (live list will snap if needed)
  const [model, setModel] = useState(() =>
    s.model || agentSettings[s.agent || 'claude']?.defaultModel || ''
  )

  // Turns: always use settings default (not persisted across dispatches)
  const [maxTurns, setMaxTurns] = useState(() => {
    const cfg = agentSettings[s.agent || 'claude'] || {}
    return 'defaultMaxTurns' in cfg ? cfg.defaultMaxTurns : 10
  })

  // When models list loads and current model isn't in it, snap to first
  useEffect(() => {
    if (models.length > 0 && !models.find(m => m.value === model)) {
      const newModel = agentSettings[agent]?.defaultModel || models[0].value
      setModel(newModel)
      writeSaved({ model: newModel })
    }
  }, [models])

  function switchAgent(newAgent) {
    setAgent(newAgent)
    const defaults = agentSettings[newAgent] || {}
    const newModel = defaults.defaultModel || ''
    const newTurns = 'defaultMaxTurns' in defaults ? defaults.defaultMaxTurns : (newAgent === 'claude' ? 10 : null)
    const newPlainOutput = !(defaults.tuiMode ?? true)
    setModel(newModel)
    setMaxTurns(newTurns)
    setPlainOutput(newPlainOutput)
    writeSaved({ agent: newAgent, model: newModel, plainOutput: newPlainOutput })
  }

  // Persist individual fields immediately on change
  useEffect(() => { writeSaved({ agent }) }, [agent])
  useEffect(() => { writeSaved({ repo }) }, [repo])
  useEffect(() => { writeSaved({ model }) }, [model])
  useEffect(() => { writeSaved({ autoMerge }) }, [autoMerge])
  useEffect(() => { writeSaved({ useWorktree }) }, [useWorktree])
  useEffect(() => { writeSaved({ plainOutput }) }, [plainOutput])
  useEffect(() => { writeSaved({ prompt }) }, [prompt])
  useEffect(() => { writeSaved({ dispatchMode: mode }) }, [mode])
  useEffect(() => { writeSaved({ loopType }) }, [loopType])

  // Set default repo once repos load (overview may not be ready on first render)
  useEffect(() => {
    if (repos.length > 0 && (!repo || !repos.find(r => r.name === repo))) {
      const defaultRepo = repos.find(r => r.name === s.repo) || repos[0]
      if (defaultRepo) setRepo(defaultRepo.name)
    }
  }, [repos])

  // Apply pre-fill when props change
  useEffect(() => { if (initialRepo) setRepo(initialRepo) }, [initialRepo])
  useEffect(() => { if (initialPrompt) setPrompt(initialPrompt) }, [initialPrompt])
  useEffect(() => { setPlanSlug(initialPlanSlug || null) }, [initialPlanSlug])
  useEffect(() => { setSelectedSkills(Array.isArray(initialSkills) ? initialSkills : []) }, [initialSkills])

  useEffect(() => {
    if (selectedSkills.length === 0) return
    const validSkillIds = new Set(availableSkills.map(skill => skill.id))
    const sanitized = selectedSkills.filter(skillId => validSkillIds.has(skillId))
    if (sanitized.length !== selectedSkills.length) setSelectedSkills(sanitized)
  }, [availableSkills, selectedSkills])

  // Load loop prompt when repo or loopType changes (loop mode)
  useEffect(() => {
    if (mode !== 'loop' || !repo || !loopType) return
    let cancelled = false
    fetch(`/api/loops/${encodeURIComponent(repo)}/prompt?type=${encodeURIComponent(loopType)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setLoopPrompt(d.content || '') })
      .catch(() => { if (!cancelled) setLoopPrompt('') })
    return () => { cancelled = true }
  }, [repo, loopType, mode])

  const selectedRepo = repos.find(r => r.name === repo)
  const defaultBranch = selectedRepo?.git?.branch || 'main'
  const branchOptions = selectedRepo?.git?.branches || []

  const isReady = repo && (planSlug || prompt.trim())
  const isLoopReady = !!repo

  async function handleDispatch(e) {
    e.preventDefault()
    if (!isReady || btnPhase !== 'idle') return
    setDispatchError(null)

    // Assemble final task text: plan path first, then any extra instructions
    const planPath = planSlug ? `plans/${planSlug}.md` : null
    const taskText = planPath
      ? (prompt.trim() ? `${planPath}\n\n${prompt.trim()}` : planPath)
      : prompt.trim()

    // Kick off button animation — disable only after content slides out
    setBtnPhase('shaking')
    setTimeout(() => setBtnPhase('sliding'), 400)
    setTimeout(() => setBtnPhase('hidden'), 800)

    setDispatching(true)
    try {
      await onDispatch?.({
        repo,
        taskText,
        originalTask: initialPrompt || null,
        baseBranch: baseBranch.trim() || defaultBranch,
        model,
        maxTurns: isCodex ? null : maxTurns,
        autoMerge,
        useWorktree,
        plainOutput,
        agent,
        planSlug: planSlug || undefined,
        skills: selectedSkills,
      })
      setPrompt('')
      onDispatchComplete?.()
    } catch (err) {
      console.error('Dispatch failed:', err)
      setBtnPhase('idle')
      setDispatchError(err.message)
      return
    } finally {
      setDispatching(false)
      setTimeout(() => setBtnPhase('returning'), 1800)
      setTimeout(() => setBtnPhase('idle'), 2400)
    }
  }

  const handleLoopLaunch = useCallback(async () => {
    if (!isLoopReady || loopBtnPhase !== 'idle') return
    setDispatchError(null)

    setLoopBtnPhase('shaking')
    setTimeout(() => setLoopBtnPhase('sliding'), 400)
    setTimeout(() => setLoopBtnPhase('hidden'), 800)

    try {
      const body = { repo, loopType, promptContent: loopPrompt }
      if (loopType === 'parallel-review') {
        body.reviewerAgents = reviewers.map(fmtAgent)
        body.synthesizerAgent = fmtAgent(synthesizer)
        body.implementorAgent = fmtAgent(implementor)
      } else {
        body.agentSpec = fmtAgent(loopAgentSpec)
      }
      await onLoopDispatch?.(body)
      setTimeout(() => setLoopBtnPhase('returning'), 1800)
      setTimeout(() => setLoopBtnPhase('idle'), 2400)
    } catch (err) {
      console.error('Loop launch failed:', err)
      setLoopBtnPhase('idle')
      setDispatchError(err.message)
    }
  }, [repo, loopType, loopPrompt, loopAgentSpec, reviewers, synthesizer, implementor, onLoopDispatch, isLoopReady, loopBtnPhase])

  const repoChips = (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Repository</label>
      <div className="flex gap-1.5 flex-wrap">
        {repos.map(r => {
          const color = repoIdentityColors[r.name] || 'var(--primary)'
          const isSelected = repo === r.name
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => { setRepo(r.name); setBaseBranch('') }}
              className={cn(
                'px-2.5 py-1 rounded-md text-[12px] font-medium capitalize border transition-all',
                isSelected
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
              )}
              style={isSelected ? { borderColor: `${color}40`, backgroundColor: `${color}10` } : undefined}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: color }} />
              {r.name}
            </button>
          )
        })}
      </div>
    </div>
  )

  function renderGlowButton({ isReadyFlag, phase, icon: Icon, label, onClick, type = 'button' }) {
    return (
      <div>
        <div aria-hidden="true" className="text-[11px] mb-1 invisible select-none">·</div>
        <div
          className={cn(
            'relative inline-flex items-center justify-center',
            phase === 'idle' && 'transition-opacity duration-200',
            phase === 'shaking' && 'animate-dispatch-shake',
            phase === 'sliding' && 'animate-dispatch-btn-out',
            phase === 'returning' && 'animate-dispatch-btn-in',
          )}
          style={{
            opacity: !isReadyFlag && phase === 'idle' ? 0.4 : 1,
            ...(phase === 'hidden' && { transform: 'translateX(400px)' }),
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{ opacity: isReadyFlag || phase !== 'idle' ? 1 : 0 }}
          >
            <div className="absolute pointer-events-none animate-loading-halo" style={{ width: '204px', height: '66px', background: '#8bab8f', borderRadius: '50%', filter: 'blur(35px)', top: 'calc(50% - 33px)', left: 'calc(50% - 102px)' }} />
            <div className="absolute pointer-events-none animate-loading-glow" style={{ width: '108px', height: '38px', background: '#8bab8f', borderRadius: '50%', filter: 'blur(19px)', top: 'calc(50% - 19px)', left: 'calc(50% - 54px)' }} />
            <div className="absolute pointer-events-none animate-loading-glow-shift" style={{ width: '90px', height: '32px', background: '#7ea89a', borderRadius: '50%', filter: 'blur(17px)', top: 'calc(50% - 16px)', left: 'calc(50% - 45px)' }} />
          </div>

          <button
            type={type}
            onClick={onClick}
            style={{
              background: 'linear-gradient(135deg, #8bab8f 0%, #6d9472 100%)',
              color: '#1a1b1e',
              boxShadow: phase !== 'idle'
                ? '0 0 18px 4px rgba(139,171,143,0.45)'
                : '0 0 8px 2px rgba(139,171,143,0.18)',
              transition: 'box-shadow 400ms ease',
              cursor: !isReadyFlag && phase === 'idle' ? 'not-allowed' : 'pointer',
            }}
            className={cn(
              'inline-flex items-center gap-2.5 pl-5 pr-6 h-10 rounded-full text-[13px] font-semibold shrink-0 relative z-10',
              phase === 'idle' && 'transition-transform duration-150 ease-out hover:scale-105 active:scale-[0.97]',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setMode('task')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border transition-all',
            mode === 'task'
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
          )}
          style={mode === 'task' ? { borderColor: 'rgba(139,171,143,0.4)', backgroundColor: 'rgba(139,171,143,0.1)' } : undefined}
        >
          <Send size={11} />
          Task
        </button>
        <button
          type="button"
          onClick={() => setMode('loop')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border transition-all',
            mode === 'loop'
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
          )}
          style={mode === 'loop' ? { borderColor: 'rgba(139,171,143,0.4)', backgroundColor: 'rgba(139,171,143,0.1)' } : undefined}
        >
          <RefreshCcw size={11} />
          Loop
        </button>
      </div>

      {mode === 'task' ? (
        /* ── Task mode (existing form) ── */
        <form onSubmit={handleDispatch} className="space-y-3">
          {repoChips}

          {/* Branch row */}
          <div className="flex items-end gap-3">
            <div className="w-44 shrink-0">
              <label htmlFor="dispatch-branch" className="block text-[11px] font-medium text-muted-foreground mb-1">
                Branch
              </label>
              <select
                id="dispatch-branch"
                value={baseBranch || defaultBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-border bg-card text-[12px] text-foreground focus:outline-none focus:border-primary/30"
              >
                {branchOptions.length > 0 ? (
                  branchOptions.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                ) : (
                  <option value={defaultBranch}>{defaultBranch}</option>
                )}
              </select>
            </div>
          </div>

          <SkillsSelector
            skills={availableSkills}
            selectedSkillIds={selectedSkills}
            onChange={setSelectedSkills}
          />

          {/* Plan chip */}
          {planSlug && (
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">Plan</label>
              <div className="inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-md border border-border bg-card max-w-full">
                <FileText size={12} className="text-muted-foreground/60 shrink-0" />
                <span
                  className="text-[12px] text-foreground/70 truncate"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  plans/{planSlug}.md
                </span>
                <button
                  type="button"
                  onClick={() => setPlanSlug(null)}
                  className="ml-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                  title="Remove plan reference"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Prompt */}
          <div>
            <label htmlFor="dispatch-prompt" className="block text-[11px] font-medium text-muted-foreground mb-1">
              {planSlug ? 'Additional Instructions' : 'Task Prompt'}
            </label>
            <textarea
              id="dispatch-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={planSlug ? 'Additional instructions (optional)...' : 'Describe the task for the worker...'}
              rows={planSlug ? 3 : 4}
              className={cn(
                'w-full px-3 py-2 rounded-md border border-border bg-card',
                'text-[13px] text-foreground placeholder:text-muted-foreground/40 leading-relaxed',
                'focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10',
                'resize-y'
              )}
            />
          </div>

          {/* Agent + Model + Turns + TUI + Auto-merge + Worktree + Submit */}
          <div className="flex items-start gap-3 flex-wrap">
            <DispatchSettingsRow
              agent={agent} onSwitchAgent={switchAgent}
              model={model} setModel={setModel} models={models}
              maxTurns={maxTurns} setMaxTurns={setMaxTurns}
              useWorktree={useWorktree} setUseWorktree={setUseWorktree}
              autoMerge={autoMerge} setAutoMerge={setAutoMerge}
              plainOutput={plainOutput} setPlainOutput={setPlainOutput}
            />

            <div className="flex-1" />

            {renderGlowButton({
              isReadyFlag: isReady,
              phase: btnPhase,
              icon: Send,
              label: 'Dispatch',
              type: 'submit',
            })}
          </div>
        </form>
      ) : (
        /* ── Loop mode ── */
        <div className="space-y-3">
          {repoChips}

          {/* Loop type */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Loop Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {LOOP_TYPES.map(lt => {
                const isSelected = loopType === lt.id
                const Icon = lt.icon
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setLoopType(lt.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border transition-all',
                      isSelected
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-card-hover'
                    )}
                    style={isSelected ? { borderColor: 'rgba(139,171,143,0.4)', backgroundColor: 'rgba(139,171,143,0.1)' } : undefined}
                  >
                    <Icon size={11} />
                    {lt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Prompt</label>
            <textarea
              value={loopPrompt}
              onChange={e => setLoopPrompt(e.target.value)}
              rows={5}
              className={cn(
                'w-full px-3 py-2 rounded-md border border-border bg-card',
                'text-[13px] text-foreground placeholder:text-muted-foreground/40 leading-relaxed',
                'focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/10',
                'resize-y'
              )}
              placeholder="Describe the task for the loop..."
            />
          </div>

          {/* Agent picker for linear types */}
          {loopType !== 'parallel-review' && (
            <AgentModelPicker label="Agent" value={loopAgentSpec} onChange={setLoopAgentSpec} />
          )}

          {/* Parallel-review agent pickers */}
          {loopType === 'parallel-review' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-2">Reviewer Agents</label>
                <div className="space-y-2">
                  {reviewers.map((r, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <AgentModelPicker
                        value={r}
                        onChange={v => { const next = [...reviewers]; next[i] = v; setReviewers(next) }}
                      />
                      {reviewers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setReviewers(reviewers.filter((_, j) => j !== i))}
                          className="h-8 px-2.5 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReviewers([...reviewers, defaultAgentModel()])}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Add reviewer
                  </button>
                </div>
              </div>

              <AgentModelPicker label="Synthesizer" value={synthesizer} onChange={setSynthesizer} />
              <AgentModelPicker label="Implementor" value={implementor} onChange={setImplementor} />
            </div>
          )}

          {/* Glow dispatch button */}
          <div className="flex justify-end">
            {renderGlowButton({
              isReadyFlag: isLoopReady,
              phase: loopBtnPhase,
              icon: RefreshCcw,
              label: 'Dispatch',
              onClick: handleLoopLaunch,
            })}
          </div>
        </div>
      )}

      {dispatchError && (
        <div className="mt-3 px-3 py-2 rounded-md border border-red-500/30 bg-red-500/10 text-[12px] text-red-400">
          {dispatchError}
        </div>
      )}
    </div>
  )
}
