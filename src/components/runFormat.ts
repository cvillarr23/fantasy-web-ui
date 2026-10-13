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

