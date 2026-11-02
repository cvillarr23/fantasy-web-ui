import { useState } from 'react'
import { Alert, Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core'
import type { JobCatalog, JobInfo, RunParams } from '../../api/jobs'
import { jobEffect } from './jobGlossary'
import { actingSteps, chainForJob, confirmNote, downstreamSteps } from './jobsFormat'

interface Props {
  opened: boolean
  job: JobInfo
  catalog: JobCatalog
  downstream: boolean
  params: RunParams
  starting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function runScopeText(job: JobInfo, catalog: JobCatalog, downstream: boolean) {
  const chain = downstream ? chainForJob(job.name, catalog.chains) : undefined
  if (!chain) return { text: 'Runs this job once, starting now.', laterSteps: 0 }
  const laterSteps = downstreamSteps(job.name, chain).length
  return { text: `Runs ${laterSteps + 1} steps of ${chain.name}, starting now.`, laterSteps }
}

function ConfirmBody({ job, catalog, downstream, params, starting, onConfirm, onCancel }: Omit<Props, 'opened'>) {
  const [checked, setChecked] = useState(false)
  const { laterSteps } = runScopeText(job, catalog, downstream)
  const note = confirmNote(job, params, laterSteps)
  return (
    <Stack>
      <Alert color="yellow">
        {job.acts ? 'This run can change your team on ESPN.' : "This job doesn't change your team, but later steps can."}
      </Alert>
      <Stack gap={6}>
        <Text size="xs" fw={700} tt="uppercase">Steps that affect your team</Text>
        {actingSteps(job, downstream, catalog).map((step) => (
          <Group key={step} justify="space-between" className="job-confirm-step">
            <Text size="sm" fw={600} c="var(--text-h)">{step}</Text>
            <Text size="sm">{jobEffect(step)}</Text>
          </Group>
        ))}
      </Stack>
      {note && <Text size="sm">{note}</Text>}
      <Checkbox
        label="I've checked what this run will do."
        checked={checked}
        onChange={(event) => setChecked(event.currentTarget.checked)}
      />
      <Group justify="flex-end">
        <Button variant="default" disabled={starting} onClick={onCancel}>Cancel</Button>
        <Button disabled={!checked || starting} onClick={onConfirm}>Start run</Button>
      </Group>
    </Stack>
  )
}

/** Stands between Run and any job that can change the team. The body mounts only while
 * open, so the checkbox never carries over to the next run. */
export function RunConfirmDialog({ opened, ...props }: Props) {
  const { job, catalog, downstream, starting, onCancel } = props
  return (
    <Modal
      opened={opened}
      onClose={() => { if (!starting) onCancel() }}
      title={`Run ${job.name}?`}
      size="lg"
      transitionProps={{ duration: 0 }}
    >
      <Text size="sm" mb="md">{runScopeText(job, catalog, downstream).text}</Text>
      <ConfirmBody {...props} />
    </Modal>
  )
}
