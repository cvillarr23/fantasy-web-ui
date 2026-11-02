import { Button, Table, Text } from '@mantine/core'
import type { JobCatalog, JobInfo } from '../../api/jobs'
import { isActiveRun } from '../runFormat'
import { InfoTip } from '../ui/InfoTip'
import { AffectsTeamBadge } from './AffectsTeamBadge'
import { AFFECTS_TEAM_HELP } from './jobGlossary'
import { CancelRunButton } from './CancelRunButton'
import { jobNextSlot, jobTrigger, pauseIsActive, runButtonState, runWhen } from './jobsFormat'
import { PausedBadge } from './PausedBadge'
import { RunStatusText } from './RunStatusText'

interface Props {
  catalog: JobCatalog
  selected: string | null
  startingJob: string | null
  now?: Date
  onSelect: (job: string) => void
  onRun: (job: JobInfo) => void
}

function TwoLines({ primary, secondary, nowrap }: { primary: string; secondary: string; nowrap?: boolean }) {
  return (
    <>
      <Text size="sm" c="var(--text-h)" className={nowrap ? 'job-time' : undefined}>{primary}</Text>
      {secondary && <Text size="xs" className="muted">{secondary}</Text>}
    </>
  )
}

function LastRunCell({ job, now }: { job: JobInfo; now?: Date }) {
  if (!job.last_run) return <Text size="sm">—</Text>
  return (
    <>
      <RunStatusText status={job.last_run.status} />
      <Text size="xs" className="muted job-time">{runWhen(job.last_run.started_at, now)}</Text>
    </>
  )
}

interface RowProps extends Omit<Props, 'selected' | 'startingJob'> {
  job: JobInfo
  selected: boolean
  starting: boolean
}

function JobRow({ job, catalog, selected, starting, now, onSelect, onRun }: RowProps) {
  const trigger = jobTrigger(job, catalog.chains)
  const slot = jobNextSlot(job, catalog.chains, now)
  const run = runButtonState(job, catalog.chains, starting)
  return (
    <Table.Tr className={selected ? 'job-row job-row-selected' : 'job-row'}>
      <Table.Td data-label="Job">
        <div className="job-name">
          <button type="button" className="job-name-button" aria-pressed={selected} onClick={() => onSelect(job.name)}>
            {job.name}
          </button>
          {job.acts && <AffectsTeamBadge />}
          {pauseIsActive(job.pause, now) && <PausedBadge />}
        </div>
      </Table.Td>
      <Table.Td data-label="Schedule / trigger"><TwoLines {...trigger} /></Table.Td>
      <Table.Td data-label="Last run"><LastRunCell job={job} now={now} /></Table.Td>
      <Table.Td data-label="Next slot"><TwoLines primary={slot.label} secondary={slot.note} nowrap /></Table.Td>
      <Table.Td data-label="Run" className="job-run-cell">
        <div className="job-run-actions">
          <Button variant="default" size="xs" disabled={run.disabled} onClick={() => onRun(job)}>
            {run.label}
          </Button>
          {job.last_run && isActiveRun(job.last_run.status) && <CancelRunButton runId={job.last_run.id} job={job.name} />}
        </div>
      </Table.Td>
    </Table.Tr>
  )
}

/** Every catalog job. A real table on desktop; CSS turns its rows into cards on phones. */
export function JobsTable({ catalog, selected, startingJob, now, onSelect, onRun }: Props) {
  return (
    <Table className="jobs-table" highlightOnHover withRowBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            Job <InfoTip label="Affects team">{AFFECTS_TEAM_HELP}</InfoTip>
          </Table.Th>
          <Table.Th>Schedule / trigger</Table.Th>
          <Table.Th>Last run</Table.Th>
          <Table.Th>Next slot</Table.Th>
          <Table.Th className="job-run-cell">Run</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {catalog.jobs.map((job) => (
          <JobRow
            key={job.name}
            job={job}
            catalog={catalog}
            selected={job.name === selected}
            starting={job.name === startingJob}
            now={now}
            onSelect={onSelect}
            onRun={onRun}
          />
        ))}
      </Table.Tbody>
    </Table>
  )
}
