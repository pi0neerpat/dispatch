/**
 * Repo identity colors — used for color-coding repos across the dashboard.
 * Single source of truth. Update here when adding repos or changing colors.
 */
export const repoIdentityColors = {
  marketing: '#e0b44a',
  website: '#818cf8',
  electron: '#34d399',
  hub: '#7dd3fc',
}

/**
 * Available Claude models for dispatch and chat.
 */
export const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
]

/**
 * Follow-up dispatch template prompts.
 * Each template receives the swarm detail object and returns a pre-filled prompt string.
 */
export const FOLLOWUP_TEMPLATES = [
  {
    id: 'code-review',
    label: 'Code Review',
    prompt: (d) => `Review the code changes from the task "${d.taskName}". Check for bugs, security issues, edge cases, and code quality. Suggest improvements.`,
  },
  {
    id: 'iterate',
    label: 'Iterate',
    prompt: (d) => `The previous worker completed "${d.taskName}". Continue iterating on this work:\n\nResults so far:\n${d.resultsSummary || 'No summary available'}\n\nImprove and refine the implementation.`,
  },
  {
    id: 'write-tests',
    label: 'Write Tests',
    prompt: (d) => `Write tests for the changes made by the task "${d.taskName}". Cover edge cases and ensure good coverage.`,
  },
  {
    id: 'fix-issues',
    label: 'Fix Issues',
    prompt: (d) => `The previous worker attempted "${d.taskName}" but there are issues to fix.\n\nReview the current state and fix any problems.`,
  },
  {
    id: 'docs',
    label: 'Update Docs',
    prompt: (d) => `Update documentation to reflect the changes from "${d.taskName}". Update relevant README, comments, and doc files.`,
  },
  {
    id: 'cleanup',
    label: 'Cleanup',
    prompt: (d) => `Clean up the code from "${d.taskName}". Remove dead code, fix formatting, improve naming, and ensure consistency with project conventions.`,
  },
]
