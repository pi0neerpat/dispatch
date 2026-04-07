/** Fallback when a repo has no `color` in hub config.json / config.local.json */
export const DEFAULT_REPO_COLOR = 'var(--primary)'

/** Fallback for subtle repo dots in activity UIs when config has no color */
export const DEFAULT_REPO_MUTED_COLOR = 'var(--muted-foreground)'

/**
 * Resolves a repo accent color from `/api/overview` (each repo may include `color` from config).
 * @param {object|null|undefined} overview - `{ repos: [{ name, color?, ... }] }`
 * @param {string|null|undefined} repoName
 * @param {string} [fallback=DEFAULT_REPO_COLOR]
 */
export function getRepoColor(overview, repoName, fallback = DEFAULT_REPO_COLOR) {
  if (!repoName) return fallback
  const c = overview?.repos?.find(r => r.name === repoName)?.color
  return typeof c === 'string' && c.trim() ? c.trim() : fallback
}

/**
 * Available Claude models for dispatch and chat.
 */
export const MODEL_OPTIONS = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
]

/**
 * Available Codex models. Keep in sync with server.js FALLBACK_CODEX_MODELS.
 */
export const CODEX_MODEL_OPTIONS = [
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
  { value: 'o4-mini', label: 'o4 Mini' },
  { value: 'o3', label: 'o3' },
  { value: 'o3-mini', label: 'o3 Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
]

/**
 * Available Cursor models. Keep in sync with server.js FALLBACK_CURSOR_MODELS.
 */
export const CURSOR_MODEL_OPTIONS = [
  { value: 'claude-4.6-opus-high-thinking', label: 'Claude Opus 4.6 (High Thinking)' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
]

/**
 * Available Pi models. Keep in sync with server.js FALLBACK_PI_MODELS.
 */
export const PI_MODEL_OPTIONS = [
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'openai-codex/gpt-5.4', label: 'GPT-5.4' },
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
]

/**
 * Supported agent providers.
 */
export const AGENT_OPTIONS = [
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'pi', label: 'Pi' },
]

/**
 * Agent brand colors.
 * Claude: Anthropic accent-brand. Codex: OpenAI discovery purple. Cursor: brand blue.
 */
export const AGENT_BRAND_COLORS = {
  claude: '#D97757',
  codex: '#924FF7',
  cursor: '#2B7FFF',
  pi: '#18A874',
}

/**
 * Normalizes unknown values to a supported agent id.
 */
export function normalizeAgentId(agent) {
  if (agent === 'codex') return 'codex'
  if (agent === 'cursor') return 'cursor'
  if (agent === 'pi') return 'pi'
  return 'claude'
}

/**
 * Returns the base brand color for an agent.
 */
export function getAgentBrandColor(agent) {
  return AGENT_BRAND_COLORS[normalizeAgentId(agent)]
}

/**
 * Follow-up dispatch template prompts.
 * Each template receives the swarm detail object and returns a pre-filled prompt string.
 */
export const FOLLOWUP_TEMPLATES = [
  {
    id: 'code-review',
    label: 'Code Review',
    prompt: () => `Review the code changes. Check for bugs, security issues, edge cases, and code quality. Suggest improvements.`,
  },
  {
    id: 'iterate',
    label: 'Iterate',
    prompt: () => `Continue iterating and improving the implementation. Refine based on the results so far.`,
  },
  {
    id: 'write-tests',
    label: 'Write Tests',
    prompt: () => `Write tests for the changes. Cover edge cases and ensure good coverage.`,
  },
  {
    id: 'fix-issues',
    label: 'Fix Issues',
    prompt: () => `Review the current state and fix any remaining problems or issues.`,
  },
  {
    id: 'docs',
    label: 'Update Docs',
    prompt: () => `Update documentation to reflect the recent changes. Update relevant README, comments, and doc files.`,
  },
  {
    id: 'cleanup',
    label: 'Cleanup',
    prompt: () => `Clean up the code. Remove dead code, fix formatting, improve naming, and ensure consistency with project conventions.`,
  },
]
