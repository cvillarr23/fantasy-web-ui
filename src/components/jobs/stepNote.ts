import type { ChainStepInfo } from '../../api/jobs'
import { duration, isActiveRun } from '../runFormat'
import type { ChainStepState } from './chainStatus'
import { latestClock, runWhen, slotStamp } from './jobsFormat'

/** The small line on a chain step: when it ran, or when it will start at the latest. */
export function stepNote(state: ChainStepState, step: ChainStepInfo) {
  const { run } = state
  if (run && isActiveRun(run.status)) return `Since ${slotStamp(run.started_at)}`
  if (run) return `${runWhen(run.started_at)} · ${duration(run)}`
  return step.latest ? `Starts by ${latestClock(step.latest)}` : ''
}
