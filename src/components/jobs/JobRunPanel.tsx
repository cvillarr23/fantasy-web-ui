import { useState } from 'react'
import { Anchor, Button, Checkbox, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { JobCatalog, JobInfo, StartRunRequest } from '../../api/jobs'
import type { Run } from '../../api/runs'
import { skipReason } from '../runFormat'
import { InfoTip } from '../ui/InfoTip'
import { EmptyState } from '../ui/EmptyState'
import { AffectsTeamBadge } from './AffectsTeamBadge'
import { CancelRunButton } from './CancelRunButton'
import { AFFECTS_TEAM_HELP } from './jobGlossary'
import {
  actingSteps,
  blockedByActiveRun,
  buildRunParams,
  chainForJob,
  downstreamSteps,
  jobFacts,
  JOBS_LINK_STATE,
  missingParams,
  paramFields,
  runWhen,
  type ParamField,
  type ParamValues,
} from './jobsFormat'
import { PauseControl } from './PauseControl'
import { RunConfirmDialog } from './RunConfirmDialog'
import { RunRefusal } from './RunRefusal'
import { RunStatusText } from './RunStatusText'

export interface StartedRun {
  job: string
  runId: string
}

interface Props {
  job: JobInfo
  catalog: JobCatalog
  recentRuns: Run[]
  starting: boolean
  error: Error | null
  started: StartedRun | null
  onStart: (request: StartRunRequest) => void
}

interface FieldProps {
  field: ParamField
  value: ParamValues[string]
  onChange: (value: ParamValues[string]) => void
}

function ParamInput({ field, value, onChange }: FieldProps) {
  const label = field.required ? field.label : `${field.label} (optional)`
  if (field.kind === 'bool') {
    return <Checkbox label={field.label} checked={Boolean(value)} onChange={(event) => onChange(event.currentTarget.checked)} />
  }
  if (field.kind === 'string') {
    return <TextInput label={label} value={String(value ?? '')} onChange={(event) => onChange(event.currentTarget.value)} />
  }
  return (
    <NumberInput
      label={label}
      allowDecimal={field.kind === 'float'}
      hideControls
      placeholder={field.required ? undefined : 'Job default'}
      value={typeof value === 'number' || typeof value === 'string' ? value : ''}
      onChange={onChange}
    />
  )
}

function ParamsForm({ fields, values, onChange }: { fields: ParamField[]; values: ParamValues; onChange: (name: string, value: ParamValues[string]) => void }) {
  if (!fields.length) return null
  return (
    <Stack gap="xs">
      <h4>Parameters</h4>
      {fields.map((field) => (
        <ParamInput key={field.name} field={field} value={values[field.name]} onChange={(value) => onChange(field.name, value)} />
      ))}
    </Stack>
  )
}

function DownstreamOption({ job, catalog, checked, onChange }: { job: JobInfo; catalog: JobCatalog; checked: boolean; onChange: (next: boolean) => void }) {
  const chain = chainForJob(job.name, catalog.chains)
  const later = chain ? downstreamSteps(job.name, chain) : []
  if (!chain || !later.length) return null
  return (
    <Stack gap={4} className="job-downstream">
      <Checkbox label="With downstream" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <Text size="xs">Then runs {later.join(', ')} from {chain.name}.</Text>
    </Stack>
  )
}

/** When a run happened, and why it was skipped if it was. */
function recentRunNote(run: Run) {
  const reason = skipReason(run)
  return `${runWhen(run.started_at)}${reason && ` · ${reason}`}`
}

function RecentRuns({ runs }: { runs: Run[] }) {
  return (
    <Stack gap={6}>
      <h4>Recent runs</h4>
      {runs.length === 0 && <EmptyState>No runs recorded yet.</EmptyState>}
      {runs.map((run) => (
        <Link key={run.id} className="job-recent-run" to={`/activity/runs/${run.id}`} state={JOBS_LINK_STATE}>
          <RunStatusText status={run.status} />
          <span>{recentRunNote(run)}</span>
        </Link>
      ))}
    </Stack>
  )
}

function runLabel(blocked: boolean, starting: boolean, needsConfirm: boolean, downstream: boolean) {
  if (blocked) return 'Already running'
  if (starting) return 'Starting…'
  if (needsConfirm) return 'Review and run'
  return downstream ? 'Run with downstream' : 'Run'
}

/** The rail for one job: its form, the state of any run, and its recent runs. */
export function JobRunPanel({ job, catalog, recentRuns, starting, error, started, onStart }: Props) {
  const [values, setValues] = useState<ParamValues>({})
  const [downstream, setDownstream] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const fields = paramFields(job.params)
  const params = buildRunParams(fields, values)
  const blocked = blockedByActiveRun(job)
  const needsConfirm = actingSteps(job, downstream, catalog).length > 0
  const incomplete = missingParams(fields, values).length > 0
  const start = () => {
    setConfirming(false)
    onStart({ params, downstream })
  }
  return (
    <>
      <Stack gap={6}>
        <div className="job-rail-title">
          <h3>{job.name}</h3>
          {job.acts && (
            <span className="job-name">
              <AffectsTeamBadge />
              <InfoTip label="Affects team">{AFFECTS_TEAM_HELP}</InfoTip>
            </span>
          )}
        </div>
        <Text size="xs">{jobFacts(job)}</Text>
      </Stack>
      <PauseControl name={job.name} pause={job.pause} target="job" />
      <ParamsForm fields={fields} values={values} onChange={(name, value) => setValues({ ...values, [name]: value })} />
      <DownstreamOption job={job} catalog={catalog} checked={downstream} onChange={setDownstream} />
      {blocked && (
        <p className="job-note job-note-running">
          Already running. This job allows one run at a time.{' '}
          {job.last_run && (
            <>
              <Anchor component={Link} to={`/activity/runs/${job.last_run.id}`} state={JOBS_LINK_STATE}>Open the run</Anchor>
              <CancelRunButton runId={job.last_run.id} job={job.name} label="Cancel run" className="job-note-action" />
            </>
          )}
        </p>
      )}
      {error && <RunRefusal job={job} error={error} />}
      {started && (
        <p role="status" className="job-note job-note-queued">
          Queued. The launcher accepted the run; it hasn't started yet.{' '}
          <Anchor component={Link} to={`/activity/runs/${started.runId}`} state={JOBS_LINK_STATE}>Watch this run</Anchor>
        </p>
      )}
      <Button
        disabled={blocked || starting || incomplete}
        onClick={() => (needsConfirm ? setConfirming(true) : start())}
      >
        {runLabel(blocked, starting, needsConfirm, downstream)}
      </Button>
      <RecentRuns runs={recentRuns} />
      <RunConfirmDialog
        opened={confirming}
        job={job}
        catalog={catalog}
        downstream={downstream}
        params={params}
        starting={starting}
        onConfirm={start}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
