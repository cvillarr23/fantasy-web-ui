import { Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import type { ChainInfo, JobInfo } from '../../api/jobs'
import type { RunDetail } from '../../api/runs'
import { isActiveRun } from '../runFormat'
import { CancelRunButton } from './CancelRunButton'
import { ChainGraph } from './ChainGraph'
import { chainProgress, chainStepStates } from './chainStatus'
import { ChainStepList } from './ChainStepList'
import { CHAIN_EDGE_HELP } from './jobGlossary'
import { limitText, runWhen, slotStamp } from './jobsFormat'
import { PauseControl } from './PauseControl'
import { RunStatusText } from './RunStatusText'

const PHONE_QUERY = '(max-width: 899px)'

interface Props {
  chain: ChainInfo
  jobs: JobInfo[]
  root: RunDetail | null
  selected: string | null
  onSelect: (job: string) => void
}

function chainSummary(chain: ChainInfo, root: RunDetail | null) {
  return [
    root ? `Run started ${runWhen(root.started_at)}` : '',
    `limit ${limitText(chain.max_duration_seconds)}`,
    chain.next_run_at ? `next ${slotStamp(chain.next_run_at)}` : '',
  ].filter(Boolean).join(' · ')
}

function progressStatus(root: RunDetail | null) {
  if (!root) return 'no_run'
  return isActiveRun(root.status) ? 'running' : root.status
}

/** A chain's latest run: a graph on desktop, a list on phones. */
export function ChainPanel({ chain, jobs, root, selected, onSelect }: Props) {
  const phone = useMediaQuery(PHONE_QUERY, false, { getInitialValueInEffect: false })
  const states = chainStepStates(chain, root)
  return (
    <section id={`chain-${chain.name}`} aria-labelledby={`chain-${chain.name}-heading`} className="job-panel chain-panel">
      <div className="chain-panel-head">
        <div>
          <h2 id={`chain-${chain.name}-heading`}>{chain.name}</h2>
          <Text size="xs">{chainSummary(chain, root)}</Text>
        </div>
        <div className="chain-panel-status">
          <RunStatusText status={progressStatus(root)} label={chainProgress(chain, root)} />
          {root && isActiveRun(root.status) && (
            <CancelRunButton runId={root.id} job={chain.name} chainRoot label="Cancel chain run" />
          )}
        </div>
      </div>
      <div className="chain-panel-controls">
        <PauseControl name={chain.name} pause={chain.pause} target="chain" />
      </div>
      {phone ? (
        <ChainStepList chain={chain} jobs={jobs} states={states} onSelect={onSelect} />
      ) : (
        <ChainGraph chain={chain} jobs={jobs} states={states} selected={selected} onSelect={onSelect} />
      )}
      <Text size="xs" className="muted">{CHAIN_EDGE_HELP}</Text>
    </section>
  )
}
