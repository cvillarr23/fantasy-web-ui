import { useState } from 'react'
import { Button, Group, Modal, Radio, Stack, Text, Textarea, TextInput } from '@mantine/core'
import type { PauseRequest } from '../../api/jobs'
import { ErrorAlert } from '../ui/ErrorAlert'
import { PAUSE_PRESETS, pauseUntil, type PausePreset } from './jobsFormat'

// Core's limit on a pause reason.
const REASON_MAX = 500

export type PauseTarget = 'job' | 'chain'

interface Props {
  opened: boolean
  name: string
  target: PauseTarget
  pausing: boolean
  error: Error | null
  now?: () => Date
  onConfirm: (request: PauseRequest) => void
  onClose: () => void
}

function pauseEffect(target: PauseTarget) {
  const skipped = target === 'chain' ? "The chain's scheduled runs" : 'Its scheduled, event and chain runs'
  return `${skipped} are skipped and recorded as Skipped · paused. Starting it from this page still works.`
}

function PauseForm({ target, pausing, error, now = () => new Date(), onConfirm, onClose }: Omit<Props, 'opened' | 'name'>) {
  const [preset, setPreset] = useState<PausePreset>('day')
  const [custom, setCustom] = useState('')
  const [reason, setReason] = useState('')
  const until = pauseUntil(preset, custom, now())
  const ready = until !== undefined && reason.trim() !== ''
  return (
    <Stack>
      <Text size="sm">{pauseEffect(target)}</Text>
      <Radio.Group label="For how long" value={preset} onChange={(value) => setPreset(value as PausePreset)}>
        <Group gap="md" mt={6}>
          {PAUSE_PRESETS.map((option) => <Radio key={option.value} value={option.value} label={option.label} />)}
        </Group>
      </Radio.Group>
      {preset === 'custom' && (
        <TextInput
          type="datetime-local"
          label="Resume at"
          description="Your local time"
          value={custom}
          error={custom && until === undefined ? 'Pick a time in the future' : undefined}
          onChange={(event) => setCustom(event.currentTarget.value)}
        />
      )}
      <Textarea
        label="Reason"
        placeholder="Bye week"
        required
        maxLength={REASON_MAX}
        rows={2}
        value={reason}
        onChange={(event) => setReason(event.currentTarget.value)}
      />
      {error && <ErrorAlert>Not paused: {error.message}</ErrorAlert>}
      <Group justify="flex-end">
        <Button variant="default" disabled={pausing} onClick={onClose}>Cancel</Button>
        <Button
          disabled={!ready}
          loading={pausing}
          onClick={() => onConfirm({ until: until ?? null, reason: reason.trim() })}
        >
          Pause
        </Button>
      </Group>
    </Stack>
  )
}

/** Asks how long to pause a job or chain, and why. The form mounts only while open, so a
 * half-filled pause never carries over to the next one. */
export function PauseDialog({ opened, name, ...props }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={() => { if (!props.pausing) props.onClose() }}
      title={`Pause ${name}?`}
      transitionProps={{ duration: 0 }}
    >
      <PauseForm {...props} />
    </Modal>
  )
}
