import { useState } from 'react'
import { Button } from '@mantine/core'
import type { PauseInfo } from '../../api/jobs'
import { usePauseControls } from '../../hooks/useJobControls'
import { ErrorAlert } from '../ui/ErrorAlert'
import { pauseIsActive, pauseText } from './jobsFormat'
import { PauseDialog, type PauseTarget } from './PauseDialog'

interface Props {
  name: string
  pause: PauseInfo | null | undefined
  target: PauseTarget
  now?: Date
}

/** A job's or chain's pause: what it is and a Resume button while paused, else Pause…. */
export function PauseControl({ name, pause, target, now }: Props) {
  const [opened, setOpened] = useState(false)
  const { pause: pausing, resume } = usePauseControls()
  const close = () => {
    setOpened(false)
    pausing.reset()
  }
  if (pause && pauseIsActive(pause, now)) {
    return (
      <div className="job-note job-note-paused">
        <span>{pauseText(pause, now)}</span>
        <Button variant="default" size="xs" loading={resume.isPending} onClick={() => resume.mutate(name)}>
          {target === 'chain' ? 'Resume chain' : 'Resume'}
        </Button>
        {resume.error && <ErrorAlert>Not resumed: {resume.error.message}</ErrorAlert>}
      </div>
    )
  }
  return (
    <>
      <Button variant="default" size="xs" className="job-pause-button" onClick={() => setOpened(true)}>
        {target === 'chain' ? 'Pause chain…' : 'Pause…'}
      </Button>
      <PauseDialog
        opened={opened}
        name={name}
        target={target}
        pausing={pausing.isPending}
        error={pausing.error}
        onConfirm={(request) => pausing.mutate({ name, request }, { onSuccess: close })}
        onClose={close}
      />
    </>
  )
}
