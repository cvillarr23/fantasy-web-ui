import type { RunSummary } from '../api/runs'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

export const runLabel = (value: string) => value.replaceAll('_', ' ')
export const runStamp = (value: string) => new Date(value).toLocaleString()

/** Wall-clock length of a finished run, or a dash while it runs. */
export function duration(run: Pick<RunSummary, 'started_at' | 'finished_at'>) {
  if (!run.finished_at) return '—'
  const seconds = Math.round(
    (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / MS_PER_SECOND,
  )
  return seconds < SECONDS_PER_MINUTE
    ? `${seconds}s`
    : `${Math.floor(seconds / SECONDS_PER_MINUTE)}m ${seconds % SECONDS_PER_MINUTE}s`
}


// Summary keys rendered on their own rather than in the counters table.
export const RESERVED_SUMMARY_KEYS = new Set([
  'headline',
  'last_message',
  'log_tail',
  'warnings',
  'errors',
  'result',
])

/** One line saying what a run did: the job's own headline, else its last log message,
 * else its error. Empty for runs recorded before outcomes were captured. */
export function runOutcome(run: Pick<RunSummary, 'status'> & {
  summary?: Record<string, unknown>
  error?: string | null
}) {
  const summary = run.summary ?? {}
  for (const key of ['headline', 'last_message'] as const) {
    if (typeof summary[key] === 'string' && summary[key]) return summary[key] as string
  }
  return run.error ?? ''
}

/** "1 error", "3 errors". */
export const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

/** Warning and error counts from the run's captured log, when there were any. */
export function logIssues(summary: Record<string, unknown> = {}) {
  const warnings = Number(summary.warnings) || 0
  const errors = Number(summary.errors) || 0
  return { warnings, errors, any: warnings + errors > 0 }
}
