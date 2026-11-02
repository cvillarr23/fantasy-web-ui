import type { ChainInfo, JobInfo } from '../../api/jobs'
import { AffectsTeamBadge } from './AffectsTeamBadge'
import { CancelRunButton } from './CancelRunButton'
import { stepStatusLabel, type ChainStepState } from './chainStatus'
import { afterText, pauseIsActive } from './jobsFormat'
import { PausedBadge } from './PausedBadge'
import { RunStatusText } from './RunStatusText'
import { stepNote } from './stepNote'

interface Props {
  chain: ChainInfo
  jobs: JobInfo[]
  states: ChainStepState[]
  onSelect: (job: string) => void
}

function stepLine(chain: ChainInfo, state: ChainStepState) {
  const step = chain.steps[state.step]
  const after = step.after.length ? `After ${afterText(step.after)}` : ''
  return [after, stepNote(state, step)].filter(Boolean).join(' · ')
}

function StepBadges({ job }: { job: JobInfo | undefined }) {
  const acts = Boolean(job?.acts)
  const paused = pauseIsActive(job?.pause)
  if (!acts && !paused) return null
  return (
    <span className="job-name">
      {acts && <AffectsTeamBadge />}
      {paused && <PausedBadge />}
    </span>
  )
}

/** The chain as a list, where a phone has no room for the graph. */
export function ChainStepList({ chain, jobs, states, onSelect }: Props) {
  return (
    <ol className="chain-step-list">
      {states.map((state) => (
        <li key={state.step}>
          <div className="chain-step-row">
            <button type="button" className="job-name-button" onClick={() => onSelect(state.step)}>{state.step}</button>
            <RunStatusText status={state.status} label={stepStatusLabel(state.status)} />
          </div>
          <StepBadges job={jobs.find((job) => job.name === state.step)} />
          <span className="chain-node-note">{stepLine(chain, state)}</span>
          <CancelRunButton run={state.run} job={state.step} />
        </li>
      ))}
    </ol>
  )
}
