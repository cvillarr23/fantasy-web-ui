import type { ChainStepInfo } from '../../api/jobs'
import { duration, isActiveRun, isWaitingRun } from '../runFormat'
import type { ChainStepState } from './chainStatus'
import { latestClock, runWhen, slotStamp } from './jobsFormat'

/** What an approval step asks of you, and when it lapses. */
function approvalNote(run: NonNullable<ChainStepState['run']>, step: ChainStepInfo) {
  const title = step.approval?.title ?? 'Needs your approval'
  return run.expires_at ? `${title} · Expires ${slotStamp(run.expires_at)}` : title
}

/** The small line on a chain step: when it ran, or when it will start at the latest. */
export function stepNote(state: ChainStepState, step: ChainStepInfo) {
  const { run } = state
  if (run && isWaitingRun(run.status)) return approvalNote(run, step)
  if (run && isActiveRun(run.status)) return `Since ${slotStamp(run.started_at)}`
  if (run) return `${runWhen(run.started_at)} · ${duration(run)}`
  return step.latest ? `Starts by ${latestClock(step.latest)}` : ''
}
