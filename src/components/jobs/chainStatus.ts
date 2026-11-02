import type { ChainInfo } from '../../api/jobs'
import type { ChildRun, RunDetail, RunStatus } from '../../api/runs'
import { isActiveRun, statusLabel } from '../runFormat'
import { orderedSteps, stepsFrom } from './jobsFormat'

export type ChainStepStatus = RunStatus | 'waiting' | 'not_run' | 'not_in_run' | 'no_run'

export interface ChainStepState {
  step: string
  status: ChainStepStatus
  run?: ChildRun
}

const STEP_LABELS: Partial<Record<ChainStepStatus, string>> = {
  waiting: 'Waiting',
  not_run: 'Not run',
  not_in_run: 'Not in this run',
  no_run: 'No run yet',
}

export const stepStatusLabel = (status: ChainStepStatus) => STEP_LABELS[status] ?? statusLabel(status)

/** Steps a chain run covers: all of them, or those from where a manual run started. */
function runScope(chain: ChainInfo, root: RunDetail) {
  const from = root.trigger.from_step
  return new Set(typeof from === 'string' ? stepsFrom(from, chain) : orderedSteps(chain))
}

/** Each step's status in one chain run. Status comes from that run's children, because a
 * job's latest run can be a standalone run that says nothing about this chain. */
export function chainStepStates(chain: ChainInfo, root: RunDetail | null): ChainStepState[] {
  const steps = orderedSteps(chain)
  if (!root) return steps.map((step) => ({ step, status: 'no_run' }))
  const scope = runScope(chain, root)
  const unstarted = isActiveRun(root.status) ? 'waiting' : 'not_run'
  return steps.map((step) => {
    const run = root.children.find((child) => child.job_name === step)
    if (run) return { step, status: run.status, run }
    return { step, status: scope.has(step) ? unstarted : 'not_in_run' }
  })
}

/** One line on how a chain run stands. */
export function chainProgress(chain: ChainInfo, root: RunDetail | null) {
  if (!root) return 'No run yet'
  if (!isActiveRun(root.status)) return statusLabel(root.status)
  const inScope = chainStepStates(chain, root).filter((state) => state.status !== 'not_in_run')
  const current = inScope.findIndex((state) => state.status === 'waiting' || isActiveRun(state.status))
  const position = current === -1 ? inScope.length : current + 1
  return `Running · step ${position} of ${inScope.length}`
}
